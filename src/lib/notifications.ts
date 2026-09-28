import "server-only";
import { and, eq, gt, isNotNull, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { kiosks, notifications, owners, profiles, staffAssignments, subscriptions } from "@/db/schema";
import { notificationWindows } from "@/lib/notification-policy";

type Notice = { userId: string; ownerId?: string | null; kioskId?: string | null; type: typeof notifications.$inferInsert.type; title: string; message: string; link?: string | null; eventKey?: string | null };

export async function createNotification(input: Notice) {
  if (!input.userId || !input.title.trim() || !input.message.trim() || input.title.length > 200 || input.message.length > 10000 || (input.link && (!input.link.startsWith("/") || input.link.startsWith("//")))) throw new Error("Invalid notification");
  const [row] = await db.insert(notifications).values({ ...input, expiresAt: new Date(Date.now() + 30 * 86400000) }).onConflictDoNothing().returning({ id: notifications.id });
  return row ?? null;
}

export async function notificationRecipients(ownerId: string, kioskId?: string) {
  const [owner] = await db.select({ userId: owners.userId }).from(owners).where(eq(owners.id, ownerId)).limit(1);
  if (!owner) return [];
  const staff = kioskId
    ? await db.select({ userId: profiles.id }).from(staffAssignments).innerJoin(profiles, eq(profiles.id, staffAssignments.staffId)).where(and(eq(staffAssignments.kioskId, kioskId), eq(profiles.status, "active")))
    : await db.select({ userId: profiles.id }).from(profiles).where(and(eq(profiles.ownerId, owner.userId), eq(profiles.role, "staff"), eq(profiles.status, "active")));
  return [...new Set([owner.userId, ...staff.map((row) => row.userId)])];
}

async function notificationLink(userId: string, ownerId: string, kioskId?: string) {
  const [profile] = await db.select({ role: profiles.role }).from(profiles).where(eq(profiles.id, userId)).limit(1);
  if (profile?.role === "staff") return kioskId ? `/staff/mesin/${kioskId}` : "/staff/notifikasi";
  return kioskId ? `/dashboard/mesin/${kioskId}` : "/dashboard/langganan";
}

export async function notifyTransactionFailed(transactionId: string, ownerId: string, kioskId: string) {
  const recipients = await notificationRecipients(ownerId, kioskId);
  await Promise.all(recipients.map(async (userId) => createNotification({ userId, ownerId, kioskId, type: "transaction_failed", title: "Transaksi gagal", message: "Transaksi mengalami kegagalan.", link: await notificationLink(userId, ownerId, kioskId), eventKey: `transaction_failed:${transactionId}` })));
}

export async function runNotificationSweep(now = new Date()) {
  const { offlineBefore, expiringFrom, expiringUntil } = notificationWindows(now);
  const offlineKiosks = await db.select({ id: kiosks.id, ownerId: kiosks.ownerId, name: kiosks.name, lastPingAt: kiosks.lastPingAt }).from(kiosks).where(and(isNotNull(kiosks.lastPingAt), lt(kiosks.lastPingAt, offlineBefore), sql`${kiosks.status} <> 'pairing'`));
  for (const kiosk of offlineKiosks) {
    const recipients = await notificationRecipients(kiosk.ownerId, kiosk.id);
    await Promise.all(recipients.map(async (userId) => createNotification({ userId, ownerId: kiosk.ownerId, kioskId: kiosk.id, type: "kiosk_offline", title: "Kiosk tidak aktif", message: `${kiosk.name} tidak mengirim heartbeat lebih dari 15 menit.`, link: await notificationLink(userId, kiosk.ownerId, kiosk.id), eventKey: `kiosk_offline:${kiosk.id}:${kiosk.lastPingAt!.toISOString()}` })));
  }
  const expiringSubscriptions = await db.select({ id: subscriptions.id, ownerId: subscriptions.ownerId, userId: owners.userId, expiresAt: subscriptions.expiresAt }).from(subscriptions).innerJoin(owners, eq(owners.id, subscriptions.ownerId)).where(and(eq(subscriptions.status, "active"), gt(subscriptions.expiresAt, expiringFrom), lt(subscriptions.expiresAt, expiringUntil), isNotNull(subscriptions.expiresAt)));
  for (const sub of expiringSubscriptions) await createNotification({ userId: sub.userId, ownerId: sub.ownerId, type: "subscription_expiring", title: "Langganan segera berakhir", message: `Langganan berakhir pada ${sub.expiresAt!.toLocaleDateString("id-ID")}.`, link: "/dashboard/langganan", eventKey: `subscription_expiring:${sub.id}:${sub.expiresAt!.toISOString()}` });
  return { kiosks: offlineKiosks.length, subscriptions: expiringSubscriptions.length };
}
