"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function PaymentWatcher({ invoiceId, initialStatus, paymentUrl, amount }: { invoiceId: string; initialStatus: string; paymentUrl: string | null; amount: number }) {
  const [status, setStatus] = useState(initialStatus);
  useEffect(() => { if (status === "settlement") return; const poll = async () => { const response = await fetch(`/api/pakasir/status/${invoiceId}`, { cache: "no-store" }); if (response.ok) setStatus((await response.json()).status); }; void poll(); const timer = window.setInterval(() => void poll(), 5000); return () => window.clearInterval(timer); }, [invoiceId, status]);
  return <main className="mx-auto flex min-h-[70vh] max-w-lg items-center px-4 py-10"><section className="w-full space-y-5 rounded-xl border bg-card p-6 shadow-sm"><p className="text-sm text-muted-foreground">Invoice langganan</p><h1 className="text-2xl font-semibold">{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount)}</h1><p className="text-sm">Status: <strong>{status === "settlement" ? "Pembayaran berhasil" : "Menunggu pembayaran"}</strong></p>{status === "settlement" ? <Link className="text-sm text-primary underline" href="/dashboard/langganan">Kembali ke langganan</Link> : paymentUrl && <Button render={<a href={paymentUrl} target="_blank" rel="noreferrer" />}>Buka halaman pembayaran</Button>}</section></main>;
}
