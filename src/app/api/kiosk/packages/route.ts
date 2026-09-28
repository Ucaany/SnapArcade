import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { kioskPackages } from "@/db/schema";
import { json, serverError, unauthorized } from "@/lib/kiosk-api";
import { authenticateKiosk } from "@/lib/kiosk-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await authenticateKiosk(request);
  if (!auth) return unauthorized();

  try {
    const packages = await db
      .select({
        id: kioskPackages.id,
        name: kioskPackages.name,
        description: kioskPackages.description,
        photoCount: kioskPackages.photoCount,
        copyCount: kioskPackages.copyCount,
        priceIdr: kioskPackages.priceIdr,
        orderIndex: kioskPackages.orderIndex,
      })
      .from(kioskPackages)
      .where(and(eq(kioskPackages.ownerId, auth.ownerId), eq(kioskPackages.isActive, true)))
      .orderBy(asc(kioskPackages.orderIndex));
    return json({ packages });
  } catch {
    return serverError();
  }
}
