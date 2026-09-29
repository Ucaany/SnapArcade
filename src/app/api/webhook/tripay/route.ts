import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { paymentCredentials, transactions } from "@/db/schema";
import { applyTripayStatus, signaturesMatch, tripayCallbackSignature, tripayConfig, type TripayTransaction } from "@/lib/tripay";
import { decryptCredential } from "@/lib/payment-crypto";
import { providerIpAllowed } from "@/lib/security";

export async function POST(request: Request) {
  if (!providerIpAllowed(request, "TRIPAY_WEBHOOK_IPS")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const rawBody = await request.text();
  let event: TripayTransaction;
  try { event = JSON.parse(rawBody) as TripayTransaction; } catch { return NextResponse.json({ success: false, message: "Invalid JSON" }, { status: 400 }); }
  if (!event || typeof event.merchant_ref !== "string" || typeof event.reference !== "string" || typeof event.amount !== "number" || typeof event.status !== "string") return NextResponse.json({ success: false, message: "Invalid event" }, { status: 400 });
  const [row] = await db.select({ transaction: transactions, credential: paymentCredentials }).from(transactions).innerJoin(paymentCredentials, eq(transactions.credentialId, paymentCredentials.id)).where(and(eq(transactions.gatewayReference, event.merchant_ref), eq(transactions.provider, "tripay"))).limit(1);
  if (!row) return NextResponse.json({ success: false, message: "Transaction not found" }, { status: 404 });
  let config; try { config = tripayConfig(decryptCredential(row.credential.encryptedConfig)); } catch { return NextResponse.json({ success: false, message: "Invalid credential" }, { status: 500 }); }
  if (!signaturesMatch(tripayCallbackSignature(rawBody, config.privateKey), request.headers.get("x-callback-signature"))) return NextResponse.json({ success: false, message: "Invalid signature" }, { status: 401 });
  if (event.amount !== row.transaction.amount || event.reference !== row.transaction.gatewayTransactionId) return NextResponse.json({ success: false, message: "Transaction mismatch" }, { status: 400 });
  await applyTripayStatus(row.transaction.id, event);
  return NextResponse.json({ success: true });
}
