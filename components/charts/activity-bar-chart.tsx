"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

type DataPoint = {
  date: string;
  count: number;
  platform?: string; // We'll make it optional but gracefully handle it
};

type Props = {
  data: DataPoint[];
};

const PLATFORM_COLORS: Record<string, string> = {
  github: "#3b82f6",     // Vibrant Blue
  leetcode: "#fbbf24",   // Vibrant Amber
  codeforces: "#ef4444", // Vibrant Red
  codechef: "#8b5cf6",   // Vibrant Purple
  unknown: "#6b7280",    // Gray
};

export function ActivityBarChart({ data }: Props) {
  // Aggregate by week, tracking each platform's count separately
  const weekly = data.reduce<Record<string, Record<string, number>>>((acc, d) => {
    const date = new Date(d.date + "T00:00:00");
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));
    const key = monday.toISOString().split("T")[0];
    
    if (!acc[key]) {
      acc[key] = {
        github: 0,
        leetcode: 0,
        codeforces: 0,
        codechef: 0,
        total: 0
      };
    }
    
    const p = d.platform || "unknown";
    acc[key][p] = (acc[key][p] ?? 0) + d.count;
    acc[key].total += d.count;
    
    return acc;
  }, {});

  const chartData = Object.entries(weekly)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12) // Show last 12 weeks for better bar thickness
    .map(([date, platforms]) => ({
      week: new Date(date + "T00:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      ...platforms,
    }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={chartData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis
          dataKey="week"
          tick={{ fontSize: 10, fill: "hsl(240 5% 55%)" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "hsl(240 5% 55%)" }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          cursor={{ fill: "rgba(255, 255, 255, 0.05)" }}
          contentStyle={{
            background: "rgba(15, 15, 20, 0.85)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "12px",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
            backdropFilter: "blur(12px)",
            fontSize: 12,
            padding: "12px",
          }}
          labelStyle={{ color: "rgba(255, 255, 255, 0.9)", fontWeight: 600, marginBottom: "8px" }}
          itemStyle={{ paddingTop: "2px", paddingBottom: "2px", fontWeight: 500 }}
        />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: "8px" }} iconType="circle" />
        <Bar dataKey="github" stackId="a" fill={PLATFORM_COLORS.github} name="GitHub" radius={[2, 2, 2, 2]} />
        <Bar dataKey="leetcode" stackId="a" fill={PLATFORM_COLORS.leetcode} name="LeetCode" radius={[2, 2, 2, 2]} />
        <Bar dataKey="codeforces" stackId="a" fill={PLATFORM_COLORS.codeforces} name="Codeforces" radius={[2, 2, 2, 2]} />
        <Bar dataKey="codechef" stackId="a" fill={PLATFORM_COLORS.codechef} name="CodeChef" radius={[2, 2, 2, 2]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
