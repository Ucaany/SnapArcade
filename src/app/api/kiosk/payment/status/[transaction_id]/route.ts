import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { authenticateKiosk } from "@/lib/kiosk-auth";
import { applyMidtransStatus, midtransRequest, credentialForTransaction } from "@/lib/midtrans";

export async function GET(request: Request, { params }: { params: Promise<{ transaction_id: string }> }) {
  const auth = await authenticateKiosk(request); if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { transaction_id: id } = await params;
  const [transaction] = await db.select().from(transactions).where(and(eq(transactions.id, id), eq(transactions.kioskId, auth.kioskId), eq(transactions.ownerId, auth.ownerId))).limit(1);
  if (!transaction) return NextResponse.json({ error: "Transaction tidak ditemukan" }, { status: 404 });
  if (transaction.status !== "pending") return NextResponse.json({ transaction_id: id, status: transaction.status });
  const row = await credentialForTransaction(id); if (!row || !transaction.gatewayReference) return NextResponse.json({ error: "Credential tidak ditemukan" }, { status: 422 });
  try {
    const event = await midtransRequest<Record<string, unknown>>(row.config, row.credential.isSandbox, `/v2/${encodeURIComponent(transaction.gatewayReference)}/status`);
    await applyMidtransStatus(id, event);
    return NextResponse.json({ transaction_id: id, status: event.transaction_status ?? "pending" });
  } catch { return NextResponse.json({ error: "Status Midtrans tidak tersedia" }, { status: 502 }); }
}
