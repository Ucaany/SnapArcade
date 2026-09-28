import "server-only";
import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { paymentCredentials, sessions, transactions } from "@/db/schema";
import { decryptCredential } from "@/lib/payment-crypto";
import { adminClient } from "@/lib/supabase/admin";

type MidtransConfig = { serverKey: string };
export type MidtransPayment = { order_id?: string; transaction_id?: string; transaction_status?: string; fraud_status?: string; status_code?: string; gross_amount?: string | number; signature_key?: string; qr_string?: string; [key: string]: unknown };

export function midtransConfig(value: unknown): MidtransConfig {
  if (!value || typeof value !== "object") throw new Error("Invalid Midtrans credential");
  const record = value as Record<string, unknown>;
  const serverKey = [record.serverKey, record.server_key, record.apiKey, record.secret_apiKey].find((item): item is string => typeof item === "string" && item.length > 0);
  if (!serverKey) throw new Error("Midtrans server key is missing");
  return { serverKey };
}

export function midtransBaseUrl(sandbox: boolean) { return sandbox ? "https://api.sandbox.midtrans.com" : "https://api.midtrans.com"; }

export async function midtransRequest<T>(config: MidtransConfig, sandbox: boolean, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${midtransBaseUrl(sandbox)}${path}`, {
    ...init,
    headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Basic ${Buffer.from(`${config.serverKey}:`).toString("base64")}`, ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  const body = await response.json().catch(() => null) as T & { status_message?: string } | null;
  if (!response.ok) throw new Error(body?.status_message ?? `Midtrans request failed (${response.status})`);
  return body as T;
}

export function midtransSignature(event: Pick<MidtransPayment, "order_id" | "status_code" | "gross_amount">, serverKey: string) {
  return createHash("sha512").update(`${event.order_id}${event.status_code}${event.gross_amount}${serverKey}`).digest("hex");
}

export { signaturesMatch } from "@/lib/signature";

export function midtransStatus(event: MidtransPayment): "pending" | "settlement" | "expired" | "failed" {
  if (event.transaction_status === "settlement" && (event.fraud_status === undefined || event.fraud_status === "accept")) return "settlement";
  if (["expire", "expired"].includes(event.transaction_status ?? "")) return "expired";
  if (["deny", "cancel", "failure"].includes(event.transaction_status ?? "")) return "failed";
  return "pending";
}

export async function broadcastPayment(transactionId: string, status: string, sessionId: string) {
  await adminClient.channel(`kiosk-payment:${transactionId}`).send({ type: "broadcast", event: "payment.updated", payload: { transaction_id: transactionId, session_id: sessionId, status } });
}

export async function credentialForTransaction(transactionId: string) {
  const [row] = await db.select({ transaction: transactions, credential: paymentCredentials }).from(transactions).innerJoin(paymentCredentials, eq(transactions.credentialId, paymentCredentials.id)).where(eq(transactions.id, transactionId)).limit(1);
  if (!row || row.credential.provider !== "midtrans") return null;
  return { ...row, config: midtransConfig(decryptCredential(row.credential.encryptedConfig)) };
}

export async function applyMidtransStatus(transactionId: string, event: MidtransPayment) {
  const nextStatus = midtransStatus(event);
  const [current] = await db.select({ status: transactions.status, sessionId: transactions.sessionId }).from(transactions).where(eq(transactions.id, transactionId)).limit(1);
  if (!current) return false;
  if (current.status === "settlement" && nextStatus !== "settlement") return true;
  const settledAt = nextStatus === "settlement" ? new Date() : undefined;
  await db.transaction(async (tx) => {
    await tx.update(transactions).set({ status: nextStatus, gatewayTransactionId: event.transaction_id ?? undefined, signatureKey: event.signature_key ?? undefined, webhookPayload: event, ...(settledAt ? { settledAt } : {}) }).where(eq(transactions.id, transactionId));
    if (nextStatus === "settlement") await tx.update(sessions).set({ status: "paid", amountPaid: Number(event.gross_amount) || undefined }).where(and(eq(sessions.id, current.sessionId), eq(sessions.status, "pending")));
  });
  await broadcastPayment(transactionId, nextStatus, current.sessionId);
  return true;
}
