import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { kioskPackages, sessions, voucherRedemptions, vouchers } from "@/db/schema";
import { badRequest, conflict, json, serverError, unauthorized } from "@/lib/kiosk-api";
import { authenticateKiosk } from "@/lib/kiosk-auth";
import { generateSessionToken, SESSION_TTL_MS } from "@/lib/kiosk-session";
import { computeVoucherDiscount } from "@/lib/voucher";

export const dynamic = "force-dynamic";
const schema = z.object({ package_id: z.string().uuid(), customer_name: z.string().trim().min(1).max(150).optional(), customer_email: z.string().email().max(255).optional(), payment_state: z.enum(["paid", "voucher"]), voucher_code: z.string().trim().min(1).max(50).optional() }).strict();

export async function POST(request: Request) {
  const auth = await authenticateKiosk(request);
  if (!auth) return unauthorized();
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest();
  try {
    const result = await db.transaction(async (tx) => {
      const pack = (await tx.select({ id: kioskPackages.id, name: kioskPackages.name, photoCount: kioskPackages.photoCount, priceIdr: kioskPackages.priceIdr }).from(kioskPackages).where(and(eq(kioskPackages.id, parsed.data.package_id), eq(kioskPackages.ownerId, auth.ownerId), eq(kioskPackages.isActive, true))).limit(1))[0];
      if (!pack) return { error: "package_unavailable" as const };

      let voucher: typeof vouchers.$inferSelect | undefined;
      let discountAmount = 0;
      let amountPaid = pack.priceIdr;
      if (parsed.data.payment_state === "voucher") {
        if (!parsed.data.voucher_code) return { error: "voucher_invalid" as const };
        const voucherCode = parsed.data.voucher_code.toUpperCase();
        const now = new Date();
        voucher = (await tx.select().from(vouchers).where(and(eq(vouchers.ownerId, auth.ownerId), eq(vouchers.code, voucherCode), eq(vouchers.isActive, true), sql`${vouchers.validFrom} <= ${now}`, sql`(${vouchers.validUntil} is null or ${vouchers.validUntil} > ${now})`, sql`${vouchers.usedCount} < ${vouchers.maxUses}`)).for("update").limit(1))[0];
        if (!voucher) return { error: "voucher_invalid" as const };
        ({ discountAmount, finalPrice: amountPaid } = computeVoucherDiscount(pack.priceIdr, voucher.type, Number(voucher.value)));
      }

      const token = generateSessionToken();
      const row = (await tx.insert(sessions).values({ ownerId: auth.ownerId, kioskId: auth.kioskId, sessionToken: token, customerName: parsed.data.customer_name, customerEmail: parsed.data.customer_email, packageId: pack.id, packageName: pack.name, photoCount: 0, status: voucher ? "paid" : "pending", voucherId: voucher?.id, amountPaid, expiresAt: new Date(Date.now() + SESSION_TTL_MS) }).returning({ id: sessions.id }))[0];
      if (voucher) {
        await tx.insert(voucherRedemptions).values({ voucherId: voucher.id, sessionId: row.id, ownerId: auth.ownerId, discountAmount });
        await tx.update(vouchers).set({ usedCount: sql`${vouchers.usedCount} + 1` }).where(eq(vouchers.id, voucher.id));
      }
      return { row, token, pack, amountPaid, discountAmount, voucherType: voucher?.type };
    });
    if ("error" in result && result.error) return conflict(result.error);
    return json({ session_id: result.row.id, session_token: result.token, photo_count: result.pack.photoCount, package: result.pack, amount_paid: result.amountPaid, discount_amount: result.discountAmount, voucher_type: result.voucherType });
  } catch { return serverError(); }
}
