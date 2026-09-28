"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function SubscriptionPaymentButton({ subscriptionId }: { subscriptionId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function create() {
    setBusy(true);
    const response = await fetch("/api/pakasir/create", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ subscriptionId, method: "qris" }) });
    const data = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) return toast.error(data.error ?? "Invoice gagal dibuat");
    router.push(`/dashboard/langganan/bayar/${data.invoiceId}`);
  }
  return <Button size="sm" onClick={() => void create()} disabled={busy}>{busy ? "Menyiapkan..." : "Bayar langganan"}</Button>;
}
