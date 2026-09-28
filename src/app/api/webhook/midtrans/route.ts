import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { paymentCredentials, transactions } from "@/db/schema";
import { applyMidtransStatus, midtransConfig, midtransSignature, signaturesMatch } from "@/lib/midtrans";
import { decryptCredential } from "@/lib/payment-crypto";

export async function POST(request: Request) {
  const event = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!event || typeof event.order_id !== "string" || typeof event.status_code !== "string" || event.gross_amount === undefined || typeof event.signature_key !== "string") return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  const [row] = await db.select({ transaction: transactions, credential: paymentCredentials }).from(transactions).innerJoin(paymentCredentials, eq(transactions.credentialId, paymentCredentials.id)).where(and(eq(transactions.gatewayReference, event.order_id), eq(transactions.provider, "midtrans"))).limit(1);
  if (!row) return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  let config; try { config = midtransConfig(decryptCredential(row.credential.encryptedConfig)); } catch { return NextResponse.json({ error: "Invalid credential" }, { status: 500 }); }
  if (!signaturesMatch(midtransSignature(event, config.serverKey), event.signature_key)) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  await applyMidtransStatus(row.transaction.id, event);
  return NextResponse.json({ ok: true });
}
