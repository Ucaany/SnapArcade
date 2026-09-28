import { NextResponse } from "next/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { paymentCredentials, sessions, transactions } from "@/db/schema";
import { authenticateKiosk } from "@/lib/kiosk-auth";
import { midtransConfig, midtransRequest } from "@/lib/midtrans";
import { xenditConfig, xenditRequest } from "@/lib/xendit";
import { decryptCredential } from "@/lib/payment-crypto";
import { tripayConfig, tripayCreateSignature, tripayRequest, type TripayTransaction } from "@/lib/tripay";

const input = z.object({ session_id: z.string().uuid(), amount: z.number().int().positive() }).strict();
type TransactionRow = typeof transactions.$inferSelect;
type CredentialRow = typeof paymentCredentials.$inferSelect;
type CreateOutcome = { error: string; status: number } | { transaction: TransactionRow; credential: CredentialRow | undefined };

export async function POST(request: Request) {
  const auth = await authenticateKiosk(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
  const outcome = await db.transaction(async (tx): Promise<CreateOutcome> => {
    const [session] = await tx.select().from(sessions).where(and(eq(sessions.id, parsed.data.session_id), eq(sessions.kioskId, auth.kioskId), eq(sessions.ownerId, auth.ownerId))).for("update");
    if (!session || session.status !== "pending" || session.amountPaid !== parsed.data.amount) return { error: "Sesi tidak valid", status: 409 };
    const [pending] = await tx.select().from(transactions).where(and(eq(transactions.sessionId, session.id), eq(transactions.status, "pending"))).orderBy(desc(transactions.createdAt)).limit(1);
    if (pending && (!pending.expiresAt || pending.expiresAt > new Date())) return { transaction: pending, credential: undefined };
    if (pending) await tx.update(transactions).set({ status: "expired" }).where(eq(transactions.id, pending.id));
    const [credential] = await tx.select().from(paymentCredentials).where(and(eq(paymentCredentials.ownerId, auth.ownerId), inArray(paymentCredentials.provider, ["midtrans", "xendit", "tripay"]), eq(paymentCredentials.isActive, true))).limit(1);
    if (!credential) return { error: "Credential payment gateway belum tersedia", status: 422 };
    const [transaction] = await tx.insert(transactions).values({ sessionId: session.id, kioskId: auth.kioskId, ownerId: auth.ownerId, credentialId: credential.id, provider: credential.provider, method: "qris", amount: parsed.data.amount, netAmount: parsed.data.amount }).returning();
    return { transaction, credential };
  });
  if ("error" in outcome) return NextResponse.json({ error: outcome.error }, { status: outcome.status });
  if (!outcome.credential) {
    const pending = outcome.transaction;
    return NextResponse.json({ transaction_id: pending.id, gateway_transaction_id: pending.gatewayTransactionId, order_id: pending.provider === "midtrans" ? pending.gatewayReference : undefined, merchant_ref: pending.provider === "tripay" ? pending.gatewayReference : undefined, qr_string: pending.qrString, invoice_url: pending.provider === "xendit" ? pending.paymentUrl : undefined, payment_url: pending.paymentUrl, status: pending.status });
  }
  const { transaction, credential } = outcome;
  try {
    if (credential.provider === "tripay") {
      const config = tripayConfig(decryptCredential(credential.encryptedConfig));
      const merchantRef = `SA-${transaction.id}`;
      const callbackUrl = process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook/tripay` : undefined;
      const response = await tripayRequest<TripayTransaction>(config, credential.isSandbox, "/transaction/create", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ method: "QRIS", merchant_ref: merchantRef, amount: String(parsed.data.amount), customer_name: "Customer Kiosk", customer_email: "noreply@snaparcade.local", order_items: JSON.stringify([{ sku: transaction.id, name: "SnapArcade kiosk session", price: parsed.data.amount, quantity: 1 }]), signature: tripayCreateSignature(config, merchantRef, parsed.data.amount), ...(callbackUrl ? { callback_url: callbackUrl } : {}), expired_time: String(Math.floor(Date.now() / 1000) + 15 * 60) }).toString() });
      if (typeof response.reference !== "string" || typeof response.qr_string !== "string") throw new Error("Tripay tidak mengembalikan QRIS");
      await db.update(transactions).set({ gatewayTransactionId: response.reference, gatewayReference: merchantRef, qrString: response.qr_string, paymentUrl: response.qr_url ?? response.checkout_url ?? null, fee: Number(response.fee_merchant) || 0, netAmount: Number(response.amount_received) || parsed.data.amount, expiresAt: response.expired_time ? new Date(response.expired_time * 1000) : new Date(Date.now() + 15 * 60 * 1000), webhookPayload: response }).where(eq(transactions.id, transaction.id));
      return NextResponse.json({ transaction_id: transaction.id, gateway_transaction_id: response.reference, merchant_ref: merchantRef, qr_string: response.qr_string, qr_url: response.qr_url ?? null, checkout_url: response.checkout_url ?? null, status: "pending" });
    }
    if (credential.provider === "xendit") {
      const response = await xenditRequest<import("@/lib/xendit").XenditInvoice>(xenditConfig(decryptCredential(credential.encryptedConfig)), "/v2/invoices", { method: "POST", body: JSON.stringify({ external_id: transaction.id, amount: parsed.data.amount, payer_email: undefined, description: `SnapArcade kiosk ${transaction.id}`, currency: "IDR", invoice_duration: 900 }) });
      if (typeof response.id !== "string" || typeof response.invoice_url !== "string") throw new Error("Xendit tidak mengembalikan invoice");
      await db.update(transactions).set({ gatewayTransactionId: response.id, gatewayReference: transaction.id, paymentUrl: response.invoice_url, qrString: typeof response.qr_string === "string" ? response.qr_string : null, expiresAt: new Date(Date.now() + 15 * 60 * 1000), webhookPayload: response }).where(eq(transactions.id, transaction.id));
      return NextResponse.json({ transaction_id: transaction.id, gateway_transaction_id: response.id, invoice_url: response.invoice_url, qr_string: response.qr_string ?? null, status: "pending" });
    }
    const orderId = `SA-${transaction.id}`;
    const response = await midtransRequest<Record<string, unknown>>(midtransConfig(decryptCredential(credential.encryptedConfig)), credential.isSandbox, "/v2/charge", { method: "POST", body: JSON.stringify({ payment_type: "qris", transaction_details: { order_id: orderId, gross_amount: parsed.data.amount } }) });
    const qrString = typeof response.qr_string === "string" ? response.qr_string : null;
    if (!qrString || typeof response.transaction_id !== "string") throw new Error("Midtrans tidak mengembalikan QRIS");
    await db.update(transactions).set({ gatewayTransactionId: response.transaction_id, gatewayReference: orderId, qrString, signatureKey: typeof response.signature_key === "string" ? response.signature_key : null, expiresAt: new Date(Date.now() + 15 * 60 * 1000), webhookPayload: response }).where(eq(transactions.id, transaction.id));
    return NextResponse.json({ transaction_id: transaction.id, order_id: orderId, gateway_transaction_id: response.transaction_id, qr_string: qrString, status: "pending" });
  } catch (error) {
    await db.update(transactions).set({ status: "failed", webhookPayload: { error: error instanceof Error ? error.message : "Payment request failed" } }).where(eq(transactions.id, transaction.id));
    return NextResponse.json({ error: "Pembayaran gagal dibuat" }, { status: 502 });
  }
}
