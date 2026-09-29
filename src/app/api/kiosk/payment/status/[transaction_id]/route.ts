import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { authenticateKiosk } from "@/lib/kiosk-auth";
import { applyMidtransStatus, midtransRequest, credentialForTransaction, midtransStatus } from "@/lib/midtrans";
import { applyXenditStatus, xenditCredentialForTransaction, xenditRequest, xenditStatus } from "@/lib/xendit";
import { applyTripayStatus, tripayCredentialForTransaction, tripayRequest, tripayStatus, type TripayTransaction } from "@/lib/tripay";

export async function GET(request: Request, { params }: { params: Promise<{ transaction_id: string }> }) {
  const auth = await authenticateKiosk(request); if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { transaction_id: id } = await params;
  const [transaction] = await db.select().from(transactions).where(and(eq(transactions.id, id), eq(transactions.kioskId, auth.kioskId), eq(transactions.ownerId, auth.ownerId))).limit(1);
  if (!transaction) return NextResponse.json({ error: "Transaction tidak ditemukan" }, { status: 404 });
  if (transaction.status !== "pending") return NextResponse.json({ transaction_id: id, status: transaction.status });
  if (transaction.provider === "xendit") {
    const row = await xenditCredentialForTransaction(id); if (!row || !transaction.gatewayTransactionId) return NextResponse.json({ error: "Credential tidak ditemukan" }, { status: 422 });
    try { const event = await xenditRequest<import("@/lib/xendit").XenditInvoice>(row.config, `/v2/invoices/${encodeURIComponent(transaction.gatewayTransactionId)}`); if (event.currency !== "IDR" || !Number.isSafeInteger(Number(event.amount)) || Number(event.amount) !== transaction.amount) return NextResponse.json({ error: "Data invoice Xendit tidak cocok" }, { status: 502 }); await applyXenditStatus(id, event); return NextResponse.json({ transaction_id: id, status: xenditStatus(event) }); } catch { return NextResponse.json({ error: "Status Xendit tidak tersedia" }, { status: 502 }); }
  }
  if (transaction.provider === "tripay") {
    const row = await tripayCredentialForTransaction(id); if (!row || !transaction.gatewayTransactionId) return NextResponse.json({ error: "Credential tidak ditemukan" }, { status: 422 });
    try { const event = await tripayRequest<TripayTransaction>(row.config, row.credential.isSandbox, `/transaction/detail?reference=${encodeURIComponent(transaction.gatewayTransactionId)}`); if (!Number.isSafeInteger(Number(event.amount)) || Number(event.amount) !== transaction.amount) return NextResponse.json({ error: "Data transaksi Tripay tidak cocok" }, { status: 502 }); await applyTripayStatus(id, event); return NextResponse.json({ transaction_id: id, status: tripayStatus(event.status) }); } catch { return NextResponse.json({ error: "Status Tripay tidak tersedia" }, { status: 502 }); }
  }
  const row = await credentialForTransaction(id); if (!row || !transaction.gatewayReference) return NextResponse.json({ error: "Credential tidak ditemukan" }, { status: 422 });
  try {
    const event = await midtransRequest<Record<string, unknown>>(row.config, row.credential.isSandbox, `/v2/${encodeURIComponent(transaction.gatewayReference)}/status`);
    if (!Number.isSafeInteger(Number(event.gross_amount)) || Number(event.gross_amount) !== transaction.amount) return NextResponse.json({ error: "Data transaksi Midtrans tidak cocok" }, { status: 502 });
    await applyMidtransStatus(id, event);
    return NextResponse.json({ transaction_id: id, status: midtransStatus({ transaction_status: typeof event.transaction_status === "string" ? event.transaction_status : undefined, fraud_status: typeof event.fraud_status === "string" ? event.fraud_status : undefined }) });
  } catch { return NextResponse.json({ error: "Status Midtrans tidak tersedia" }, { status: 502 }); }
}
