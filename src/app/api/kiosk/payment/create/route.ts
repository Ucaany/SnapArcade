import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { paymentCredentials, sessions, transactions } from "@/db/schema";
import { authenticateKiosk } from "@/lib/kiosk-auth";
import { midtransConfig, midtransRequest } from "@/lib/midtrans";
import { decryptCredential } from "@/lib/payment-crypto";

const input = z.object({ session_id: z.string().uuid(), amount: z.number().int().positive() }).strict();
export async function POST(request: Request) {
  const auth = await authenticateKiosk(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
  const [session] = await db.select().from(sessions).where(and(eq(sessions.id, parsed.data.session_id), eq(sessions.kioskId, auth.kioskId), eq(sessions.ownerId, auth.ownerId))).limit(1);
  if (!session || session.status !== "pending" || session.amountPaid !== parsed.data.amount) return NextResponse.json({ error: "Sesi tidak valid" }, { status: 409 });
  const [credential] = await db.select().from(paymentCredentials).where(and(eq(paymentCredentials.ownerId, auth.ownerId), eq(paymentCredentials.provider, "midtrans"), eq(paymentCredentials.isActive, true))).limit(1);
  if (!credential) return NextResponse.json({ error: "Credential Midtrans belum tersedia" }, { status: 422 });
  const orderId = `SA-${session.id}-${randomUUID().slice(0, 8)}`;
  const [transaction] = await db.insert(transactions).values({ sessionId: session.id, kioskId: auth.kioskId, ownerId: auth.ownerId, credentialId: credential.id, provider: "midtrans", method: "qris", gatewayReference: orderId, amount: parsed.data.amount, netAmount: parsed.data.amount }).returning({ id: transactions.id });
  try {
    const config = midtransConfig(decryptCredential(credential.encryptedConfig));
    const response = await midtransRequest<Record<string, unknown>>(config, credential.isSandbox, "/v2/charge", { method: "POST", body: JSON.stringify({ payment_type: "qris", transaction_details: { order_id: orderId, gross_amount: parsed.data.amount } }) });
    const qrString = typeof response.qr_string === "string" ? response.qr_string : null;
    if (!qrString || typeof response.transaction_id !== "string") throw new Error("Midtrans tidak mengembalikan QRIS");
    await db.update(transactions).set({ gatewayTransactionId: response.transaction_id, qrString, signatureKey: typeof response.signature_key === "string" ? response.signature_key : null, expiresAt: new Date(Date.now() + 15 * 60 * 1000), webhookPayload: response }).where(eq(transactions.id, transaction.id));
    return NextResponse.json({ transaction_id: transaction.id, order_id: orderId, gateway_transaction_id: response.transaction_id, qr_string: qrString, status: "pending" });
  } catch (error) {
    await db.update(transactions).set({ status: "failed", webhookPayload: { error: error instanceof Error ? error.message : "Midtrans request failed" } }).where(eq(transactions.id, transaction.id));
    return NextResponse.json({ error: "Pembayaran gagal dibuat" }, { status: 502 });
  }
}
