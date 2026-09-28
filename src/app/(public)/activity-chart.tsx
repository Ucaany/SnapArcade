"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

const data = [
  { stage: "Alur", sessions: 42 },
  { stage: "Sesi", sessions: 68 },
  { stage: "Mesin", sessions: 54 },
  { stage: "Hasil", sessions: 76 },
];

const config = { sessions: { label: "Aktivitas", color: "#22d3ee" } } satisfies ChartConfig;

export function ActivityChart() {
  return (
    <div aria-label="Grafik ilustrasi aktivitas booth" role="img">
      <ChartContainer className="h-32 w-full" config={config}>
        <BarChart accessibilityLayer data={data} margin={{ left: -22, right: 4, top: 5 }}>
          <CartesianGrid vertical={false} stroke="#0a0a0a" strokeDasharray="3 3" />
          <XAxis axisLine={false} dataKey="stage" tickLine={false} tickMargin={8} />
          <YAxis axisLine={false} domain={[0, 80]} hide tickLine={false} />
          <ChartTooltip content={<ChartTooltipContent hideLabel />} />
          <Bar dataKey="sessions" fill="var(--color-sessions)" radius={0} stroke="#0a0a0a" strokeWidth={2} />
        </BarChart>
      </ChartContainer>
      <p className="mt-2 text-xs font-semibold">Grafik ilustrasi, bukan data operasional aktif.</p>
    </div>
  );
}
