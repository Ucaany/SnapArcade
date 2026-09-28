import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { activityLogs, owners, profiles } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";

export type ActionResult<T = { id?: string }> = { ok: true; data?: T } | { ok: false; error: "invalid" | "unauthorized" | "not_found" | "conflict" | "failed" };
export type Actor = { userId: string; role: "owner" | "staff" | "superadmin"; ownerId: string | null; fullName: string; email: string };

export async function getActor(): Promise<Actor | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const [profile] = await db.select({ role: profiles.role, status: profiles.status, ownerId: owners.id, ownerStatus: owners.status, fullName: profiles.fullName, email: profiles.email }).from(profiles)
    .leftJoin(owners, eq(owners.userId, profiles.id)).where(eq(profiles.id, user.id)).limit(1);
  return profile?.status === "active" && (profile.role !== "owner" || profile.ownerStatus === "active")
    ? { userId: user.id, role: profile.role, ownerId: profile.ownerId, fullName: profile.fullName, email: profile.email }
    : null;
}

export function permits(actor: Actor, ownerId?: string, adminOnly = false) {
  return actor.role === "superadmin" || (!adminOnly && actor.role === "owner" && !!actor.ownerId && (!ownerId || actor.ownerId === ownerId));
}

export async function audit(tx: any, actor: Actor, action: string, ownerId?: string | null, kioskId?: string | null) {
  await tx.insert(activityLogs).values({ userId: actor.userId, ownerId: ownerId ?? null, kioskId: kioskId ?? null, action, meta: null });
}

export function failure(error: unknown): ActionResult {
  if (error instanceof Error && "code" in error && error.code === "23505") return { ok: false, error: "conflict" };
  return { ok: false, error: "failed" };
}

export async function transact<T>(actor: Actor, action: string, ownerId: string | null, operation: (tx: any) => Promise<T>, kioskId?: string | null): Promise<ActionResult<T>> {
  try {
    const data = await db.transaction(async (tx) => {
      const result = await operation(tx);
      await audit(tx, actor, action, ownerId, kioskId);
      return result;
    });
    return { ok: true, data };
  } catch (error) { return { ok: false, error: error instanceof Error && "code" in error && error.code === "23505" ? "conflict" : "failed" }; }
}

export async function ownerForResource(table: any, id: string): Promise<string | null> {
  const [row] = await db.select({ ownerId: table.ownerId }).from(table).where(eq(table.id, id)).limit(1);
  return row?.ownerId ?? null;
}
