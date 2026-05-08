"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from "recharts";

type TopicData = {
  topic: string;
  count: number;
};

type Props = {
  data: TopicData[];
  color?: string;
};

export function TopicsChart({ data, color = "#10b981" }: Props) {
  // Show top 10 topics
  const chartData = data.slice(0, 10).reverse(); // Reverse so highest is at the top in vertical layout

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 10, right: 30, left: 10, bottom: 20 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="rgba(255,255,255,0.05)" />
        <XAxis type="number" hide />
        <YAxis 
          dataKey="topic" 
          type="category" 
          axisLine={false} 
          tickLine={false} 
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
          width={100}
        />
        <Tooltip
          cursor={{ fill: "rgba(255, 255, 255, 0.05)" }}
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            borderColor: "hsl(var(--border))",
            borderRadius: "8px",
            fontSize: "12px",
          }}
          itemStyle={{ color: "hsl(var(--foreground))" }}
          formatter={(value: number) => [<span style={{ color, fontWeight: 'bold' }}>{value}</span>, "Solved"]}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20} fill={color}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
