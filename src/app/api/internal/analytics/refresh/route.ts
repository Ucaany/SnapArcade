import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = process.env.NOTIFICATION_CRON_SECRET;
  const authorization = request.headers.get("authorization") ?? "";
  const supplied = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const valid = !!secret && Buffer.byteLength(secret) === Buffer.byteLength(supplied) && timingSafeEqual(Buffer.from(secret), Buffer.from(supplied));
  if (!valid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    await db.execute(sql`refresh materialized view concurrently monthly_owner_analytics`);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "refresh_failed" }, { status: 500 });
  }
}
