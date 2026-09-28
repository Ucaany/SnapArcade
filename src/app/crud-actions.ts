"use server";

import { and, eq, gt } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { randomInt } from "node:crypto";
import { z } from "zod";
import { kioskPackages, kiosks, notifications, owners, paymentCredentials, profiles, staffAssignments, subscriptionPlans, subscriptions, vouchers } from "@/db/schema";
import { db } from "@/db";
import { audit, failure, getActor, ownerForResource, permits, transact, type ActionResult } from "@/lib/server-actions";
import { encryptCredential } from "@/lib/payment-crypto";
import { printerSettingsSchema } from "@/lib/printer-settings";

const uuid = z.string().uuid();
const nonnegative = z.number().int().nonnegative();
const cameraSettings = z.object({ iso: z.number().int().min(50).max(12800), shutterSpeed: z.string().trim().min(1).max(30), aperture: z.string().trim().min(1).max(20), resolution: z.string().trim().min(1).max(30), whiteBalance: z.string().trim().min(1).max(30), focusMode: z.enum(["auto", "manual"]) }).strict();
const result = (error: "invalid" | "unauthorized" | "not_found" = "invalid"): ActionResult => ({ ok: false, error });
const refresh = (admin = false) => revalidatePath(admin ? "/admin" : "/dashboard");
async function actor(): Promise<Awaited<ReturnType<typeof getActor>>> { return getActor(); }

export async function listOwners() {
  const a = await actor(); if (a?.role !== "superadmin") return result("unauthorized");
  return { ok: true as const, data: await db.select().from(owners) };
}
export async function updateOwner(id: string, input: unknown) {
  const a = await actor(); const p = z.object({ businessName: z.string().trim().min(2).max(200).optional(), address: z.string().max(2000).nullable().optional(), city: z.string().max(100).nullable().optional(), phone: z.string().max(30).nullable().optional(), status: z.enum(["pending", "active", "suspended"]).optional() }).strict().safeParse(input);
  if (!a) return result("unauthorized"); if (!uuid.safeParse(id).success || !p.success) return result();
  if (!permits(a, id) || (a.role !== "superadmin" && p.data.status !== undefined)) return result("unauthorized");
  const r = await transact(a, "owner.updated", id, async (tx) => (await tx.update(owners).set(p.data).where(eq(owners.id, id)).returning({ id: owners.id }))[0] ?? null);
  if (r.ok && !r.data) return result("not_found"); refresh(a.role === "superadmin"); return r;
}

export async function listKiosks() {
  const a = await actor(); if (!a || !permits(a)) return result("unauthorized");
  return { ok: true as const, data: await db.select().from(kiosks).where(a.role === "superadmin" ? undefined : eq(kiosks.ownerId, a.ownerId!)) };
}
export async function saveKiosk(id: string | null, input: unknown) {
  const a = await actor(); const p = z.object({ ownerId: uuid.optional(), name: z.string().trim().min(1).max(150), location: z.string().max(2000).nullable().optional(), sessionLimit: nonnegative.max(1000000), theme: z.record(z.string(), z.unknown()).nullable().optional(), cameraSettings: cameraSettings.nullable().optional(), printerSettings: printerSettingsSchema.nullable().optional() }).strict().safeParse(input);
  if (!a || !permits(a)) return result("unauthorized"); if (!p.success || (id && !uuid.safeParse(id).success)) return result();
  const ownerId = a.role === "superadmin" ? p.data.ownerId : a.ownerId; if (!ownerId || !permits(a, ownerId)) return result("unauthorized");
  const r = await transact(a, id ? "kiosk.updated" : "kiosk.created", ownerId, async (tx) => {
    const values = { name: p.data.name, location: p.data.location, sessionLimit: p.data.sessionLimit, theme: p.data.theme as any, cameraSettings: p.data.cameraSettings as any, printerSettings: p.data.printerSettings as any };
    return id ? (await tx.update(kiosks).set(values).where(and(eq(kiosks.id, id), eq(kiosks.ownerId, ownerId))).returning({ id: kiosks.id }))[0] ?? null : (await tx.insert(kiosks).values({ ...values, ownerId }).returning({ id: kiosks.id }))[0];
  }, id);
  if (r.ok && !r.data) return result("not_found"); refresh(a.role === "superadmin"); return r;
}
export async function deleteKiosk(id: string) {
  const a = await actor(); if (!a || !permits(a)) return result("unauthorized"); if (!uuid.safeParse(id).success) return result();
  const ownerId = await ownerForResource(kiosks, id); if (!ownerId) return result("not_found"); if (!permits(a, ownerId)) return result("unauthorized");
  const r = await transact(a, "kiosk.deleted", ownerId, async (tx) => (await tx.delete(kiosks).where(and(eq(kiosks.id, id), eq(kiosks.ownerId, ownerId))).returning({ id: kiosks.id }))[0] ?? null, id);
  if (r.ok && !r.data) return result("not_found"); refresh(a.role === "superadmin"); return r;
}
export async function generatePairingCode(id: string): Promise<{ ok: true; data: { id: string; pairingCode: string; pairingCodeExpiresAt: Date | null } } | { ok: false; error: "invalid" | "unauthorized" | "not_found" | "conflict" | "failed" }> {
  const a = await actor(); if (!a || !permits(a) || a.role === "staff") return { ok: false, error: "unauthorized" }; if (!uuid.safeParse(id).success) return { ok: false, error: "invalid" };
  const ownerId = await ownerForResource(kiosks, id); if (!ownerId) return { ok: false, error: "not_found" }; if (!permits(a, ownerId)) return { ok: false, error: "unauthorized" };
  try {
    const data = await db.transaction(async (tx) => {
      for (let i = 0; i < 8; i++) {
        const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
        const [collision] = await tx.select({ id: kiosks.id }).from(kiosks).where(and(eq(kiosks.pairingCode, code), gt(kiosks.pairingCodeExpiresAt, new Date()))).limit(1);
        if (collision && collision.id !== id) continue;
        const [row] = await tx.update(kiosks).set({ pairingCode: code, pairingCodeExpiresAt: new Date(Date.now() + 900_000), pairingTokenHash: null, status: "pairing" }).where(and(eq(kiosks.id, id), eq(kiosks.ownerId, ownerId))).returning({ id: kiosks.id, pairingCode: kiosks.pairingCode, pairingCodeExpiresAt: kiosks.pairingCodeExpiresAt });
        if (!row?.pairingCode) return null; await audit(tx, a, "kiosk.pairing_code.generated", ownerId, id); return row;
      }
      throw Object.assign(new Error("collision"), { code: "23505" });
    });
    refresh(a.role === "superadmin"); return data ? { ok: true as const, data: { ...data, pairingCode: data.pairingCode! } } : { ok: false, error: "not_found" };
  } catch (e) { const failed = failure(e); return { ok: false, error: failed.ok ? "failed" as const : failed.error }; }
}

async function saveTenant(table: any, id: string | null, input: unknown, schema: z.ZodTypeAny, action: string): Promise<ActionResult> {
  const a = await actor(); const p = schema.safeParse(input); if (!a || !permits(a)) return result("unauthorized"); if (!p.success || (id && !uuid.safeParse(id).success)) return result();
  const ownerId = a.ownerId; if (!ownerId) return result("unauthorized");
  if (id) { const current = await ownerForResource(table, id); if (!current) return result("not_found"); if (!permits(a, current)) return result("unauthorized"); }
  const values = p.data as Record<string, unknown>;
  const r = await transact(a, `${action}.${id ? "updated" : "created"}`, ownerId, async (tx) => id
    ? (await tx.update(table).set(values).where(and(eq(table.id, id), eq(table.ownerId, ownerId))).returning({ id: table.id }))[0] ?? null
    : (await tx.insert(table).values({ ...values, ownerId }).returning({ id: table.id }))[0]);
  if (r.ok && !r.data) return result("not_found"); refresh(); return r;
}
async function deleteTenant(table: any, id: string, action: string): Promise<ActionResult> {
  const a = await actor(); if (!a || !permits(a)) return result("unauthorized"); if (!uuid.safeParse(id).success) return result();
  const ownerId = await ownerForResource(table, id); if (!ownerId) return result("not_found"); if (!permits(a, ownerId)) return result("unauthorized");
  const r = await transact(a, `${action}.deleted`, ownerId, async (tx) => (await tx.delete(table).where(and(eq(table.id, id), eq(table.ownerId, ownerId))).returning({ id: table.id }))[0] ?? null);
  if (r.ok && !r.data) return result("not_found"); refresh(); return r;
}
const voucher = z.object({ code: z.string().trim().min(1).max(50), type: z.enum(["percentage", "fixed", "free_session"]), value: z.coerce.number().nonnegative().max(100000000), maxUses: nonnegative, validFrom: z.coerce.date().optional(), validUntil: z.coerce.date().nullable().optional(), isActive: z.boolean() }).strict();
export async function saveVoucher(id: string | null, input: unknown) { return saveTenant(vouchers, id, input, voucher, "voucher"); }
export async function deleteVoucher(id: string) { return deleteTenant(vouchers, id, "voucher"); }
const pack = z.object({ name: z.string().trim().min(1).max(100), description: z.string().max(2000).nullable().optional(), photoCount: nonnegative, copyCount: nonnegative, priceIdr: nonnegative, isActive: z.boolean(), orderIndex: nonnegative }).strict();
export async function saveKioskPackage(id: string | null, input: unknown) { return saveTenant(kioskPackages, id, input, pack, "kiosk_package"); }
export async function deleteKioskPackage(id: string) { return deleteTenant(kioskPackages, id, "kiosk_package"); }

export async function listPaymentCredentials() {
  const a = await actor(); if (!a || !permits(a) || !a.ownerId) return result("unauthorized");
  return { ok: true as const, data: await db.select({ id: paymentCredentials.id, provider: paymentCredentials.provider, label: paymentCredentials.label, isActive: paymentCredentials.isActive, isSandbox: paymentCredentials.isSandbox, lastVerifiedAt: paymentCredentials.lastVerifiedAt, createdAt: paymentCredentials.createdAt }).from(paymentCredentials).where(eq(paymentCredentials.ownerId, a.ownerId)) };
}
export async function savePaymentCredential(id: string | null, input: unknown) {
  const a = await actor(); const p = z.object({ provider: z.enum(["midtrans", "xendit", "tripay"]), label: z.string().trim().min(1).max(100), config: z.record(z.string(), z.string().min(1).max(4000)).refine((v) => Object.keys(v).length > 0), isActive: z.boolean(), isSandbox: z.boolean() }).strict().safeParse(input);
  if (!a || a.role !== "owner" || !a.ownerId) return result("unauthorized"); if (!p.success || (id && !uuid.safeParse(id).success)) return result();
  if (id) { const current = await ownerForResource(paymentCredentials, id); if (!current) return result("not_found"); if (current !== a.ownerId) return result("unauthorized"); }
  let encryptedConfig: string; try { encryptedConfig = encryptCredential(p.data.config); } catch { return { ok: false as const, error: "failed" as const }; }
  const r = await transact(a, `payment_credential.${id ? "updated" : "created"}`, a.ownerId, async (tx) => {
    const v = { provider: p.data.provider, label: p.data.label, encryptedConfig, isActive: p.data.isActive, isSandbox: p.data.isSandbox };
    return id ? (await tx.update(paymentCredentials).set(v).where(and(eq(paymentCredentials.id, id), eq(paymentCredentials.ownerId, a.ownerId!))).returning({ id: paymentCredentials.id }))[0] ?? null : (await tx.insert(paymentCredentials).values({ ...v, ownerId: a.ownerId! }).returning({ id: paymentCredentials.id }))[0];
  });
  if (r.ok && !r.data) return result("not_found"); refresh(); return r;
}
export async function deletePaymentCredential(id: string) { return deleteTenant(paymentCredentials, id, "payment_credential"); }

export async function assignStaff(staffId: string, kioskId: string, assign: boolean) {
  const a = await actor(); if (!a || a.role !== "owner" || !a.ownerId) return result("unauthorized"); if (!uuid.safeParse(staffId).success || !uuid.safeParse(kioskId).success || typeof assign !== "boolean") return result();
  const [kiosk] = await db.select({ ownerId: kiosks.ownerId }).from(kiosks).where(eq(kiosks.id, kioskId)).limit(1);
  const [staff] = await db.select({ role: profiles.role, ownerUserId: profiles.ownerId }).from(profiles).where(eq(profiles.id, staffId)).limit(1);
  const [staffOwner] = staff?.ownerUserId ? await db.select({ id: owners.id }).from(owners).where(eq(owners.userId, staff.ownerUserId)).limit(1) : [];
  if (!kiosk || !staff) return result("not_found"); if (!permits(a, kiosk.ownerId) || staff.role !== "staff" || staffOwner?.id !== kiosk.ownerId) return result("unauthorized");
  const r = await transact(a, assign ? "staff_assignment.created" : "staff_assignment.deleted", kiosk.ownerId, async (tx) => {
    if (assign) { await tx.insert(staffAssignments).values({ staffId, kioskId }).onConflictDoNothing(); return { id: kioskId }; }
    await tx.delete(staffAssignments).where(and(eq(staffAssignments.staffId, staffId), eq(staffAssignments.kioskId, kioskId))); return { id: kioskId };
  }, kioskId);
  refresh(); return r;
}

export async function markNotificationRead(id: string) {
  const a = await actor();
  if (!a) return result("unauthorized");
  if (!uuid.safeParse(id).success) return result();
  const [row] = await db.update(notifications).set({ isRead: true })
    .where(and(eq(notifications.id, id), eq(notifications.userId, a.userId)))
    .returning({ id: notifications.id });
  if (!row) return result("not_found");
  revalidatePath(a.role === "superadmin" ? "/admin" : a.role === "staff" ? "/staff" : "/dashboard");
  return { ok: true as const, data: row };
}

export async function saveSubscriptionPlan(id: string | null, input: unknown) {
  const a = await actor(); const p = z.object({ name: z.string().trim().min(1).max(100), slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(60), description: z.string().max(2000).nullable().optional(), machineLimit: nonnegative, includedSessions: nonnegative, monthlyPriceIdr: nonnegative, extraSessionPackSize: nonnegative.nullable().optional(), extraSessionPriceIdr: nonnegative.nullable().optional(), features: z.array(z.string().max(200)).max(100), isActive: z.boolean() }).strict().safeParse(input);
  if (a?.role !== "superadmin") return result("unauthorized"); if (!p.success || (id && !uuid.safeParse(id).success)) return result();
  const r = await transact(a, `subscription_plan.${id ? "updated" : "created"}`, null, async (tx) => id
    ? (await tx.update(subscriptionPlans).set(p.data).where(eq(subscriptionPlans.id, id)).returning({ id: subscriptionPlans.id }))[0] ?? null
    : (await tx.insert(subscriptionPlans).values(p.data).returning({ id: subscriptionPlans.id }))[0]);
  if (r.ok && !r.data) return result("not_found"); refresh(true); return r;
}
export async function deleteSubscriptionPlan(id: string) {
  const a = await actor(); if (a?.role !== "superadmin") return result("unauthorized"); if (!uuid.safeParse(id).success) return result();
  const r = await transact(a, "subscription_plan.deleted", null, async (tx) => (await tx.delete(subscriptionPlans).where(eq(subscriptionPlans.id, id)).returning({ id: subscriptionPlans.id }))[0] ?? null);
  if (r.ok && !r.data) return result("not_found"); refresh(true); return r;
}
export async function listSubscriptions() {
  const a = await actor(); if (!a || !permits(a)) return result("unauthorized");
  return { ok: true as const, data: await db.select().from(subscriptions).where(a.role === "superadmin" ? undefined : eq(subscriptions.ownerId, a.ownerId!)) };
}
export async function saveSubscription(id: string | null, input: unknown) {
  const a = await actor(); const p = z.object({ ownerId: uuid, planId: uuid, machinesCount: nonnegative, includedSessions: nonnegative, addOnSessions: nonnegative, sessionsUsed: nonnegative }).strict().safeParse(input);
  if (a?.role !== "superadmin") return result("unauthorized"); if (!p.success || (id && !uuid.safeParse(id).success)) return result();
  const [owner] = await db.select({ id: owners.id }).from(owners).where(eq(owners.id, p.data.ownerId)).limit(1); const [plan] = await db.select({ id: subscriptionPlans.id }).from(subscriptionPlans).where(eq(subscriptionPlans.id, p.data.planId)).limit(1);
  if (!owner || !plan) return result("not_found");
  const r = await transact(a, `subscription.${id ? "updated" : "created"}`, p.data.ownerId, async (tx) => id
    ? (await tx.update(subscriptions).set({ planId: p.data.planId, machinesCount: p.data.machinesCount, includedSessions: p.data.includedSessions, addOnSessions: p.data.addOnSessions, sessionsUsed: p.data.sessionsUsed }).where(eq(subscriptions.id, id)).returning({ id: subscriptions.id }))[0] ?? null
    : (await tx.insert(subscriptions).values({ ...p.data, status: "pending" }).returning({ id: subscriptions.id }))[0]);
  if (r.ok && !r.data) return result("not_found"); refresh(true); return r;
}
