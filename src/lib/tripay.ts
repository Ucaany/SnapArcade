import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { paymentCredentials, sessions, transactions } from "@/db/schema";
import { decryptCredential } from "@/lib/payment-crypto";
import { adminClient } from "@/lib/supabase/admin";
export { signaturesMatch, tripayCallbackSignature, tripayCreateSignature, tripayStatus } from "@/lib/tripay-crypto";
import { tripayStatus } from "@/lib/tripay-crypto";

export type TripayTransaction = {
  reference?: string;
  merchant_ref?: string;
  payment_method?: string;
  amount?: number;
  fee_merchant?: number;
  amount_received?: number;
  pay_code?: string | number;
  pay_url?: string | null;
  checkout_url?: string | null;
  qr_string?: string | null;
  qr_url?: string | null;
  status?: string;
  expired_time?: number;
  paid_at?: string | number | null;
  [key: string]: unknown;
};

type TripayConfig = { apiKey: string; privateKey: string; merchantCode: string };

export function tripayConfig(value: unknown): TripayConfig {
  if (!value || typeof value !== "object") throw new Error("Invalid Tripay credential");
  const record = value as Record<string, unknown>;
  const get = (keys: string[]) => keys.map((key) => record[key]).find((item): item is string => typeof item === "string" && item.length > 0);
  const apiKey = get(["apiKey", "api_key", "secret_apiKey"]);
  const privateKey = get(["privateKey", "private_key"]);
  const merchantCode = get(["merchantCode", "merchant_code"]);
  if (!apiKey || !privateKey || !merchantCode) throw new Error("Tripay API key, private key, and merchant code are required");
  return { apiKey, privateKey, merchantCode };
}

export function tripayBaseUrl(sandbox: boolean) { return sandbox ? "https://tripay.co.id/api-sandbox" : "https://tripay.co.id/api"; }

export async function tripayRequest<T>(config: TripayConfig, sandbox: boolean, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${tripayBaseUrl(sandbox)}${path}`, { ...init, headers: { Accept: "application/json", Authorization: `Bearer ${config.apiKey}`, ...(init?.headers ?? {}) }, cache: "no-store" });
  const body = await response.json().catch(() => null) as { success?: boolean; message?: string; data?: T } | null;
  if (!response.ok || !body?.success || body.data === undefined) throw new Error(body?.message ?? `Tripay request failed (${response.status})`);
  return body.data;
}

export async function tripayCredentialForTransaction(transactionId: string) {
  const [row] = await db.select({ transaction: transactions, credential: paymentCredentials }).from(transactions).innerJoin(paymentCredentials, eq(transactions.credentialId, paymentCredentials.id)).where(and(eq(transactions.id, transactionId), eq(transactions.provider, "tripay"))).limit(1);
  if (!row || row.credential.provider !== "tripay") return null;
  return { ...row, config: tripayConfig(decryptCredential(row.credential.encryptedConfig)) };
}

export async function applyTripayStatus(transactionId: string, event: TripayTransaction) {
  const nextStatus = tripayStatus(event.status);
  const [current] = await db.select({ status: transactions.status, sessionId: transactions.sessionId }).from(transactions).where(eq(transactions.id, transactionId)).limit(1);
  if (!current) return false;
  if (current.status === "settlement" && nextStatus !== "settlement") return true;
  const settledAt = nextStatus === "settlement" ? new Date() : undefined;
  await db.transaction(async (tx) => {
    await tx.update(transactions).set({ status: nextStatus, gatewayTransactionId: event.reference ?? undefined, fee: Number(event.fee_merchant) || 0, netAmount: Number(event.amount_received) || undefined, webhookPayload: event, ...(settledAt ? { settledAt } : {}) }).where(eq(transactions.id, transactionId));
    if (nextStatus === "settlement") await tx.update(sessions).set({ status: "paid", amountPaid: Number(event.amount) || undefined }).where(and(eq(sessions.id, current.sessionId), eq(sessions.status, "pending")));
  });
  await adminClient.channel(`kiosk-payment:${transactionId}`).send({ type: "broadcast", event: "payment.updated", payload: { transaction_id: transactionId, session_id: current.sessionId, status: nextStatus } });
  return true;
}
