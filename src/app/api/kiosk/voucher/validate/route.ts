import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { vouchers } from "@/db/schema";
import { badRequest, json, serverError, unauthorized } from "@/lib/kiosk-api";
import { authenticateKiosk } from "@/lib/kiosk-auth";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ code: z.string().trim().min(1).max(50) }).strict();

export async function POST(request: Request) {
  const auth = await authenticateKiosk(request);
  if (!auth) return unauthorized();

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest();
  const code = parsed.data.code.toUpperCase();

  try {
    const now = new Date();
    const [voucher] = await db
      .select({ id: vouchers.id, type: vouchers.type, value: vouchers.value, maxUses: vouchers.maxUses, usedCount: vouchers.usedCount })
      .from(vouchers)
      .where(
        and(
          eq(vouchers.ownerId, auth.ownerId),
          eq(vouchers.code, code),
          eq(vouchers.isActive, true),
          sql`${vouchers.validFrom} <= ${now}`,
          sql`(${vouchers.validUntil} is null or ${vouchers.validUntil} > ${now})`,
          sql`${vouchers.usedCount} < ${vouchers.maxUses}`,
        ),
      )
      .limit(1);

    if (!voucher) return json({ valid: false }, 200);
    return json({ valid: true, voucher_id: voucher.id, type: voucher.type, value: Number(voucher.value) });
  } catch {
    return serverError();
  }
}
