import "server-only";
import { randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { kiosks, sessions, sessionPhotos } from "@/db/schema";
import { adminClient } from "@/lib/supabase/admin";

export const SESSION_PHOTO_BUCKET = process.env.SESSION_PHOTO_BUCKET ?? "session-photos";
export const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
export const QR_TTL_SECONDS = 7 * 24 * 60 * 60;
export const MAX_DOWNLOADS = 20;

export function generateSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function storagePath(ownerId: string, sessionId: string, photoId: string, extension: "jpg" | "png") {
  return `${ownerId}/${sessionId}/${photoId}.${extension}`;
}

export async function kioskSession(id: string, kioskId: string, ownerId: string) {
  const [row] = await db.select().from(sessions).where(and(eq(sessions.id, id), eq(sessions.kioskId, kioskId), eq(sessions.ownerId, ownerId))).limit(1);
  return row ?? null;
}

export async function publicSession(token: string) {
  const [row] = await db.select().from(sessions).where(and(eq(sessions.sessionToken, token), eq(sessions.status, "completed"), gt(sessions.expiresAt, new Date()))).limit(1);
  return row ?? null;
}

export async function signedPhotoUrls(sessionId: string, expiresIn = QR_TTL_SECONDS) {
  const photos = await db.select().from(sessionPhotos).where(eq(sessionPhotos.sessionId, sessionId));
  const result = await Promise.all(photos.map(async (photo) => {
    const { data, error } = await adminClient.storage.from(SESSION_PHOTO_BUCKET).createSignedUrl(photo.storagePath, expiresIn);
    if (error || !data?.signedUrl) throw new Error("storage_sign_failed");
    return { id: photo.id, order_index: photo.orderIndex, url: data.signedUrl, is_final_strip: photo.isFinalStrip };
  }));
  return result;
}
