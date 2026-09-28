import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { paymentCredentials, transactions } from "@/db/schema";
import { applyXenditStatus, xenditConfig, xenditTokensMatch, type XenditInvoice } from "@/lib/xendit";
import { decryptCredential } from "@/lib/payment-crypto";

export async function POST(request: Request) {
  const event = await request.json().catch(() => null) as XenditInvoice | null;
  if (!event || typeof event.external_id !== "string" || typeof event.status !== "string" || event.currency !== "IDR") return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  const [row] = await db.select({ transaction: transactions, credential: paymentCredentials }).from(transactions).innerJoin(paymentCredentials, eq(transactions.credentialId, paymentCredentials.id)).where(and(eq(transactions.id, event.external_id), eq(transactions.provider, "xendit"))).limit(1);
  if (!row) return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  let ownerToken: string | undefined;
  try { ownerToken = xenditConfig(decryptCredential(row.credential.encryptedConfig)).callbackToken; } catch { ownerToken = undefined; }
  if (!xenditTokensMatch(ownerToken ?? process.env.XENDIT_WEBHOOK_TOKEN, request.headers.get("x-callback-token"))) return NextResponse.json({ error: "Invalid callback token" }, { status: 401 });
  if (typeof event.amount !== "number" || event.amount !== row.transaction.amount) return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
  if (event.paid_amount !== undefined && Number(event.paid_amount) !== row.transaction.amount) return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
  await applyXenditStatus(row.transaction.id, event);
  return NextResponse.json({ ok: true });
}
