import { and, eq, gt, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { kiosks, subscriptionPlans, subscriptions } from "@/db/schema";
import { badRequest, conflict, json, notFound, serverError } from "@/lib/kiosk-api";
import { PAIRING_CODE, generateKioskToken, hashToken } from "@/lib/kiosk-auth";

export const dynamic = "force-dynamic";

// ponytail: no production rate limiting on this endpoint — PRD requires it but no shared
// limiter (Upstash/Cloudflare KV) is configured; enforce at platform level (e.g. Vercel WAF).
const bodySchema = z.object({ pairing_code: z.string().regex(PAIRING_CODE) }).strict();

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest();
  const { pairing_code } = parsed.data;

  try {
    const outcome = await db.transaction(async (tx) => {
      const [kiosk] = await tx
        .select({ id: kiosks.id, ownerId: kiosks.ownerId })
        .from(kiosks)
        .where(and(eq(kiosks.pairingCode, pairing_code), gt(kiosks.pairingCodeExpiresAt, new Date())))
        .limit(1);
      if (!kiosk) return { kind: "invalid_code" as const };

      // Serialize concurrent pairings per owner so capacity cannot be exceeded by a race.
      const [sub] = await tx
        .select({
          status: subscriptions.status,
          expiresAt: subscriptions.expiresAt,
          machinesCount: subscriptions.machinesCount,
          planMachineLimit: subscriptionPlans.machineLimit,
        })
        .from(subscriptions)
        .innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
        .where(eq(subscriptions.ownerId, kiosk.ownerId))
        .orderBy(sql`${subscriptions.createdAt} desc`)
        .limit(1)
        .for("update", { of: subscriptions });

      const now = new Date();
      if (!sub || sub.status !== "active" || (sub.expiresAt && sub.expiresAt.getTime() <= now.getTime())) {
        return { kind: "conflict" as const };
      }

      const [countRow] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(kiosks)
        .where(and(
          eq(kiosks.ownerId, kiosk.ownerId),
          ne(kiosks.id, kiosk.id),
          ne(kiosks.status, "pairing"),
          ne(kiosks.status, "offline"),
        ));
      if ((countRow?.count ?? 0) >= Math.min(sub.machinesCount, sub.planMachineLimit)) {
        return { kind: "conflict" as const };
      }

      const token = generateKioskToken();
      const [updated] = await tx
        .update(kiosks)
        .set({ pairingTokenHash: hashToken(token), status: "online", lastPingAt: now, pairingCode: null, pairingCodeExpiresAt: null })
        .where(and(eq(kiosks.id, kiosk.id), eq(kiosks.pairingCode, pairing_code), gt(kiosks.pairingCodeExpiresAt, now)))
        .returning({ id: kiosks.id });
      if (!updated) return { kind: "invalid_code" as const };
      return { kind: "paired" as const, kioskId: updated.id, token };
    });

    if (outcome.kind === "conflict") return conflict("subscription_or_capacity");
    if (outcome.kind === "invalid_code") return notFound("invalid_or_expired_code");
    return json({ pairing_token: outcome.token, kiosk_id: outcome.kioskId });
  } catch {
    return serverError();
  }
}

export function GET() {
  return badRequest("method_not_allowed");
}
