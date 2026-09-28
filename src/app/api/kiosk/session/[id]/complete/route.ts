import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { sessions } from "@/db/schema";
import { badRequest, json, notFound, serverError, unauthorized } from "@/lib/kiosk-api";
import { authenticateKiosk } from "@/lib/kiosk-auth";
import { kioskSession } from "@/lib/kiosk-session";

export const dynamic = "force-dynamic";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateKiosk(request);
  if (!auth) return unauthorized();
  const { id } = await params;
  const session = await kioskSession(id, auth.kioskId, auth.ownerId);
  if (!session || !session.expiresAt || session.expiresAt <= new Date()) return notFound("session_unavailable");
  const body = await request.json().catch(() => ({}));
  if (body?.skip_print !== undefined && typeof body.skip_print !== "boolean") return badRequest();
  try {
    const [updated] = await db.update(sessions).set({ status: "completed", completedAt: new Date() }).where(and(eq(sessions.id, id), eq(sessions.kioskId, auth.kioskId), eq(sessions.status, "paid"))).returning({ id: sessions.id, token: sessions.sessionToken });
    const result = updated ?? { id: session.id, token: session.sessionToken };
    return json({ session_id: result.id, session_token: result.token, qr_url: `/s/${result.token}` });
  } catch { return serverError(); }
}
