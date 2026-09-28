import "server-only";
import { timingSafeEqual, createHash, randomBytes } from "node:crypto";
import { eq, and, sql } from "drizzle-orm";
import { db } from "@/db";
import { kiosks, owners, subscriptionPlans, subscriptions } from "@/db/schema";

export const PAIRING_CODE = /^[0-9]{6}$/;
export const KIOSK_TOKEN = /^[0-9a-f]{64}$/;

export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function generateKioskToken(): string {
  return randomBytes(32).toString("hex");
}

export function tokenMatches(token: string, storedHash: string | null): boolean {
  if (!storedHash) return false;
  const hash = hashToken(token);
  const a = Buffer.from(hash, "utf8");
  const b = Buffer.from(storedHash, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export type KioskAuth = { kioskId: string; ownerId: string; name: string; status: string };

export async function authenticateKiosk(request: Request): Promise<KioskAuth | null> {
  const token = request.headers.get("x-kiosk-token") ?? "";
  if (!KIOSK_TOKEN.test(token)) return null;
  const [row] = await db
    .select({ id: kiosks.id, ownerId: kiosks.ownerId, name: kiosks.name, status: kiosks.status, tokenHash: kiosks.pairingTokenHash })
    .from(kiosks)
    .where(eq(kiosks.pairingTokenHash, hashToken(token)))
    .limit(1);
  if (!row || !tokenMatches(token, row.tokenHash) || row.status === "pairing") return null;
  return { kioskId: row.id, ownerId: row.ownerId, name: row.name, status: row.status };
}

export type SubscriptionState = {
  subscription: { id: string; status: string; expiresAt: Date | null; machinesCount: number; includedSessions: number; addOnSessions: number; sessionsUsed: number; planMachineLimit: number } | null;
};

export async function loadSubscription(ownerId: string): Promise<SubscriptionState["subscription"]> {
  const [row] = await db
    .select({
      id: subscriptions.id,
      status: subscriptions.status,
      expiresAt: subscriptions.expiresAt,
      machinesCount: subscriptions.machinesCount,
      includedSessions: subscriptions.includedSessions,
      addOnSessions: subscriptions.addOnSessions,
      sessionsUsed: subscriptions.sessionsUsed,
      planMachineLimit: subscriptionPlans.machineLimit,
    })
    .from(subscriptions)
    .innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
    .where(and(eq(subscriptions.ownerId, ownerId), eq(subscriptions.status, "active")))
    .orderBy(sql`${subscriptions.createdAt} desc`)
    .limit(1);
  return row ?? null;
}

export function subscriptionActive(sub: NonNullable<SubscriptionState["subscription"]>, now = new Date()): boolean {
  if (sub.status !== "active") return false;
  if (sub.expiresAt && sub.expiresAt.getTime() <= now.getTime()) return false;
  return true;
}

export async function ownerThemeFallback(ownerId: string): Promise<Record<string, unknown> | null> {
  const [row] = await db.select({ defaultTheme: owners.defaultTheme }).from(owners).where(eq(owners.id, ownerId)).limit(1);
  return (row?.defaultTheme as Record<string, unknown> | null) ?? null;
}
