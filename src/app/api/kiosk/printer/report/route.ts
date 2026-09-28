import { z } from "zod";
import { db } from "@/db";
import { activityLogs, kiosks, staffAssignments } from "@/db/schema";
import { authenticateKiosk } from "@/lib/kiosk-auth";
import { badRequest, json, notFound, serverError, unauthorized } from "@/lib/kiosk-api";
import { getActor } from "@/lib/server-actions";
import { and, eq } from "drizzle-orm";

const payload = z.object({ kioskId: z.string().uuid().optional(), result: z.enum(["success", "failed", "cancelled"]), jobType: z.enum(["test_print", "print"]).default("test_print"), elapsedMs: z.number().int().min(0).max(3_600_000), progress: z.number().int().min(0).max(100), error: z.string().trim().max(300).optional(), device: z.object({ manufacturer: z.string().trim().max(100).optional(), product: z.string().trim().max(150).optional(), serial: z.string().trim().max(100).optional() }).strict().optional() }).strict();

export async function POST(request: Request) {
  const parsed = payload.safeParse(await request.json().catch(() => null)); if (!parsed.success) return badRequest();
  const kioskAuth = await authenticateKiosk(request); const actor = kioskAuth ? null : await getActor(); const kioskId = kioskAuth?.kioskId ?? parsed.data.kioskId;
  if (!kioskId || (!kioskAuth && !actor)) return unauthorized();
  const [kiosk] = await db.select({ id: kiosks.id, ownerId: kiosks.ownerId }).from(kiosks).where(eq(kiosks.id, kioskId)).limit(1); if (!kiosk) return notFound();
  if (actor) { const allowed = actor.role === "superadmin" || (actor.role === "owner" && actor.ownerId === kiosk.ownerId) || (actor.role === "staff" && !!(await db.select({ id: staffAssignments.id }).from(staffAssignments).where(and(eq(staffAssignments.staffId, actor.userId), eq(staffAssignments.kioskId, kioskId))).limit(1))[0]); if (!allowed) return unauthorized(); }
  try { await db.insert(activityLogs).values({ userId: actor?.userId ?? null, ownerId: kiosk.ownerId, kioskId, action: `printer.${parsed.data.jobType}`, meta: { result: parsed.data.result, elapsedMs: parsed.data.elapsedMs, progress: parsed.data.progress, error: parsed.data.error, device: parsed.data.device }, ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim().slice(0, 45) ?? null, userAgent: request.headers.get("user-agent")?.slice(0, 500) ?? null }); return json({ ok: true }); } catch { return serverError(); }
}
