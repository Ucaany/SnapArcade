import { NextResponse } from "next/server";
import { Parser } from "json2csv";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { sessions, transactions } from "@/db/schema";
import { getActor } from "@/lib/server-actions";
import { monthlyPdf } from "@/lib/monthly-pdf";

export const runtime = "nodejs";

function monthRange(value: string | null) {
  const match = value?.match(/^(\d{4})-(\d{2})$/);
  const now = new Date();
  const year = match ? Number(match[1]) : now.getFullYear();
  const month = match ? Number(match[2]) - 1 : now.getMonth();
  return { start: new Date(year, month, 1), end: new Date(year, month + 1, 1), label: `${year}-${String(month + 1).padStart(2, "0")}` };
}

export async function GET(request: Request, { params }: { params: Promise<{ kind: string }> }) {
  const actor = await getActor();
  if (!actor || actor.role !== "owner" || !actor.ownerId) return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  const { kind } = await params;
  const url = new URL(request.url);
const range = monthRange(url.searchParams.get("month"));
  const transactionFilter = and(eq(transactions.ownerId, actor.ownerId), gte(transactions.createdAt, range.start), lt(transactions.createdAt, range.end));
  const sessionFilter = and(eq(sessions.ownerId, actor.ownerId), gte(sessions.startedAt, range.start), lt(sessions.startedAt, range.end));
  const maxRows = 10000;

  if (kind === "transactions") {
    const rows = await db.select().from(transactions).where(transactionFilter).limit(maxRows);
    const csv = new Parser({ fields: ["id", "sessionId", "provider", "method", "amount", "status", "createdAt", "settledAt"] }).parse(rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString(), settledAt: row.settledAt?.toISOString() ?? "" })));
    return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="transaksi-${range.label}.csv"` } });
  }
  if (kind === "sessions") {
    const rows = await db.select().from(sessions).where(sessionFilter).limit(maxRows);
    const safe = (value: string | null) => value && /^[=+\-@]/.test(value) ? `'${value}` : value;
    const csv = new Parser({ fields: ["id", "kioskId", "customerName", "packageName", "photoCount", "amountPaid", "status", "startedAt", "completedAt"] }).parse(rows.map((row) => ({ ...row, customerName: safe(row.customerName), packageName: safe(row.packageName), startedAt: row.startedAt.toISOString(), completedAt: row.completedAt?.toISOString() ?? "" })));
    return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="sesi-${range.label}.csv"` } });
  }
  if (kind === "monthly-pdf") {
    const [trx, sessionCount] = await Promise.all([
      db.select().from(transactions).where(transactionFilter).limit(100),
      db.select({ count: sql<number>`count(*)::int` }).from(sessions).where(sessionFilter),
    ]);
    const buffer = await monthlyPdf(range.label, trx, Number(sessionCount[0]?.count ?? 0));
    return new Response(buffer as BodyInit, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="laporan-bulanan-${range.label}.pdf"` } });
  }
  return NextResponse.json({ error: "Format export tidak dikenal" }, { status: 404 });
}
