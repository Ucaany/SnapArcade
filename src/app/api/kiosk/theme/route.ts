import { eq } from "drizzle-orm";
import { db } from "@/db";
import { kiosks } from "@/db/schema";
import { json, notFound, serverError, unauthorized } from "@/lib/kiosk-api";
import { authenticateKiosk, ownerThemeFallback } from "@/lib/kiosk-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await authenticateKiosk(request);
  if (!auth) return unauthorized();

  try {
    const [kiosk] = await db.select({ theme: kiosks.theme }).from(kiosks).where(eq(kiosks.id, auth.kioskId)).limit(1);
    if (!kiosk) return notFound();
    const theme = (kiosk.theme as Record<string, unknown> | null) ?? (await ownerThemeFallback(auth.ownerId)) ?? {};
    return json({ kiosk_id: auth.kioskId, theme });
  } catch {
    return serverError();
  }
}
