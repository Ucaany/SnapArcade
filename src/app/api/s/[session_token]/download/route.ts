import { and, eq, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { sessions } from "@/db/schema";
import { json, notFound, serverError } from "@/lib/kiosk-api";
import { MAX_DOWNLOADS, publicSession, signedPhotoUrls } from "@/lib/kiosk-session";

export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ session_token: string }> }) {
  const token = (await params).session_token;
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return notFound();
  const session = await publicSession(token);
  if (!session) return notFound();
  try {
    const [claimed] = await db.update(sessions).set({ downloadCount: sql`${sessions.downloadCount} + 1` }).where(and(eq(sessions.id, session.id), eq(sessions.status, "completed"), lt(sessions.downloadCount, MAX_DOWNLOADS))).returning({ id: sessions.id, downloadCount: sessions.downloadCount });
    if (!claimed) return json({ error: "download_limit_reached" }, 429);
    try { return json({ photos: await signedPhotoUrls(claimed.id), downloads_remaining: MAX_DOWNLOADS - claimed.downloadCount }); }
    catch { await db.update(sessions).set({ downloadCount: sql`${sessions.downloadCount} - 1` }).where(eq(sessions.id, session.id)); return serverError(); }
  } catch { return serverError(); }
}
