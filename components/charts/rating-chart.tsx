"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from "recharts";

type DataPoint = {
  contestName: string;
  rating: number;
  contestDate: number;
  rank?: number;
};

type Props = {
  data: DataPoint[];
  color?: string;
};

export function RatingChart({ data, color = "hsl(217 91% 60%)" }: Props) {
  // Sort data by date just in case
  const sortedData = [...data].sort((a, b) => a.contestDate - b.contestDate);
  
  const chartData = sortedData.map((d) => {
    const date = new Date(d.contestDate * 1000);
    return {
      name: d.contestName,
      shortDate: date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" }),
      rating: d.rating,
      rank: d.rank,
    };
  });

  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis
          dataKey="shortDate"
          tick={{ fontSize: 10, fill: "hsl(240 5% 55%)" }}
          minTickGap={40}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          domain={['dataMin - 100', 'dataMax + 100']}
          tick={{ fontSize: 10, fill: "hsl(240 5% 55%)" }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{
            background: "rgba(15, 15, 20, 0.9)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "8px",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
            backdropFilter: "blur(12px)",
            fontSize: 12,
            padding: "12px",
          }}
          labelStyle={{ color: "rgba(255, 255, 255, 0.9)", fontWeight: 600, marginBottom: "8px" }}
          itemStyle={{ color: "#fff", fontWeight: 500 }}
          labelFormatter={(label, entries) => {
            const entry = entries[0]?.payload;
            return entry ? `${entry.shortDate} - ${entry.name}` : label;
          }}
          formatter={(value: any, name: any, props: any) => {
            if (name === "rating") return [`${value} (Rank: ${props.payload.rank || '-'})`, "Rating"];
            return [value as any, name as any];
          }}
        />
        <Line
          type="monotone"
          dataKey="rating"
          stroke={color}
          strokeWidth={3}
          dot={{ r: 3, fill: color, strokeWidth: 0 }}
          activeDot={{ r: 6, fill: color, stroke: "#111", strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}