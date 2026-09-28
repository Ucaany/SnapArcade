"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

export function DashboardRealtime({ userId, ownerId, kioskIds }: { userId: string; ownerId: string | null; kioskIds: string[] }) {
  const router = useRouter();
  const assignedKioskIds = kioskIds.join(",");
  useEffect(() => {
    const assignedIds = assignedKioskIds ? assignedKioskIds.split(",") : [];
    const channels = [supabaseBrowser.channel(`notifications:${userId}`).on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, () => router.refresh()).subscribe()];
    if (ownerId) channels.push(supabaseBrowser.channel(`kiosks:owner:${ownerId}`).on("postgres_changes", { event: "*", schema: "public", table: "kiosks", filter: `owner_id=eq.${ownerId}` }, () => router.refresh()).subscribe());
    for (const kioskId of assignedIds) channels.push(supabaseBrowser.channel(`kiosks:assigned:${kioskId}`).on("postgres_changes", { event: "*", schema: "public", table: "kiosks", filter: `id=eq.${kioskId}` }, () => router.refresh()).subscribe());
    return () => { for (const channel of channels) void supabaseBrowser.removeChannel(channel); };
  }, [userId, ownerId, assignedKioskIds, router]);
  return null;
}
