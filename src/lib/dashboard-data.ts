import "server-only";
import { and, desc, eq, gt, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { activityLogs, invitations, invoices, kiosks, notifications, owners, paymentCredentials, profiles, sessions, staffAssignments, subscriptionPlans, subscriptions, transactions, vouchers } from "@/db/schema";
import { getActor } from "@/lib/server-actions";
import { loadOwnerAnalytics } from "@/lib/analytics";

export async function loadDashboardData() {
  const actor = await getActor();
  if (!actor) return null;
  const admin = actor.role === "superadmin";
  if (actor.role === "owner" && !actor.ownerId) return null;

  const assigned = actor.role === "staff"
    ? (await db.select({ id: staffAssignments.kioskId }).from(staffAssignments).where(eq(staffAssignments.staffId, actor.userId))).map((row) => row.id)
    : null;
  const kioskRows = assigned
    ? assigned.length ? await db.select().from(kiosks).where(inArray(kiosks.id, assigned)) : []
    : await db.select().from(kiosks).where(admin ? undefined : eq(kiosks.ownerId, actor.ownerId!));
  const kioskIds = kioskRows.map((row) => row.id);
  const ownerFilter = actor.role === "owner" ? eq(sessions.ownerId, actor.ownerId!) : undefined;
  const sessionRows = actor.role === "staff"
    ? kioskIds.length ? await db.select().from(sessions).where(inArray(sessions.kioskId, kioskIds)).orderBy(desc(sessions.startedAt)).limit(200) : []
    : await db.select().from(sessions).where(ownerFilter).orderBy(desc(sessions.startedAt)).limit(200);
  const noticeRows = await db.select().from(notifications).where(and(eq(notifications.userId, actor.userId), or(isNull(notifications.expiresAt), gt(notifications.expiresAt, new Date())))).orderBy(desc(notifications.createdAt)).limit(100);

  if (admin) {
    const [ownerRows, planRows, subscriptionRows, invoiceRows, users, logs, invitationRows] = await Promise.all([
      db.select().from(owners).orderBy(desc(owners.createdAt)).limit(200),
      db.select().from(subscriptionPlans).orderBy(subscriptionPlans.monthlyPriceIdr),
      db.select().from(subscriptions).orderBy(desc(subscriptions.createdAt)).limit(200),
      db.select().from(invoices).orderBy(desc(invoices.createdAt)).limit(200),
      db.select().from(profiles).orderBy(desc(profiles.createdAt)).limit(500),
      db.select().from(activityLogs).orderBy(desc(activityLogs.createdAt)).limit(200),
      db.select().from(invitations).orderBy(desc(invitations.createdAt)).limit(200),
    ]);
    const trx = await db.select().from(transactions).orderBy(desc(transactions.createdAt)).limit(200);
    const ownerProfiles = ownerRows.length ? await db.select().from(profiles).where(inArray(profiles.id, ownerRows.map((row) => row.userId))) : [];
    return { role: "superadmin" as const, kiosks: kioskRows, sessions: sessionRows, notifications: noticeRows, owners: ownerRows, ownerProfiles, plans: planRows, subscriptions: subscriptionRows, invoices: invoiceRows, users, logs, transactions: trx, invitations: invitationRows };
  }
  if (actor.role === "staff") return { role: "staff" as const, kiosks: kioskRows, sessions: sessionRows, notifications: noticeRows };
  const ownerId = actor.ownerId!;
  const [voucherRows, subscriptionRows, invoiceRows, transactionRows, staffRows, profile, ownOwner, planRows, kioskCounts, analytics] = await Promise.all([
    actor.role === "owner" ? db.select().from(vouchers).where(eq(vouchers.ownerId, ownerId)).orderBy(desc(vouchers.createdAt)).limit(500) : [],
    actor.role === "owner" ? db.select().from(subscriptions).where(eq(subscriptions.ownerId, ownerId)).orderBy(desc(subscriptions.createdAt)).limit(50) : [],
    actor.role === "owner" ? db.select().from(invoices).where(eq(invoices.ownerId, ownerId)).orderBy(desc(invoices.createdAt)).limit(100) : [],
    actor.role === "owner" ? db.select().from(transactions).where(eq(transactions.ownerId, ownerId)).orderBy(desc(transactions.createdAt)).limit(200) : [],
    db.select().from(profiles).where(and(eq(profiles.ownerId, actor.userId), eq(profiles.role, "staff"))).orderBy(desc(profiles.createdAt)).limit(300),
    db.select().from(profiles).where(eq(profiles.id, actor.userId)).limit(1).then((rows) => rows[0]),
    db.select().from(owners).where(eq(owners.id, ownerId)).limit(1).then((rows) => rows[0]),
    db.select().from(subscriptionPlans).where(eq(subscriptionPlans.isActive, true)).orderBy(subscriptionPlans.monthlyPriceIdr),
    db.select({ status: kiosks.status, count: sql<number>`count(*)::int` }).from(kiosks).where(eq(kiosks.ownerId, ownerId)).groupBy(kiosks.status),
    loadOwnerAnalytics(ownerId),
  ]);
  const credentialRows = actor.role === "owner" ? await db.select({ id: paymentCredentials.id, provider: paymentCredentials.provider, label: paymentCredentials.label, isActive: paymentCredentials.isActive, isSandbox: paymentCredentials.isSandbox, lastVerifiedAt: paymentCredentials.lastVerifiedAt, createdAt: paymentCredentials.createdAt }).from(paymentCredentials).where(eq(paymentCredentials.ownerId, ownerId)) : [];
  return { role: "owner" as const, profile, owner: ownOwner, kiosks: kioskRows, sessions: sessionRows, notifications: noticeRows, vouchers: voucherRows, subscriptions: subscriptionRows, invoices: invoiceRows, transactions: transactionRows, staff: staffRows, credentials: credentialRows, plans: planRows, kioskCounts, analytics };
}
