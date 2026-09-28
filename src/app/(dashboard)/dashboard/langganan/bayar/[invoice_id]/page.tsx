import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { invoices } from "@/db/schema";
import { getActor } from "@/lib/server-actions";
import { PaymentWatcher } from "@/components/payment-watcher";

export default async function PayPage({ params }: { params: Promise<{ invoice_id: string }> }) {
  const actor = await getActor();
  if (!actor?.ownerId) redirect("/");
  const { invoice_id: id } = await params;
  const [invoice] = await db.select({ id: invoices.id, status: invoices.status, paymentUrl: invoices.pakasirPaymentUrl, amount: invoices.amount }).from(invoices).where(and(eq(invoices.id, id), eq(invoices.ownerId, actor.ownerId))).limit(1);
  if (!invoice) redirect("/dashboard/langganan");
  return <PaymentWatcher invoiceId={invoice.id} initialStatus={invoice.status} paymentUrl={invoice.paymentUrl} amount={invoice.amount} />;
}
