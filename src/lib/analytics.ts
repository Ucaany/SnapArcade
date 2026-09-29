import "server-only";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { sessions, transactions } from "@/db/schema";

const paid = eq(transactions.status, "settlement");

function dayStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export async function loadOwnerAnalytics(ownerId: string, now = new Date()) {
  const today = dayStart(now);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const rangeStart = new Date(today);
  rangeStart.setDate(rangeStart.getDate() - 29);

  const [todayRevenue, monthRevenue, totalSessions, dailyRevenue] = await Promise.all([
    db.select({ value: sql<number>`coalesce(sum(${transactions.amount}), 0)::int` }).from(transactions).where(and(eq(transactions.ownerId, ownerId), paid, gte(transactions.createdAt, today), lt(transactions.createdAt, tomorrow))),
    db.select({ value: sql<number>`coalesce(sum(${transactions.amount}), 0)::int` }).from(transactions).where(and(eq(transactions.ownerId, ownerId), paid, gte(transactions.createdAt, monthStart), lt(transactions.createdAt, nextMonth))),
    db.select({ value: sql<number>`count(*)::int` }).from(sessions).where(and(eq(sessions.ownerId, ownerId), gte(sessions.startedAt, monthStart), lt(sessions.startedAt, nextMonth))),
    db.select({ day: sql<string>`date_trunc('day', ${transactions.createdAt})::date::text`, revenue: sql<number>`coalesce(sum(${transactions.amount}), 0)::int` }).from(transactions).where(and(eq(transactions.ownerId, ownerId), paid, gte(transactions.createdAt, rangeStart), lt(transactions.createdAt, tomorrow))).groupBy(sql`date_trunc('day', ${transactions.createdAt})`).orderBy(sql`date_trunc('day', ${transactions.createdAt})`),
  ]);

  const revenueByDay = new Map(dailyRevenue.map((row) => [row.day, Number(row.revenue)]));
  const chart = Array.from({ length: 30 }, (_, index) => {
    const date = new Date(rangeStart);
    date.setDate(rangeStart.getDate() + index);
    const key = date.toISOString().slice(0, 10);
    return { day: key, revenue: revenueByDay.get(key) ?? 0 };
  });

  return {
    todayRevenue: Number(todayRevenue[0]?.value ?? 0),
    monthRevenue: Number(monthRevenue[0]?.value ?? 0),
    totalSessions: Number(totalSessions[0]?.value ?? 0),
    chart,
  };
}
