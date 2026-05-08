"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  AreaChart,
  Area,
  PieChart,
  Pie,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";

// ── Shared tooltip style ──────────────────────────────────────────────────────
const TT = {
  contentStyle: {
    background: "#1a1a2e",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "8px",
    fontSize: "12px",
  },
  labelStyle:   { color: "#e2e8f0", fontWeight: 600 },
  itemStyle:    { color: "#cbd5e1" },
};

// ── 1. Peak-Time: day-of-week radar chart ─────────────────────────────────
export function DowMiniChart({
  data,
  height = 84,
}: {
  data: { day: string; avg: number; isPeak: boolean }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data} margin={{ top: 16, right: 32, bottom: 16, left: 32 }}>
        <PolarGrid stroke="rgba(255,255,255,0.08)" radialLines={true} />
        <PolarAngleAxis
          dataKey="day"
          tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 13, fontWeight: 500 }}
          tickLine={false}
        />
        <PolarRadiusAxis
          tick={false}
          axisLine={false}
          tickLine={false}
        />
        <Radar
          dataKey="avg"
          stroke="rgba(96,165,250,1)"
          fill="rgba(96,165,250,0.18)"
          strokeWidth={2}
          dot={{ r: 5, fill: "rgba(96,165,250,1)", stroke: "white", strokeWidth: 1 }}
        />
        <Tooltip
          {...TT}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(v: any) => [+v === 0 ? "No activity" : `${Number(v).toFixed(1)} avg`, "Contributions"]}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}

// ── 2. Peak-Time: 7 × 24 activity-probability heatmap (ML) ──────────────
const _DOW_SHORT  = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const _HOURS      = Array.from({ length: 24 }, (_, i) => i);

function probToColor(p: number): { bg: string; glow?: string } {
  const stops = [
    { at: 0.0,  r: 10,  g: 14,  b: 35  },
    { at: 0.25, r: 29,  g: 27,  b: 110 },
    { at: 0.5,  r: 37,  g: 99,  b: 235 },
    { at: 0.75, r: 6,   g: 182, b: 212 },
    { at: 1.0,  r: 186, g: 230, b: 253 },
  ];
  let lo = stops[0], hi = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (p >= stops[i].at && p <= stops[i + 1].at) { lo = stops[i]; hi = stops[i + 1]; break; }
  }
  const t = hi.at === lo.at ? 0 : (p - lo.at) / (hi.at - lo.at);
  const r = Math.round(lo.r + (hi.r - lo.r) * t);
  const g = Math.round(lo.g + (hi.g - lo.g) * t);
  const b = Math.round(lo.b + (hi.b - lo.b) * t);
  const bg = `rgb(${r},${g},${b})`;
  const glow = p > 0.72 ? `0 0 6px rgba(${r},${g},${b},0.7)` : undefined;
  return { bg, glow };
}

export function ActivityHeatmap({ data }: { data: Array<{ d: number; h: number; p: number }> }) {
  const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const c of data) {
    if (c.d >= 0 && c.d < 7 && c.h >= 0 && c.h < 24) grid[c.d][c.h] = c.p;
  }

  return (
    <div className="w-full overflow-x-auto select-none">
      <div style={{ minWidth: 400 }}>
        {/* Hour labels */}
        <div className="flex items-end pb-1" style={{ paddingLeft: 32 }}>
          {_HOURS.map((h) => (
            <div key={h} className="flex-1 text-center" style={{ fontSize: 8, color: "rgba(255,255,255,0.35)" }}>
              {h % 6 === 0 ? `${String(h).padStart(2, "0")}h` : ""}
            </div>
          ))}
        </div>

        {/* Rows */}
        <div className="space-y-[4px]">
          {_DOW_SHORT.map((day, d) => (
            <div key={d} className="flex items-center gap-[3px]">
              <div className="shrink-0 text-right pr-1" style={{ width: 30, fontSize: 9, color: "rgba(255,255,255,0.45)" }}>
                {day}
              </div>
              {_HOURS.map((h) => {
                const p = grid[d][h];
                const { bg, glow } = probToColor(p);
                return (
                  <div
                    key={h}
                    className="flex-1 rounded-[3px] cursor-default transition-transform hover:scale-110"
                    style={{ height: 17, background: bg, boxShadow: glow }}
                    title={`${_DOW_SHORT[d]} ${String(h).padStart(2, "0")}:00 — ${(p * 100).toFixed(0)}%`}
                  />
                );
              })}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-end gap-1.5 pt-2.5">
          <span style={{ fontSize: 8, color: "rgba(255,255,255,0.35)" }}>0%</span>
          <div className="flex h-2 w-28 rounded overflow-hidden">
            {Array.from({ length: 40 }, (_, i) => {
              const { bg } = probToColor(i / 39);
              return <div key={i} className="flex-1" style={{ background: bg }} />;
            })}
          </div>
          <span style={{ fontSize: 8, color: "rgba(255,255,255,0.35)" }}>100%</span>
        </div>
      </div>
    </div>
  );
}

// ── 2b. 7 × 24 grid heatmap — replaces ridge plot ────────────────────────
const _DOW_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function cellColor(p: number, globalMax: number): { bg: string; textColor: string } {
  const norm = globalMax > 0 ? p / globalMax : 0;
  // Dark navy → indigo → violet → cyan gradient
  const stops = [
    { at: 0.00, r: 10,  g: 12,  b: 30,  },
    { at: 0.30, r: 30,  g: 27,  b: 100, },
    { at: 0.55, r: 79,  g: 70,  b: 229, },
    { at: 0.75, r: 99,  g: 102, b: 241, },
    { at: 1.00, r: 139, g: 92,  b: 246, },
  ];
  let lo = stops[0], hi = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (norm >= stops[i].at && norm <= stops[i + 1].at) { lo = stops[i]; hi = stops[i + 1]; break; }
  }
  const t = hi.at === lo.at ? 0 : (norm - lo.at) / (hi.at - lo.at);
  const r = Math.round(lo.r + (hi.r - lo.r) * t);
  const g = Math.round(lo.g + (hi.g - lo.g) * t);
  const b = Math.round(lo.b + (hi.b - lo.b) * t);
  return {
    bg: `rgb(${r},${g},${b})`,
    textColor: norm > 0.6 ? "rgba(255,255,255,0.9)" : "transparent",
  };
}

export function ClockHeatmap({ data }: { data: Array<{ d: number; h: number; p: number }> }) {
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null);

  const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const c of data) {
    if (c.d >= 0 && c.d < 7 && c.h >= 0 && c.h < 24) grid[c.d][c.h] = c.p;
  }

  const globalMax = Math.max(...grid.flat(), 0.01);

  // Find peak cell per row
  const peakHours = grid.map((row) => row.indexOf(Math.max(...row)));

  return (
    <div className="w-full select-none" onMouseLeave={() => setTip(null)}>
      {/* Hour labels */}
      <div className="flex items-end pb-1.5" style={{ paddingLeft: 36 }}>
        {Array.from({ length: 24 }, (_, h) => (
          <div key={h} className="flex-1 text-center" style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>
            {h % 6 === 0 ? `${String(h).padStart(2, "0")}h` : ""}
          </div>
        ))}
      </div>

      {/* Grid rows */}
      <div className="space-y-[5px]">
        {_DOW_LABELS.map((day, d) => (
          <div key={d} className="flex items-center gap-[4px]">
            {/* Day label */}
            <div className="shrink-0 text-right pr-1.5" style={{ width: 34, fontSize: 10, color: "rgba(255,255,255,0.5)", fontWeight: 500 }}>
              {day}
            </div>
            {/* Hour cells */}
            {Array.from({ length: 24 }, (_, h) => {
              const p   = grid[d][h];
              const { bg } = cellColor(p, globalMax);
              const isPeak = peakHours[d] === h;
              return (
                <div
                  key={h}
                  className="flex-1 rounded-[3px] cursor-default transition-all duration-150 hover:scale-[1.15] hover:z-10 relative"
                  style={{
                    height: 22,
                    background: bg,
                    outline: isPeak ? "1.5px solid rgba(167,139,250,0.8)" : "none",
                    outlineOffset: isPeak ? "1px" : "0",
                    boxShadow: isPeak ? "0 0 8px rgba(139,92,246,0.5)" : "none",
                  }}
                  onMouseEnter={(e) => setTip({
                    x: e.clientX,
                    y: e.clientY,
                    text: `${day} ${String(h).padStart(2, "0")}:00 — ${(p * 100).toFixed(0)}%${isPeak ? " ★ peak" : ""}`,
                  })}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer: hour labels bottom + legend */}
      <div className="flex items-center justify-between mt-2 pt-1" style={{ paddingLeft: 36 }}>
        <div className="flex items-center gap-4 text-[9px]" style={{ color: "rgba(255,255,255,0.3)" }}>
          <span>00h  midnight</span>
          <span>06h  morning</span>
          <span>12h  noon</span>
          <span>18h  evening</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>Low</span>
          <div className="flex h-2 w-20 rounded overflow-hidden">
            {Array.from({ length: 30 }, (_, i) => {
              const { bg } = cellColor(i / 29 * globalMax, globalMax);
              return <div key={i} className="flex-1" style={{ background: bg }} />;
            })}
          </div>
          <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>High</span>
          <span className="ml-2 flex items-center gap-1" style={{ fontSize: 9, color: "rgba(167,139,250,0.7)" }}>
            <span className="inline-block w-3 h-3 rounded-[2px]" style={{ outline: "1.5px solid rgba(167,139,250,0.8)", background: "transparent" }} />
            Peak
          </span>
        </div>
      </div>

      {/* Tooltip */}
      {tip && (
        <div
          className="fixed z-50 px-2.5 py-1.5 rounded-lg text-xs text-white pointer-events-none whitespace-nowrap"
          style={{ left: tip.x + 14, top: tip.y - 36, background: "#1a1a2e", border: "1px solid rgba(167,139,250,0.25)", boxShadow: "0 4px 16px rgba(0,0,0,0.5)" }}
        >
          {tip.text}
        </div>
      )}
    </div>
  );
}

// ── 3. Peak-Time: gradient bar chart by hour of day (ML) ─────────────────
export function HourAreaChart({
  data,
  height = 110,
}: {
  data: Array<{ hour: number; label: string; prob: number; isPeak: boolean }>;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} barSize={7} margin={{ left: 0, right: 0, top: 6, bottom: 0 }}>
        <XAxis
          dataKey="hour"
          tickFormatter={(v) => (v % 6 === 0 ? `${String(v).padStart(2, "0")}h` : "")}
          tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 9 }}
          axisLine={false}
          tickLine={false}
          interval={0}
        />
        <YAxis hide domain={[0, 1]} />
        <Tooltip
          {...TT}
          cursor={{ fill: "rgba(96,165,250,0.06)" }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(v: any) => [`${(Number(v) * 100).toFixed(0)}%`, "Activity probability"]}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          labelFormatter={(l: any) => `${String(l).padStart(2, "0")}:00`}
        />
        <Bar dataKey="prob" radius={[3, 3, 0, 0]}>
          {data.map((entry, i) => {
            const { bg } = probToColor(entry.prob);
            return <Cell key={i} fill={bg} />;
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── 4. Top recommended sessions panel ────────────────────────────────────
export function TopSlotsPanel({
  slots,
}: {
  slots: Array<{ day: string; hour: number; hour_label: string; confidence: number }>;
}) {
  const maxConf = Math.max(...slots.map((s) => s.confidence), 1);
  return (
    <div className="space-y-1.5">
      {slots.map((slot, i) => (
        <div
          key={i}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-white/[0.03] border border-white/[0.05]"
        >
          <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px] font-bold text-blue-400 shrink-0">
            {i + 1}
          </div>
          <div className="flex-1 min-w-0 space-y-0.5">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-medium text-foreground/85">{slot.day}</span>
              <span className="text-xs font-bold text-blue-400 tabular-nums">{slot.confidence.toFixed(0)}%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground tabular-nums">{slot.hour_label}</span>
              <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-500/80"
                  style={{ width: `${(slot.confidence / maxConf) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── 5. SHAP factor bar chart ──────────────────────────────────────────────
export function ShapFactorsChart({
  factors,
}: {
  factors: Array<{ label: string; delta: number; sub: string }>;
}) {
  const maxAbs = Math.max(...factors.map((f) => Math.abs(f.delta)), 1);
  return (
    <div className="space-y-2">
      {factors.map((f, i) => (
        <div key={i} className="space-y-0.5">
          <div className="flex items-center justify-between" style={{ fontSize: 10 }}>
            <span className="text-muted-foreground truncate mr-2">{f.label}</span>
            <span
              className="tabular-nums font-medium shrink-0"
              style={{ color: f.delta >= 0 ? "#60a5fa" : "#f87171" }}
            >
              {f.delta >= 0 ? "+" : ""}{f.delta}
            </span>
          </div>
          {/* Bidirectional bar centred at 0 */}
          <div className="flex h-1.5 gap-[1px]">
            <div className="flex-1 flex justify-end overflow-hidden rounded-l-full bg-white/[0.06]">
              {f.delta < 0 && (
                <div
                  className="h-full rounded-l-full bg-red-400/70"
                  style={{ width: `${(Math.abs(f.delta) / maxAbs) * 100}%` }}
                />
              )}
            </div>
            <div className="w-px bg-muted-foreground/20 shrink-0" />
            <div className="flex-1 overflow-hidden rounded-r-full bg-white/[0.06]">
              {f.delta > 0 && (
                <div
                  className="h-full rounded-r-full bg-blue-500/70"
                  style={{ width: `${(f.delta / maxAbs) * 100}%` }}
                />
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── 6. Peak-Time: hour-of-day bar chart (simple, kept for fallback) ───────
export function HourMiniChart({
  data,
  height = 84,
}: {
  data: { hour: number; label: string; prob: number; isPeak: boolean }[];
  height?: number;
}) {
  // Show a tick label every 6 hours (0, 6, 12, 18)
  const tickFormatter = (v: number) => (v % 6 === 0 ? `${String(v).padStart(2, "0")}h` : "");
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} barSize={7} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
        <XAxis
          dataKey="hour"
          tickFormatter={tickFormatter}
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }}
          axisLine={false}
          tickLine={false}
          interval={0}
        />
        <YAxis hide domain={[0, 1]} />
        <Tooltip
          {...TT}
          cursor={{ fill: "rgba(96,165,250,0.07)" }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(v: any) => [`${(Number(v) * 100).toFixed(0)}%`, "Activity probability"]}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          labelFormatter={(l: any) => `${String(l).padStart(2, "0")}:00`}
        />
        <Bar dataKey="prob" radius={[3, 3, 0, 0]}>
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.isPeak ? "rgba(96,165,250,1)" : "rgba(96,165,250,0.22)"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── 3. Growth Trajectory: weekly sparkline ────────────────────────────────
export function GrowthSparkline({
  data,
  color,
  height = 72,
}: {
  data: { week: string; count: number }[];
  color: string;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
        <defs>
          <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0.0}  />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="week"
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis hide />
        <Tooltip
          {...TT}
          cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: "4 2" }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(v: any) => [Number(v).toLocaleString(), "Contributions"]}
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke={color}
          strokeWidth={2}
          fill="url(#sparkFill)"
          dot={false}
          activeDot={{ r: 3, fill: color, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── 3. Weak Topics: horizontal coverage bar chart ─────────────────────────
const STATUS_FILL: Record<string, string> = {
  good:   "rgba(34,197,94,0.8)",
  rare:   "rgba(245,158,11,0.8)",
  unseen: "rgba(239,68,68,0.55)",
};

export function TopicCoverageChart({
  data,
}: {
  data: { topic: string; count: number; status: "good" | "rare" | "unseen" }[];
}) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <ResponsiveContainer width="100%" height={data.length * 26 + 12}>
      <BarChart
        data={data}
        layout="vertical"
        barSize={10}
        margin={{ left: 0, right: 28, top: 0, bottom: 0 }}
      >
        <XAxis type="number" domain={[0, maxCount]} hide />
        <YAxis
          type="category"
          dataKey="topic"
          width={138}
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          {...TT}
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(v: any) => [
            Number(v) === 0 ? "Not attempted" : `${Number(v)} solved`,
            "Problems",
          ]}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} background={{ fill: "rgba(255,255,255,0.04)", radius: 4 }}>
          {data.map((entry, i) => (
            <Cell key={i} fill={STATUS_FILL[entry.status] ?? STATUS_FILL.unseen} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── 4. Submission Success: donut chart ────────────────────────────────────
export function SuccessDonut({
  accepted,
  total,
}: {
  accepted: number;
  total: number;
}) {
  if (total === 0) return null;
  const failed = total - accepted;
  const donutData = [
    { name: "Accepted", value: accepted, fill: "#22c55e" },
    { name: "Not Accepted", value: Math.max(failed, 0), fill: "#f97316" },
  ];

  return (
    <ResponsiveContainer width="100%" height={140}>
      <PieChart>
        <Pie
          data={donutData}
          cx="50%"
          cy="60%"
          innerRadius={38}
          outerRadius={56}
          paddingAngle={failed === 0 ? 0 : 3}
          dataKey="value"
          startAngle={90}
          endAngle={-270}
        >
          {donutData.map((entry, i) => (
            <Cell key={i} fill={entry.fill} stroke="transparent" />
          ))}
        </Pie>
        <Tooltip
          {...TT}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(v: any) => [Number(v), "submissions"]}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}