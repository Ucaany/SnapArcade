import "server-only";
import { timingSafeEqual } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { paymentCredentials, sessions, transactions } from "@/db/schema";
import { decryptCredential } from "@/lib/payment-crypto";
import { adminClient } from "@/lib/supabase/admin";

export type XenditInvoice = {
  id?: string;
  external_id?: string;
  invoice_url?: string;
  qr_string?: string;
  status?: string;
  paid_amount?: number;
  amount?: number;
  currency?: string;
  [key: string]: unknown;
};

type XenditConfig = { secretKey: string; callbackToken?: string };

export function xenditConfig(value: unknown): XenditConfig {
  if (!value || typeof value !== "object") throw new Error("Invalid Xendit credential");
  const record = value as Record<string, unknown>;
  const secretKey = [record.secretKey, record.secret_key, record.apiKey, record.secret_apiKey]
    .find((item): item is string => typeof item === "string" && item.length > 0);
  if (!secretKey) throw new Error("Xendit secret key is missing");
  const callbackToken = [record.callbackToken, record.callback_token, record.webhookToken, record.webhook_token]
    .find((item): item is string => typeof item === "string" && item.length > 0);
  return callbackToken ? { secretKey, callbackToken } : { secretKey };
}

export async function xenditRequest<T>(config: XenditConfig, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`https://api.xendit.co${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${config.secretKey}:`).toString("base64")}`,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  const body = await response.json().catch(() => null) as T & { message?: string } | null;
  if (!response.ok) throw new Error(body?.message ?? `Xendit request failed (${response.status})`);
  return body as T;
}

export function xenditTokensMatch(expected: string | undefined, actual: string | null): boolean {
  if (!expected || !actual) return false;
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(actual, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function xenditStatus(event: XenditInvoice): "pending" | "settlement" | "expired" | "failed" {
  if (event.status === "PAID") return "settlement";
  if (["EXPIRED", "INACTIVE"].includes(event.status ?? "")) return "expired";
  if (["FAILED"].includes(event.status ?? "")) return "failed";
  return "pending";
}

export async function xenditCredentialForTransaction(transactionId: string) {
  const [row] = await db.select({ transaction: transactions, credential: paymentCredentials })
    .from(transactions)
    .innerJoin(paymentCredentials, eq(transactions.credentialId, paymentCredentials.id))
    .where(eq(transactions.id, transactionId)).limit(1);
  if (!row || row.credential.provider !== "xendit") return null;
  return { ...row, config: xenditConfig(decryptCredential(row.credential.encryptedConfig)) };
}

export async function applyXenditStatus(transactionId: string, event: XenditInvoice) {
  const nextStatus = xenditStatus(event);
  const [current] = await db.select({ status: transactions.status, sessionId: transactions.sessionId })
    .from(transactions).where(eq(transactions.id, transactionId)).limit(1);
  if (!current) return false;
  if (current.status === "settlement" && nextStatus !== "settlement") return true;
  const settledAt = nextStatus === "settlement" ? new Date() : undefined;
  await db.transaction(async (tx) => {
    await tx.update(transactions).set({
      status: nextStatus,
      gatewayTransactionId: typeof event.id === "string" ? event.id : undefined,
      webhookPayload: event,
      ...(settledAt ? { settledAt } : {}),
    }).where(eq(transactions.id, transactionId));
    if (nextStatus === "settlement") {
      await tx.update(sessions).set({ status: "paid", amountPaid: Number(event.paid_amount ?? event.amount) || undefined })
        .where(and(eq(sessions.id, current.sessionId), eq(sessions.status, "pending")));
    }
  });
  await adminClient.channel(`kiosk-payment:${transactionId}`).send({ type: "broadcast", event: "payment.updated", payload: { transaction_id: transactionId, session_id: current.sessionId, status: nextStatus } });
  return true;
}
