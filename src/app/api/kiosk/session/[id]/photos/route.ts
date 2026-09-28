import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { sessionPhotos, sessions } from "@/db/schema";
import { badRequest, json, notFound, serverError, unauthorized } from "@/lib/kiosk-api";
import { authenticateKiosk } from "@/lib/kiosk-auth";
import { kioskSession, SESSION_PHOTO_BUCKET, storagePath } from "@/lib/kiosk-session";
import { adminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
const MAX_BYTES = 12 * 1024 * 1024;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateKiosk(request);
  if (!auth) return unauthorized();
  const { id } = await params;
  const session = await kioskSession(id, auth.kioskId, auth.ownerId);
  if (!session || session.status === "completed" || !session.expiresAt || session.expiresAt <= new Date()) return notFound("session_unavailable");
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const orderIndex = Number(form?.get("order_index"));
  if (!(file instanceof File) || !Number.isInteger(orderIndex) || orderIndex < 0 || orderIndex >= 100 || file.size < 1 || file.size > MAX_BYTES || !["image/jpeg", "image/png"].includes(file.type)) return badRequest("invalid_photo");
  const extension = file.type === "image/png" ? "png" : "jpg";
  const existing = (await db.select({ id: sessionPhotos.id, storagePath: sessionPhotos.storagePath }).from(sessionPhotos).where(and(eq(sessionPhotos.sessionId, id), eq(sessionPhotos.orderIndex, orderIndex), eq(sessionPhotos.isFinalStrip, false))).limit(1))[0];
  const photoId = existing?.id ?? randomUUID();
  const path = storagePath(auth.ownerId, id, photoId, extension);
  try {
    const upload = await adminClient.storage.from(SESSION_PHOTO_BUCKET).upload(path, file, { contentType: file.type, upsert: true });
    if (upload.error) return serverError();
    if (existing) await db.update(sessionPhotos).set({ storagePath: path, filterApplied: undefined, frameId: String(form?.get("frame_id") ?? "").slice(0, 60) || null }).where(eq(sessionPhotos.id, existing.id));
    else await db.insert(sessionPhotos).values({ id: photoId, sessionId: id, storagePath: path, orderIndex, filterApplied: undefined, frameId: String(form?.get("frame_id") ?? "").slice(0, 60) || null });
    const count = (await db.select({ id: sessionPhotos.id }).from(sessionPhotos).where(eq(sessionPhotos.sessionId, id))).length;
    await db.update(sessions).set({ photoCount: count }).where(eq(sessions.id, id));
    return json({ photo_id: photoId, order_index: orderIndex, photo_count: count });
  } catch { await adminClient.storage.from(SESSION_PHOTO_BUCKET).remove([path]); return serverError(); }
}
