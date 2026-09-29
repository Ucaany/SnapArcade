import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { invoices, subscriptions } from "@/db/schema";
import { verifyPakasirSignature } from "@/lib/pakasir";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-pakasir-signature") ?? request.headers.get("x-signature");
  if (!verifyPakasirSignature(rawBody, signature)) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  let event: { order_id?: string; amount?: number; status?: string; payment_method?: string };
  try { event = JSON.parse(rawBody); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (!event.order_id || !Number.isSafeInteger(Number(event.amount)) || event.status !== "completed") return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  const result = await db.transaction(async (tx) => {
    const [invoice] = await tx.select().from(invoices).where(and(eq(invoices.pakasirOrderId, event.order_id!), eq(invoices.amount, Number(event.amount)))).limit(1);
    if (!invoice) return "not_found";
    if (invoice.status === "settlement") return "already_settled";
    await tx.update(invoices).set({ status: "settlement", paidAt: new Date(), pakasirPaymentMethod: event.payment_method ?? invoice.pakasirPaymentMethod, pakasirRawPayload: event }).where(eq(invoices.id, invoice.id));
    if (invoice.subscriptionId) await tx.update(subscriptions).set({ status: "active", startedAt: sql`coalesce(${subscriptions.startedAt}, now())`, expiresAt: sql`greatest(coalesce(${subscriptions.expiresAt}, now()), now()) + interval '30 days'` }).where(eq(subscriptions.id, invoice.subscriptionId));
    return "settled";
  });
  return result === "not_found" ? NextResponse.json({ error: "Invoice tidak ditemukan" }, { status: 404 }) : NextResponse.json({ ok: true });
}
