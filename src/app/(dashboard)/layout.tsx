import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard-shell";
import { Toaster } from "@/components/ui/sonner";
import { DashboardRealtime } from "@/components/dashboard-realtime";
import { getActor } from "@/lib/server-actions";
import { db } from "@/db";
import { staffAssignments } from "@/db/schema";
import { eq } from "drizzle-orm";

export const metadata: Metadata = { title: { default: "Dashboard | SnapArcade", template: "%s | SnapArcade" } };

export default async function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const actor = await getActor();
  const kioskIds = actor?.role === "staff" ? (await db.select({ kioskId: staffAssignments.kioskId }).from(staffAssignments).where(eq(staffAssignments.staffId, actor.userId))).map(({ kioskId }) => kioskId) : [];
  return <div className="dashboard-theme min-h-screen">{actor && <DashboardRealtime userId={actor.userId} ownerId={actor.ownerId} kioskIds={kioskIds} />}<DashboardShell>{children}</DashboardShell><Toaster /></div>;
}
