import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { kiosks } from "@/db/schema";
import { badRequest, json, serverError, unauthorized } from "@/lib/kiosk-api";
import { authenticateKiosk, loadSubscription } from "@/lib/kiosk-auth";

export const dynamic = "force-dynamic";

const deviceInfoFull = z.object({
  os: z.string().max(100),
  model: z.string().max(100),
  appVersion: z.string().max(50),
  cameraConnected: z.boolean(),
  printerConnected: z.boolean(),
});
const deviceInfoSchema = deviceInfoFull.partial().strict();

export async function GET(request: Request) {
  const auth = await authenticateKiosk(request);
  if (!auth) return unauthorized();

  const url = new URL(request.url);
  const rawDevice = url.searchParams.get("device_info");
  let deviceInfo: z.infer<typeof deviceInfoFull> | null = null;
  if (rawDevice) {
    const parsed = deviceInfoSchema.safeParse(JSON.parse(rawDevice));
    if (!parsed.success) return badRequest();
    deviceInfo = {
      os: parsed.data.os ?? "",
      model: parsed.data.model ?? "",
      appVersion: parsed.data.appVersion ?? "",
      cameraConnected: parsed.data.cameraConnected ?? false,
      printerConnected: parsed.data.printerConnected ?? false,
    };
  }

  try {
    const [kiosk] = await db
      .select({ sessionLimit: kiosks.sessionLimit, sessionsToday: kiosks.sessionsToday })
      .from(kiosks)
      .where(eq(kiosks.id, auth.kioskId))
      .limit(1);
    if (!kiosk) return unauthorized();

    await db
      .update(kiosks)
      .set(deviceInfo ? { lastPingAt: new Date(), status: "online", deviceInfo } : { lastPingAt: new Date(), status: "online" })
      .where(eq(kiosks.id, auth.kioskId));


    const sub = await loadSubscription(auth.ownerId);
    const kioskRemaining = Math.max(0, kiosk.sessionLimit - kiosk.sessionsToday);
    const ownerRemaining = sub
      ? Math.max(0, sub.includedSessions + sub.addOnSessions - sub.sessionsUsed)
      : 0;

    return json({
      kiosk_id: auth.kioskId,
      status: "online",
      session_capacity: { kiosk_remaining: kioskRemaining, owner_remaining: ownerRemaining },
    });
  } catch {
    return serverError();
  }
}

export function POST() {
  return badRequest("method_not_allowed");
}
