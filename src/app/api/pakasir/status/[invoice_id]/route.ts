import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { invoices } from "@/db/schema";
import { getActor } from "@/lib/server-actions";

export async function GET(_: Request, { params }: { params: Promise<{ invoice_id: string }> }) {
  const actor = await getActor();
  if (!actor?.ownerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { invoice_id: id } = await params;
  const [invoice] = await db.select({ status: invoices.status, paymentUrl: invoices.pakasirPaymentUrl }).from(invoices).where(and(eq(invoices.id, id), eq(invoices.ownerId, actor.ownerId))).limit(1);
  return invoice ? NextResponse.json(invoice) : NextResponse.json({ error: "Invoice tidak ditemukan" }, { status: 404 });
}
