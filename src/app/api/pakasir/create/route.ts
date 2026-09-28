import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { invoices, subscriptionPlans, subscriptions } from "@/db/schema";
import { getActor } from "@/lib/server-actions";
import { createPakasirTransaction } from "@/lib/pakasir";

const input = z.object({ subscriptionId: z.string().uuid(), method: z.string().min(2).max(30).default("qris") });

export async function POST(request: Request) {
  const actor = await getActor();
  if (!actor || actor.role !== "owner" || !actor.ownerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
  const [subscription] = await db.select({ id: subscriptions.id, planId: subscriptions.planId }).from(subscriptions)
    .where(and(eq(subscriptions.id, parsed.data.subscriptionId), eq(subscriptions.ownerId, actor.ownerId))).limit(1);
  if (!subscription) return NextResponse.json({ error: "Langganan tidak ditemukan" }, { status: 404 });
  const [plan] = await db.select({ amount: subscriptionPlans.monthlyPriceIdr }).from(subscriptionPlans).where(eq(subscriptionPlans.id, subscription.planId)).limit(1);
  if (!plan || plan.amount < 500) return NextResponse.json({ error: "Paket tidak valid" }, { status: 400 });
  const invoiceNumber = `SA-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;
  const [invoice] = await db.insert(invoices).values({ invoiceNumber, ownerId: actor.ownerId, subscriptionId: subscription.id, amount: plan.amount, pakasirOrderId: invoiceNumber, pakasirPaymentMethod: parsed.data.method }).returning({ id: invoices.id });
  try {
    const payload = await createPakasirTransaction(invoiceNumber, plan.amount, parsed.data.method);
    const payment = payload.payment ?? payload.transaction ?? payload;
    const paymentUrl = payment.payment_url ?? payment.paymentUrl ?? null;
    if (!paymentUrl) throw new Error("Pakasir tidak mengembalikan payment URL");
    await db.update(invoices).set({ pakasirPaymentUrl: paymentUrl, pakasirRawPayload: payload }).where(eq(invoices.id, invoice.id));
    return NextResponse.json({ invoiceId: invoice.id, paymentUrl });
  } catch (error) {
    await db.update(invoices).set({ status: "failed" }).where(eq(invoices.id, invoice.id));
    return NextResponse.json({ error: error instanceof Error ? error.message : "Pembayaran gagal dibuat" }, { status: 502 });
  }
}
