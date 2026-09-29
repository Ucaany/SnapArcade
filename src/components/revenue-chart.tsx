"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function RevenueChart({ data }: { data: { day: string; revenue: number }[] }) {
  return <Card><CardHeader><CardTitle>Pendapatan 30 hari</CardTitle></CardHeader><CardContent><div className="h-64 w-full">{data.every((item) => item.revenue === 0) ? <p className="flex h-full items-center justify-center text-sm text-muted-foreground">Belum ada pendapatan pada periode ini.</p> : <ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 8 }}><CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="day" tickFormatter={(value: string) => value.slice(5)} minTickGap={24} /><YAxis tickFormatter={(value: number) => `Rp ${Math.round(value / 1000)}k`} width={64} /><Tooltip formatter={(value) => [`Rp ${Number(value ?? 0).toLocaleString("id-ID")}`, "Pendapatan"]} labelFormatter={(value) => `Tanggal ${value}`} /><Line type="monotone" dataKey="revenue" stroke="var(--primary)" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer>}</div></CardContent></Card>;
}
