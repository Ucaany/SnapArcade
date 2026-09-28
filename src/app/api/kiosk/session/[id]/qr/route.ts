import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sessions } from "@/db/schema";
import { json, notFound, serverError, unauthorized } from "@/lib/kiosk-api";
import { authenticateKiosk } from "@/lib/kiosk-auth";
import { kioskSession, MAX_DOWNLOADS, QR_TTL_SECONDS } from "@/lib/kiosk-session";

export const dynamic = "force-dynamic";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateKiosk(request);
  if (!auth) return unauthorized();
  const session = await kioskSession((await params).id, auth.kioskId, auth.ownerId);
  if (!session || session.status !== "completed") return notFound("session_unavailable");
  try { return json({ qr_url: `/s/${session.sessionToken}`, expires_at: session.expiresAt, signed_url_ttl_seconds: QR_TTL_SECONDS, downloads_remaining: Math.max(0, MAX_DOWNLOADS - session.downloadCount) }); } catch { return serverError(); }
}
