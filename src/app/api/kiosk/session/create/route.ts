import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { kioskPackages, sessions } from "@/db/schema";
import { badRequest, conflict, json, serverError, unauthorized } from "@/lib/kiosk-api";
import { authenticateKiosk } from "@/lib/kiosk-auth";
import { generateSessionToken, SESSION_TTL_MS } from "@/lib/kiosk-session";

export const dynamic = "force-dynamic";
const schema = z.object({ package_id: z.string().uuid(), customer_name: z.string().trim().min(1).max(150).optional(), customer_email: z.string().email().max(255).optional(), amount_paid: z.number().int().nonnegative(), payment_state: z.enum(["paid", "voucher"]), voucher_id: z.string().uuid().optional() }).strict();

export async function POST(request: Request) {
  const auth = await authenticateKiosk(request);
  if (!auth) return unauthorized();
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest();
  try {
    const pack = (await db.select({ id: kioskPackages.id, name: kioskPackages.name, photoCount: kioskPackages.photoCount, priceIdr: kioskPackages.priceIdr }).from(kioskPackages).where(and(eq(kioskPackages.id, parsed.data.package_id), eq(kioskPackages.ownerId, auth.ownerId), eq(kioskPackages.isActive, true))).limit(1))[0];
    if (!pack) return conflict("package_unavailable");
    const token = generateSessionToken();
    const row = (await db.insert(sessions).values({ ownerId: auth.ownerId, kioskId: auth.kioskId, sessionToken: token, customerName: parsed.data.customer_name, customerEmail: parsed.data.customer_email, packageId: pack.id, packageName: pack.name, photoCount: 0, status: "paid", voucherId: parsed.data.voucher_id, amountPaid: parsed.data.amount_paid, expiresAt: new Date(Date.now() + SESSION_TTL_MS) }).returning({ id: sessions.id }))[0];
    return json({ session_id: row.id, session_token: token, photo_count: pack.photoCount, package: pack });
  } catch { return serverError(); }
}
