"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type DataPoint = {
  date: string;
  count: number;
};

type Props = {
  data: DataPoint[];
  color?: string;
  label?: string;
};

export function ActivityAreaChart({ data, color = "hsl(265 89% 58%)", label = "Contributions" }: Props) {
  // Aggregate by week for a readable chart
  const weekly = data.reduce<Record<string, number>>((acc, d) => {
    const date = new Date(d.date + "T00:00:00");
    // Get the Monday of that week
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));
    const key = monday.toISOString().split("T")[0];
    acc[key] = (acc[key] ?? 0) + d.count;
    return acc;
  }, {});

  const chartData = Object.entries(weekly)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-26) // last 26 weeks
    .map(([date, count]) => ({
      week: new Date(date + "T00:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      count,
    }));

  return (
    <ResponsiveContainer width="100%" height={160}>
      <AreaChart data={chartData} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.5} />
            <stop offset="95%" stopColor={color} stopOpacity={0.0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis
          dataKey="week"
          tick={{ fontSize: 10, fill: "hsl(240 5% 55%)" }}
          interval="preserveStartEnd"
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "hsl(240 5% 55%)" }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{
            background: "rgba(15, 15, 20, 0.85)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "12px",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
            backdropFilter: "blur(12px)",
            fontSize: 12,
            padding: "12px",
          }}
          labelStyle={{ color: "rgba(255, 255, 255, 0.9)", fontWeight: 600, marginBottom: "4px" }}
          itemStyle={{ color: color, fontWeight: 500 }}
          formatter={(value: unknown) => [Number(value), label]}
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke={color}
          strokeWidth={3}
          fill="url(#areaGradient)"
          dot={false}
          activeDot={{ r: 5, fill: color, stroke: "#111", strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
