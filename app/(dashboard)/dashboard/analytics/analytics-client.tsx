"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import {
  TrendingUp,
  TrendingDown,
  Flame,
  Calendar,
  Target,
  Award,
  Zap,
  BarChart3,
  Activity,
  Brain,
  Sparkles,
  Clock,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  ChevronUp,
  ChevronDown,
  Minus,
  Code2,
  Trophy,
  ArrowUpRight,
  ArrowDownRight,
  Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

// ── Chart imports (SSR disabled) ─────────────────────────────────────────────
const HeatmapCalendar = dynamic(
  () => import("@/components/charts/heatmap-calendar").then((m) => m.HeatmapCalendar),
  { ssr: false, loading: () => <Skeleton className="h-32 w-full rounded-lg" /> }
);
const ActivityBarChart = dynamic(
  () => import("@/components/charts/activity-bar-chart").then((m) => m.ActivityBarChart),
  { ssr: false, loading: () => <Skeleton className="h-40 w-full rounded-lg" /> }
);
const DowMiniChart = dynamic(
  () => import("@/components/charts/ml-insight-charts").then((m) => m.DowMiniChart),
  { ssr: false, loading: () => <Skeleton className="h-20 w-full rounded" /> }
);
const ClockHeatmap = dynamic(
  () => import("@/components/charts/ml-insight-charts").then((m) => m.ClockHeatmap),
  { ssr: false, loading: () => <Skeleton className="h-72 w-full rounded" /> }
);
const HourAreaChart = dynamic(
  () => import("@/components/charts/ml-insight-charts").then((m) => m.HourAreaChart),
  { ssr: false, loading: () => <Skeleton className="h-28 w-full rounded" /> }
);
const TopSlotsPanel = dynamic(
  () => import("@/components/charts/ml-insight-charts").then((m) => m.TopSlotsPanel),
  { ssr: false, loading: () => <Skeleton className="h-24 w-full rounded" /> }
);
const ShapFactorsChart = dynamic(
  () => import("@/components/charts/ml-insight-charts").then((m) => m.ShapFactorsChart),
  { ssr: false, loading: () => <Skeleton className="h-20 w-full rounded" /> }
);
const TopicCoverageChart = dynamic(
  () => import("@/components/charts/ml-insight-charts").then((m) => m.TopicCoverageChart),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full rounded" /> }
);
const SuccessDonut = dynamic(
  () => import("@/components/charts/ml-insight-charts").then((m) => m.SuccessDonut),
  { ssr: false, loading: () => <Skeleton className="h-32 w-full rounded" /> }
);

// ── Types ─────────────────────────────────────────────────────────────────────
type MlPeakTimeData = {
  peak_days:        string[];
  peak_hours:       number[];
  confidence:       number;
  schedule:         string;
  behavior_cluster: string;
  dow_chart_data:   Array<{ day: string; prob: number; isPeak: boolean }>;
  hour_chart_data:  Array<{ hour: number; label: string; prob: number; isPeak: boolean }>;
  grid_data:        Array<{ d: number; h: number; p: number }>;
  recommendation: {
    best_next: { day: string; hour: number; hour_label: string; confidence: number } | null;
    top_3:     Array<{ day: string; hour: number; hour_label: string; confidence: number }>;
  };
  explanation: {
    factors: Array<{ label: string; delta: number; sub: string }>;
  };
  momentum?: {
    trend:              "up" | "down" | "stable";
    change_pct:         number;
    recent_active_days: number;
    older_active_days:  number;
    label:              string;
  };
  consistency?: {
    score:      number;
    label:      string;
    weekly_avg: number;
  };
  next_week_forecast?: Array<{
    date:       string;
    day:        string;
    day_short:  string;
    prob:       number;
    confidence: number;
  }>;
  streak_survival?: {
    current_streak:  number;
    survival_7d:     number;
    survival_3d:     number;
    risk_label:      string;
    weakest_day:     { day: string; date: string; prob: number } | null;
    daily_survival:  Array<{
      date:             string;
      day:              string;
      day_short:        string;
      daily_prob:       number;
      cumulative_prob:  number;
    }>;
  };
  contest_readiness?: {
    score:          number;
    label:          string;
    recommendation: string;
    components:     Record<string, { score: number; max: number; label: string }>;
  };
  model_version: string;
};

type Snapshot = {
  date: string;
  count: number;
  platform: "github" | "leetcode" | "codeforces" | "codechef";
  metadata: unknown;
};

type Platform = {
  platform: "github" | "leetcode" | "codeforces" | "codechef";
  handle: string;
  rating: number | null;
  rank: string | null;
  problemsSolved: number | null;
  metadata: Record<string, unknown> | null;
};

type Props = {
  platforms:   Platform[];
  snapshots:   Snapshot[];
  dbError:     string | null;
  mlPeakTime?: MlPeakTimeData | null;
};

// ── Constants ─────────────────────────────────────────────────────────────────
const PLATFORM_COLORS: Record<string, string> = {
  github:     "hsl(210, 100%, 60%)",
  leetcode:   "hsl(38, 92%, 55%)",
  codeforces: "hsl(0, 72%, 55%)",
  codechef:   "hsl(38, 80%, 45%)",
};

const PLATFORM_LABELS: Record<string, string> = {
  github:     "GitHub",
  leetcode:   "LeetCode",
  codeforces: "Codeforces",
  codechef:   "CodeChef",
};

const DOW_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const ACCENT       = "rgba(139, 92, 246, 1)";
const ACCENT_MUTED = "rgba(139, 92, 246, 0.3)";

const TOOLTIP_STYLE = {
  background: "#1a1a2e",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "8px",
  fontSize: "12px",
};
const TOOLTIP_LABEL_STYLE = { color: "#e2e8f0", fontWeight: 600 };
const TOOLTIP_ITEM_STYLE  = { color: "#cbd5e1" };

const CORE_TOPICS = [
  { name: "Dynamic Programming", match: ["dynamic programming", "dp"] },
  { name: "Graph",               match: ["graph"] },
  { name: "Tree",                match: ["tree", "binary tree"] },
  { name: "Backtracking",        match: ["backtracking"] },
  { name: "Binary Search",       match: ["binary search"] },
  { name: "Heap / Priority Q",   match: ["heap", "priority queue"] },
  { name: "Trie",                match: ["trie"] },
  { name: "Union Find",          match: ["union find", "disjoint set"] },
  { name: "Segment Tree",        match: ["segment tree"] },
  { name: "Bit Manipulation",    match: ["bit manipulation"] },
  { name: "Sliding Window",      match: ["sliding window"] },
  { name: "Monotonic Stack",     match: ["monotonic stack"] },
  { name: "Divide & Conquer",    match: ["divide and conquer"] },
  { name: "Topological Sort",    match: ["topological sort"] },
];

// ── Animation variants ────────────────────────────────────────────────────────
const stagger = { show: { transition: { staggerChildren: 0.07 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.19, 1, 0.22, 1] as [number, number, number, number] },
  },
};

// ── Probability gauge (SVG + Framer Motion) ───────────────────────────────────
function ProbabilityGauge({ value, size = "md" }: { value: number; size?: "sm" | "md" }) {
  const r = 42;
  const color =
    value >= 70 ? "#22c55e" : value >= 45 ? "#f59e0b" : "#ef4444";
  const maxW = size === "sm" ? "160px" : "200px";

  return (
    <div className="flex justify-center">
      <svg viewBox="-58 -54 116 65" className="w-full" style={{ maxWidth: maxW }}>
        <path
          d={`M -${r} 0 A ${r} ${r} 0 0 1 ${r} 0`}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <motion.path
          d={`M -${r} 0 A ${r} ${r} 0 0 1 ${r} 0`}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          pathLength={100}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: value }}
          transition={{ duration: 1.2, ease: [0.19, 1, 0.22, 1] }}
        />
        <text x="0" y="-7" textAnchor="middle" fill={color} fontSize="22" fontWeight="bold" fontFamily="inherit">
          {value}%
        </text>
        <text x="0" y="9" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="8" fontFamily="inherit">
          PROBABILITY
        </text>
        <text x={-r - 7} y="13" textAnchor="middle" fill="rgba(255,255,255,0.18)" fontSize="7">0</text>
        <text x={r + 7}  y="13" textAnchor="middle" fill="rgba(255,255,255,0.18)" fontSize="7">100</text>
      </svg>
    </div>
  );
}

// ── Stat pill ──────────────────────────────────────────────────────────────────
function StatPill({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="flex flex-col items-center px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
      <span className="text-base font-bold tabular-nums" style={{ color }}>{value}</span>
      <span className="text-[10px] text-muted-foreground mt-0.5 text-center leading-tight">{label}</span>
    </div>
  );
}

// ── Factor row ─────────────────────────────────────────────────────────────────
function FactorRow({ label, delta, sub }: { label: string; delta: number; sub?: string }) {
  const positive = delta > 0;
  return (
    <div className="flex items-center justify-between text-xs py-1 border-b border-white/[0.04] last:border-0">
      <div>
        <span className="text-foreground/80">{label}</span>
        {sub && <span className="text-muted-foreground ml-1.5">· {sub}</span>}
      </div>
      <span
        className="font-semibold tabular-nums flex items-center gap-0.5 shrink-0 ml-2"
        style={{ color: positive ? "#22c55e" : "#ef4444" }}
      >
        {positive ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        {Math.abs(delta)}
      </span>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export function AnalyticsClient({ platforms, snapshots, dbError, mlPeakTime = null }: Props) {

  // ── Core stats ──────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const dayTotals: Record<string, number> = {};
    for (const s of snapshots) dayTotals[s.date] = (dayTotals[s.date] || 0) + s.count;

    const bestEntry = Object.entries(dayTotals).sort((a, b) => b[1] - a[1])[0];

    const activeSorted = Object.entries(dayTotals).filter(([, c]) => c > 0).map(([d]) => d).sort();
    let longest = 0, cur = 0, prev: string | null = null;
    for (const d of activeSorted) {
      if (prev) {
        const diff = (new Date(d + "T00:00:00").getTime() - new Date(prev + "T00:00:00").getTime()) / 86400000;
        cur = diff === 1 ? cur + 1 : 1;
      } else cur = 1;
      if (cur > longest) longest = cur;
      prev = d;
    }

    let currentStreak = 0;
    const cursor = new Date();
    for (;;) {
      const d = cursor.toISOString().split("T")[0];
      if (!dayTotals[d]) break;
      currentStreak++;
      cursor.setDate(cursor.getDate() - 1);
    }

    const platformTotals: Record<string, number> = {};
    for (const s of snapshots) platformTotals[s.platform] = (platformTotals[s.platform] || 0) + s.count;
    const total = Object.values(platformTotals).reduce((a, b) => a + b, 0);
    const platformData = Object.entries(platformTotals)
      .sort((a, b) => b[1] - a[1])
      .map(([p, count]) => ({
        name:  PLATFORM_LABELS[p] ?? p,
        count,
        pct:   total > 0 ? Math.round((count / total) * 100) : 0,
        color: PLATFORM_COLORS[p] ?? "#8b5cf6",
      }));

    const dowTotals = Array(7).fill(0), dowActive = Array(7).fill(0);
    for (const [date, count] of Object.entries(dayTotals)) {
      const idx = (new Date(date + "T00:00:00").getDay() + 6) % 7;
      dowTotals[idx] += count;
      if (count > 0) dowActive[idx]++;
    }
    const dowData = DOW_LABELS.map((label, i) => ({
      day: label,
      avg: dowActive[i] > 0 ? +(dowTotals[i] / dowActive[i]).toFixed(1) : 0,
    }));

    const monthMap: Record<string, number> = {};
    for (const s of snapshots) {
      const m = s.date.substring(0, 7);
      monthMap[m] = (monthMap[m] || 0) + s.count;
    }
    const monthlyData = Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([m, count]) => ({
        month: new Date(m + "-01").toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        count,
      }));

    const now = Date.now();
    const activeDays30 = Object.entries(dayTotals).filter(
      ([d, c]) => c > 0 && (now - new Date(d + "T00:00:00").getTime()) / 86400000 <= 30
    ).length;
    const activeDays90 = Object.entries(dayTotals).filter(
      ([d, c]) => c > 0 && (now - new Date(d + "T00:00:00").getTime()) / 86400000 <= 90
    ).length;

    return {
      bestDayCount:   bestEntry?.[1] ?? 0,
      bestDayDate:    bestEntry?.[0] ?? null,
      longestStreak:  longest,
      currentStreak,
      platformData,
      mostActive:     platformData[0]?.name ?? null,
      dowData,
      peakAvg:        Math.max(...dowData.map((d) => d.avg)),
      monthlyData,
      lastMonthIdx:   monthlyData.length - 1,
      activeDays30,
      activeDays90,
      consistency30:  Math.round((activeDays30 / 30) * 100),
    };
  }, [snapshots]);

  // ── ML Predictions ──────────────────────────────────────────────────────────
  const ml = useMemo(() => {
    const now = Date.now();

    const dayTotals: Record<string, number> = {};
    for (const s of snapshots) dayTotals[s.date] = (dayTotals[s.date] || 0) + s.count;

    const activeDaysIn = (n: number) =>
      Object.entries(dayTotals).filter(
        ([d, c]) => c > 0 && (now - new Date(d + "T00:00:00").getTime()) / 86400000 <= n
      ).length;

    const sumRange = (fromDaysAgo: number, toDaysAgo: number) =>
      Object.entries(dayTotals)
        .filter(([d]) => {
          const diff = (now - new Date(d + "T00:00:00").getTime()) / 86400000;
          return diff >= toDaysAgo && diff <= fromDaysAgo;
        })
        .reduce((s, [, c]) => s + c, 0);

    let currentStreak = 0;
    const cs = new Date();
    for (;;) {
      const d = cs.toISOString().split("T")[0];
      if (!dayTotals[d]) break;
      currentStreak++;
      cs.setDate(cs.getDate() - 1);
    }

    // ── 1. PEAK TIME ──────────────────────────────────────────────────────────
    const dowT = Array(7).fill(0), dowA = Array(7).fill(0), dowMax = Array(7).fill(0);
    for (const [date, count] of Object.entries(dayTotals)) {
      const idx = (new Date(date + "T00:00:00").getDay() + 6) % 7;
      dowT[idx] += count;
      if (count > 0) { dowA[idx]++; if (count > dowMax[idx]) dowMax[idx] = count; }
    }
    const dowAvgs = DOW_LABELS.map((name, i) => ({
      name, avg: dowA[i] > 0 ? dowT[i] / dowA[i] : 0, activations: dowA[i], best: dowMax[i],
    }));
    const sortedDow  = [...dowAvgs].sort((a, b) => b.avg - a.avg);
    const peakDays   = sortedDow.filter((d) => d.avg > 0).slice(0, 2);
    const globalAvg  = dowAvgs.reduce((s, d) => s + d.avg, 0) / 7;
    const peakConf   = peakDays.length > 0 && globalAvg > 0
      ? Math.min(95, Math.round((peakDays[0].avg / globalAvg - 1) * 80 + 55))
      : 30;

    const wdSum = dowT.slice(0, 5).reduce((a, b) => a + b, 0);
    const weSum = dowT.slice(5).reduce((a, b) => a + b, 0);
    const wdDays = dowA.slice(0, 5).reduce((a, b) => a + b, 0);
    const weDays = dowA.slice(5).reduce((a, b) => a + b, 0);
    const scheduleLabel =
      wdSum > weSum * 2.5 ? "Weekday-focused" :
      weSum > wdSum * 1.5 ? "Weekend coder"   : "Balanced schedule";

    const peakDayNames = new Set(peakDays.map((d) => d.name));
    const dowChartData = DOW_LABELS.map((name, i) => ({
      day:    name,
      avg:    dowA[i] > 0 ? +(dowT[i] / dowA[i]).toFixed(1) : 0,
      isPeak: peakDayNames.has(name),
    }));

    // Total active days and contribution counts
    const totalActiveDays = Object.values(dayTotals).filter((c) => c > 0).length;
    const totalContribs   = Object.values(dayTotals).reduce((a, b) => a + b, 0);
    const overallDailyAvg = totalActiveDays > 0 ? totalContribs / totalActiveDays : 0;

    // Best consecutive week
    let bestWeekCount = 0;
    for (let w = 0; w < 52; w++) {
      const c = sumRange((w + 1) * 7, w * 7);
      if (c > bestWeekCount) bestWeekCount = c;
    }

    const peakTime = {
      peakDays:        peakDays.map((d) => d.name),
      peakAvgContribs: peakDays[0] ? +peakDays[0].avg.toFixed(1) : 0,
      peakActivations: peakDays[0] ? peakDays[0].activations : 0,
      peakBestDay:     peakDays[0] ? peakDays[0].best : 0,
      confidence:      peakConf,
      schedule:        scheduleLabel,
      dowChartData,
      globalAvg:       +overallDailyAvg.toFixed(1),
      wdDays,
      weDays,
      wdTotal:         wdSum,
      weTotal:         weSum,
      bestWeekCount,
      totalActiveDays,
      factors: [
        peakDays.length > 0
          ? `Peak on ${peakDays.map((d) => d.name).join(" & ")} — ${peakDays[0] ? peakDays[0].avg.toFixed(1) : 0}× avg`
          : "Insufficient data",
        scheduleLabel,
        `${wdDays} weekday sessions · ${weDays} weekend sessions`,
        `Overall avg ${overallDailyAvg.toFixed(1)} contributions / active day`,
        bestWeekCount > 0 ? `Best single week: ${bestWeekCount} contributions` : "No weekly data",
      ] as string[],
    };

    // ── 2. WEAK TOPIC DETECTION ───────────────────────────────────────────────
    const lcProfile  = platforms.find((p) => p.platform === "leetcode");
    const lcMeta     = (lcProfile?.metadata ?? {}) as Record<string, unknown>;
    const topicDist  = (lcMeta.topicWiseDistribution ?? {}) as Record<string, number>;
    const easySolved   = (lcMeta.easySolved   as number) ?? 0;
    const mediumSolved = (lcMeta.mediumSolved as number) ?? 0;
    const hardSolved   = (lcMeta.hardSolved   as number) ?? 0;
    const totalSolvedLC = easySolved + mediumSolved + hardSolved;

    const weakTopics: Array<{ name: string; severity: "unseen" | "rare" }> = [];
    const topicCoverage = CORE_TOPICS.map((topic) => {
      const matchedKey = Object.keys(topicDist).find(
        (k) => topic.match.some((m) => k.toLowerCase().includes(m))
      );
      const count = matchedKey ? (topicDist[matchedKey] ?? 0) : 0;
      const status: "good" | "rare" | "unseen" =
        count === 0 ? "unseen" : count < 5 ? "rare" : "good";
      if (status !== "good") weakTopics.push({ name: topic.name, severity: status });
      return { topic: topic.name, count, status };
    });

    const goodCount   = topicCoverage.filter((t) => t.status === "good").length;
    const rareCount   = topicCoverage.filter((t) => t.status === "rare").length;
    const unseenCount = topicCoverage.filter((t) => t.status === "unseen").length;
    const coveragePct = Math.round((goodCount / CORE_TOPICS.length) * 100);

    // Most practiced topic overall
    const topTopic = Object.entries(topicDist).sort((a, b) => b[1] - a[1])[0];

    // Difficulty ratio
    const diffRatio = totalSolvedLC > 0
      ? `${Math.round((easySolved / totalSolvedLC) * 100)}% E · ${Math.round((mediumSolved / totalSolvedLC) * 100)}% M · ${Math.round((hardSolved / totalSolvedLC) * 100)}% H`
      : null;

    const weakTopic = {
      items:          weakTopics.slice(0, 6),
      topicCoverage,
      totalSolved:    Object.keys(topicDist).length,
      hasLeetCode:    !!lcProfile,
      problemsSolved: lcProfile?.problemsSolved ?? 0,
      easySolved,
      mediumSolved,
      hardSolved,
      totalSolvedLC,
      goodCount,
      rareCount,
      unseenCount,
      coveragePct,
      topTopic:       topTopic ? { name: topTopic[0], count: topTopic[1] } : null,
      diffRatio,
    };

    // ── 3. SOLVE PROBABILITY ──────────────────────────────────────────────────
    let score = 50;
    const factors: Array<{ label: string; delta: number; sub?: string }> = [];

    // Streak bonuses
    if (currentStreak >= 1)  { score += 10; factors.push({ label: "Active streak",   delta: +10, sub: `${currentStreak}d` }); }
    if (currentStreak >= 7)  { score += 7;  factors.push({ label: "7+ day streak",   delta: +7 }); }
    if (currentStreak >= 30) { score += 5;  factors.push({ label: "30+ day streak",  delta: +5 }); }

    // Recent activity
    const a7 = activeDaysIn(7);
    if (a7 >= 4) {
      const b = a7 * 3;
      score += b;
      factors.push({ label: "Recent intensity", delta: b, sub: `${a7}/7 active days` });
    }

    const yest = new Date(now - 86400000).toISOString().split("T")[0];
    if (dayTotals[yest]) { score += 7; factors.push({ label: "Active yesterday", delta: +7 }); }

    // Trend
    const last14 = sumRange(14, 0), prev14 = sumRange(28, 15);
    if (prev14 > 0 && last14 > prev14) {
      score += 5;
      factors.push({ label: "Upward 2-week trend", delta: +5, sub: `+${Math.round(((last14 - prev14) / prev14) * 100)}%` });
    }

    // Consistency bonus
    const con30 = Math.round((activeDaysIn(30) / 30) * 100);
    if (con30 >= 70) { score += 8; factors.push({ label: "High consistency", delta: +8, sub: `${con30}% active` }); }
    else if (con30 >= 50) { score += 4; factors.push({ label: "Moderate consistency", delta: +4, sub: `${con30}%` }); }

    // LeetCode hard solved bonus
    if (hardSolved >= 20)  { score += 6; factors.push({ label: "Hard problem mastery", delta: +6, sub: `${hardSolved} solved` }); }
    else if (hardSolved >= 5) { score += 3; factors.push({ label: "Hard problems attempted", delta: +3, sub: `${hardSolved} solved` }); }

    // Gap penalty
    let gap = 0;
    const gc = new Date();
    while (gap < 60) {
      if (dayTotals[gc.toISOString().split("T")[0]] > 0) break;
      gap++;
      gc.setDate(gc.getDate() - 1);
    }
    if      (gap >= 14) { score -= 25; factors.push({ label: "Extended inactivity", delta: -25, sub: `${gap}d gap` }); }
    else if (gap >= 7)  { score -= 15; factors.push({ label: "Inactive week",        delta: -15, sub: `${gap}d gap` }); }
    else if (gap >= 3)  { score -= 8;  factors.push({ label: "Recent gap",           delta: -8,  sub: `${gap}d` }); }

    // Weekend penalty if today is Mon/Tue and user is weekday-focused
    const todayDow = (new Date().getDay() + 6) % 7;
    const isLowDow = wdSum > weSum * 2.5 && (todayDow === 5 || todayDow === 6);
    if (isLowDow) { score -= 5; factors.push({ label: "Low-activity day pattern", delta: -5 }); }

    const solveProbability = {
      probability:   Math.min(95, Math.max(10, Math.round(score))),
      factors,
      currentStreak,
      con30,
      a7,
      gap,
      last14,
      prev14,
    };

    // ── 4. GROWTH TRAJECTORY ─────────────────────────────────────────────────
    const last30 = sumRange(30, 0);
    const prev30 = sumRange(60, 31);
    const last7  = sumRange(7, 0);
    const prev7  = sumRange(14, 8);

    type TKey = "accelerating" | "growing" | "consistent" | "slowing" | "attention" | "new" | "none";
    let key: TKey; let changePercent = 0; let trajLabel: string;
    let trajColor: string; let trajEmoji: string;

    if (last30 === 0 && prev30 === 0) {
      key = "none"; trajLabel = "No Activity";      trajColor = "#6b7280"; trajEmoji = "⏸️";
    } else if (prev30 === 0) {
      key = "new";  trajLabel = "Getting Started";  trajColor = "#22c55e"; trajEmoji = "🌱"; changePercent = 100;
    } else {
      changePercent = Math.round(((last30 - prev30) / prev30) * 100);
      if      (changePercent > 50)   { key = "accelerating"; trajLabel = "Accelerating";   trajColor = "#22c55e"; trajEmoji = "🚀"; }
      else if (changePercent > 10)   { key = "growing";      trajLabel = "Growing";         trajColor = "#38bdf8"; trajEmoji = "📈"; }
      else if (changePercent >= -10) { key = "consistent";   trajLabel = "Consistent";      trajColor = "#8b5cf6"; trajEmoji = "🔄"; }
      else if (changePercent >= -50) { key = "slowing";      trajLabel = "Slowing Down";    trajColor = "#f59e0b"; trajEmoji = "📉"; }
      else                           { key = "attention";    trajLabel = "Needs Attention"; trajColor = "#ef4444"; trajEmoji = "⚠️"; }
    }

    // Weekly sparkline: last 12 weeks, oldest first
    const weeklyTrend: { week: string; count: number }[] = [];
    for (let w = 11; w >= 0; w--) {
      const from = (w + 1) * 7, to = w * 7;
      weeklyTrend.push({
        week:  new Date(now - from * 86400000).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        count: sumRange(from, to),
      });
    }

    // Projected next 30 days
    const growthRate   = prev30 > 0 ? (last30 - prev30) / prev30 : 0;
    const projected30  = Math.round(last30 * (1 + growthRate * 0.6)); // dampened projection

    // Weekly momentum
    const weekChange = prev7 > 0 ? Math.round(((last7 - prev7) / prev7) * 100) : 0;
    const peakWeek   = weeklyTrend.reduce((mx, w) => w.count > mx ? w.count : mx, 0);
    const avgWeekly  = weeklyTrend.length > 0
      ? Math.round(weeklyTrend.reduce((s, w) => s + w.count, 0) / weeklyTrend.length)
      : 0;

    const growth = {
      key, label: trajLabel, color: trajColor, emoji: trajEmoji,
      changePercent, last30, prev30, last7, prev7, weekChange,
      weeklyTrend, projected30, peakWeek, avgWeekly,
    };

    // ── 5. SUBMISSION SUCCESS ─────────────────────────────────────────────────
    type Sub = { statusDisplay: string; title: string; lang?: string; timestamp?: string | number };
    const recentSubs = (lcMeta.recentSubmissions ?? []) as Sub[];
    let successRate = 0; let basis = "activity patterns"; let accepted = 0;

    // Language distribution
    const langMap: Record<string, number> = {};
    // Problem frequency (for repeated attempts)
    const problemAttempts: Record<string, { total: number; accepted: number }> = {};

    if (recentSubs.length > 0) {
      accepted    = recentSubs.filter((s) => s.statusDisplay === "Accepted").length;
      successRate = Math.round((accepted / recentSubs.length) * 100);
      basis       = `${recentSubs.length} recent submissions`;

      for (const sub of recentSubs) {
        if (sub.lang) langMap[sub.lang] = (langMap[sub.lang] || 0) + 1;
        if (sub.title) {
          if (!problemAttempts[sub.title]) problemAttempts[sub.title] = { total: 0, accepted: 0 };
          problemAttempts[sub.title].total++;
          if (sub.statusDisplay === "Accepted") problemAttempts[sub.title].accepted++;
        }
      }
    } else {
      const con = Math.round((activeDaysIn(30) / 30) * 100);
      successRate = Math.min(88, Math.round(38 + con * 0.52));
      basis       = "activity consistency";
    }
    if (currentStreak >= 7) successRate = Math.min(95, successRate + 5);

    // Top languages
    const topLangs = Object.entries(langMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([lang, count]) => ({ lang, count, pct: Math.round((count / recentSubs.length) * 100) }));

    // Problems attempted more than once (retry problems)
    const retryProblems = Object.entries(problemAttempts)
      .filter(([, v]) => v.total > 1 && v.accepted === 0)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 3)
      .map(([title, v]) => ({ title, attempts: v.total }));

    // Non-accepted submissions for detail
    const failedSubs = recentSubs
      .filter((s) => s.statusDisplay !== "Accepted")
      .slice(0, 3);

    // Status breakdown
    const statusMap: Record<string, number> = {};
    for (const sub of recentSubs) {
      statusMap[sub.statusDisplay] = (statusMap[sub.statusDisplay] || 0) + 1;
    }
    const topFailStatus = Object.entries(statusMap)
      .filter(([k]) => k !== "Accepted")
      .sort((a, b) => b[1] - a[1])[0];

    // Unique problems
    const uniqueProblems = Object.keys(problemAttempts).length;

    const submission = {
      successRate:    Math.min(95, Math.max(10, successRate)),
      accepted,
      total:          recentSubs.length,
      basis,
      hasData:        recentSubs.length > 0,
      failed:         failedSubs,
      topLangs,
      retryProblems,
      topFailStatus:  topFailStatus ? { status: topFailStatus[0], count: topFailStatus[1] } : null,
      uniqueProblems,
    };

    return { peakTime, weakTopic, solveProbability, growth, submission };
  }, [snapshots, platforms]);

  // ── Render ──────────────────────────────────────────────────────────────────
  const isEmpty     = snapshots.length === 0;
  const heatmapData = snapshots.map((s) => ({ date: s.date, count: s.count }));
  const activityData = snapshots.map((s) => ({ date: s.date, count: s.count, platform: s.platform }));

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {dbError && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm flex items-center gap-2"
          >
            <Zap className="h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">Database Sync Issue</p>
              <p className="opacity-80">{dbError}</p>
            </div>
          </motion.div>
        )}

        {/* Header */}
        <motion.div variants={stagger} initial="hidden" animate="show"
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <motion.div variants={fadeUp}>
            <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
            <p className="text-sm text-muted-foreground mt-1">Deep dive into your coding activity patterns</p>
          </motion.div>
          <motion.div variants={fadeUp}>
            <Badge variant="outline" className="text-xs">Last 12 months</Badge>
          </motion.div>
        </motion.div>

        {/* Key stats */}
        <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Best single day",    value: stats.bestDayCount.toLocaleString(),
              sub: stats.bestDayDate ? new Date(stats.bestDayDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—",
              icon: Award,     color: "hsl(265, 89%, 58%)" },
            { label: "Longest streak",     value: `${stats.longestStreak}d`,
              sub: `Current: ${stats.currentStreak}d`,
              icon: Flame,     color: "hsl(38, 92%, 55%)" },
            { label: "Most active platform", value: stats.mostActive ?? "—",
              sub: stats.platformData[0] ? `${stats.platformData[0].count.toLocaleString()} contributions` : "No data yet",
              icon: Target,    color: "hsl(186, 85%, 50%)" },
            { label: "30-day consistency", value: `${stats.consistency30}%`,
              sub: `${stats.activeDays30} of 30 active days`,
              icon: TrendingUp, color: "hsl(120, 60%, 40%)" },
          ].map((stat) => (
            <motion.div key={stat.label} variants={fadeUp}>
              <Card className="border-border/50 bg-card/50">
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <stat.icon className="h-3.5 w-3.5" style={{ color: stat.color }} />
                  </div>
                  <p className="text-2xl font-bold truncate" style={{ color: stat.color }}>{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-1 truncate">{stat.sub}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Heatmap */}
        <motion.div variants={fadeUp} initial="hidden" animate="show">
          <Card className="border-border/50 bg-card/50 overflow-x-auto">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  Contribution Activity
                </CardTitle>
                <Badge variant="outline" className="text-xs">All platforms</Badge>
              </div>
            </CardHeader>
            <CardContent className="pb-5">
              <HeatmapCalendar data={heatmapData} />
            </CardContent>
          </Card>
        </motion.div>


        {/* Day-of-week + Platform breakdown */}
        {!isEmpty && (
          <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <motion.div variants={fadeUp}>
              <Card className="border-border/50 bg-card/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Day-of-Week Activity</CardTitle>
                  <p className="text-xs text-muted-foreground">Average contributions per active weekday</p>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={stats.dowData} barSize={28} margin={{ left: -10, right: 8 }}>
                      <XAxis dataKey="day" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} itemStyle={TOOLTIP_ITEM_STYLE}
                        cursor={{ fill: "rgba(139,92,246,0.08)" }}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        formatter={(v: any) => [v, "Avg contributions"]}
                      />
                      <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
                        {stats.dowData.map((entry, i) => (
                          <Cell key={i} fill={entry.avg === stats.peakAvg && entry.avg > 0 ? ACCENT : ACCENT_MUTED} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={fadeUp}>
              <Card className="border-border/50 bg-card/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Platform Breakdown</CardTitle>
                  <p className="text-xs text-muted-foreground">Contribution share by platform</p>
                </CardHeader>
                <CardContent className="space-y-3 pt-2">
                  {stats.platformData.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No platform data yet</p>
                  ) : (
                    stats.platformData.map((p) => (
                      <div key={p.name} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium">{p.name}</span>
                          <span className="text-muted-foreground tabular-nums">{p.count.toLocaleString()} · {p.pct}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${p.pct}%` }}
                            transition={{ duration: 0.8, ease: [0.19, 1, 0.22, 1] }}
                            className="h-full rounded-full" style={{ background: p.color }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}

        {/* Consistency summary */}
        {!isEmpty && (
          <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Active days — last 30", value: stats.activeDays30, of: 30,   color: "hsl(186, 85%, 50%)" },
              { label: "Active days — last 90", value: stats.activeDays90, of: 90,   color: "hsl(265, 89%, 58%)" },
              { label: "Longest streak ever",   value: stats.longestStreak, of: null, suffix: "days", color: "hsl(38, 92%, 55%)" },
            ].map((item) => (
              <motion.div key={item.label} variants={fadeUp}>
                <Card className="border-border/50 bg-card/50">
                  <CardContent className="pt-5 pb-4">
                    <p className="text-xs text-muted-foreground mb-3">{item.label}</p>
                    <div className="flex items-end gap-1">
                      <span className="text-3xl font-bold" style={{ color: item.color }}>{item.value}</span>
                      {item.of !== null && <span className="text-sm text-muted-foreground mb-1">/ {item.of} days</span>}
                      {"suffix" in item && item.suffix && <span className="text-sm text-muted-foreground mb-1">{item.suffix}</span>}
                    </div>
                    {item.of !== null && (
                      <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${Math.round((item.value / item.of) * 100)}%` }}
                          transition={{ duration: 0.8, ease: [0.19, 1, 0.22, 1] }}
                          className="h-full rounded-full" style={{ background: item.color }}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* ━━━━━━━━━━━━━━━━━━━━  ML INSIGHTS  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {!isEmpty && (
          <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">

            {/* Section header */}
            <motion.div variants={fadeUp} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-violet-400" />
                <h2 className="text-lg font-semibold">ML Insights</h2>
              </div>
              <Badge className="text-xs bg-violet-500/10 text-violet-400 border border-violet-500/20 flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                {mlPeakTime ? "ML Powered" : "Heuristic Analysis"}
              </Badge>
            </motion.div>

            {/* ① Peak Time ─ full width */}
            <motion.div variants={fadeUp}>
              <Card className="border-border/50 bg-card/50 relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-blue-500 to-cyan-400" />
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-400" />
                      Peak Time Prediction
                    </CardTitle>
                    <Badge variant="outline" className="text-xs text-blue-400 border-blue-400/30">
                      {mlPeakTime ? `ML · ${mlPeakTime.confidence}%` : `${ml.peakTime.confidence}% confidence`}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {mlPeakTime ? (
                    /* ── ML-powered rich view ────────────────────────────────── */
                    <div className="space-y-6">

                      {/* Row 1: clock heatmap — full width */}
                      {mlPeakTime.grid_data?.length === 168 && (
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                            <Activity className="h-3 w-3 text-blue-400/70" />
                            Activity probability by hour — all 7 days
                          </p>
                          <ClockHeatmap data={mlPeakTime.grid_data} />
                        </div>
                      )}

                      {/* Row 2: charts (left) + stats (right) */}
                      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

                        {/* Left — hour area chart + dow bar chart */}
                        <div className="lg:col-span-2 space-y-5">
                          <div className="space-y-2">
                            <p className="text-xs text-muted-foreground uppercase tracking-wider">Activity probability by hour of day</p>
                            <HourAreaChart data={mlPeakTime.hour_chart_data} height={150} />
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-full bg-blue-400 ring-2 ring-white/20" />
                                Peak hours
                              </span>
                              <span className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-full bg-blue-400/25" />
                                Other hours
                              </span>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <p className="text-xs text-muted-foreground uppercase tracking-wider">Average contributions by day of week</p>
                            <DowMiniChart data={ml.peakTime.dowChartData} height={320} />
                          </div>
                        </div>

                        {/* Right — exact peak time hero + supporting details */}
                        <div className="lg:col-span-3 space-y-4">

                          {/* ── Exact Peak Time — hero card ── */}
                          {mlPeakTime.recommendation.best_next && (
                            <div className="relative p-5 rounded-2xl overflow-hidden border border-blue-500/25 bg-gradient-to-br from-blue-600/12 via-indigo-600/8 to-cyan-600/8">
                              {/* ambient glow */}
                              <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-20 blur-3xl bg-blue-500 pointer-events-none" />
                              <div className="relative space-y-3">
                                <div className="flex items-center gap-2">
                                  <Zap className="h-3.5 w-3.5 text-blue-400" />
                                  <p className="text-[10px] text-blue-300/70 uppercase tracking-widest font-semibold">Predicted peak time</p>
                                </div>

                                {/* Big time display */}
                                <div className="flex items-end gap-4 flex-wrap">
                                  <div>
                                    <p className="text-5xl font-bold tabular-nums leading-none text-white tracking-tight">
                                      {mlPeakTime.recommendation.best_next.hour_label}
                                    </p>
                                    <p className="text-xl font-semibold text-blue-300 mt-1">
                                      {mlPeakTime.recommendation.best_next.day}
                                    </p>
                                  </div>
                                  {/* Confidence ring */}
                                  <div className="flex flex-col items-center gap-1 pb-1">
                                    <div className="relative">
                                      <svg viewBox="0 0 56 56" className="w-14 h-14 -rotate-90">
                                        <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
                                        <motion.circle
                                          cx="28" cy="28" r="22"
                                          fill="none" stroke="#60a5fa" strokeWidth="6"
                                          strokeLinecap="round"
                                          strokeDasharray={`${2 * Math.PI * 22}`}
                                          initial={{ strokeDashoffset: 2 * Math.PI * 22 }}
                                          animate={{ strokeDashoffset: 2 * Math.PI * 22 * (1 - mlPeakTime.recommendation.best_next.confidence / 100) }}
                                          transition={{ duration: 1.4, ease: [0.19, 1, 0.22, 1] }}
                                        />
                                      </svg>
                                      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-blue-300 tabular-nums">
                                        {mlPeakTime.recommendation.best_next.confidence.toFixed(0)}%
                                      </span>
                                    </div>
                                    <span className="text-[10px] text-muted-foreground">confidence</span>
                                  </div>
                                </div>

                                {/* Supporting badges */}
                                <div className="flex items-center gap-2 flex-wrap pt-1">
                                  <Badge className="text-xs bg-blue-500/15 text-blue-300 border border-blue-500/25 flex items-center gap-1.5 px-2.5 py-1">
                                    <Brain className="h-3 w-3" />
                                    {mlPeakTime.behavior_cluster}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs text-muted-foreground border-white/10">
                                    {mlPeakTime.schedule}
                                  </Badge>
                                  {mlPeakTime.peak_hours.slice(1).map((h) => (
                                    <span key={h} className="px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400/70 text-xs font-mono tabular-nums">
                                      {String(h).padStart(2, "0")}:00
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Stat pills */}
                          <div className="grid grid-cols-3 gap-2">
                            <StatPill label="Avg / active" value={ml.peakTime.globalAvg} color="#60a5fa" />
                            <StatPill label="Peak best" value={ml.peakTime.peakBestDay} color="#60a5fa" />
                            <StatPill label="Active days" value={ml.peakTime.totalActiveDays} color="#60a5fa" />
                          </div>

                          {/* Top 3 recommended sessions */}
                          {mlPeakTime.recommendation.top_3.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Other top sessions</p>
                              <TopSlotsPanel slots={mlPeakTime.recommendation.top_3} />
                            </div>
                          )}

                          {/* SHAP model factors */}
                          {mlPeakTime.explanation.factors.length > 0 && (
                            <div className="space-y-2">
                              <div>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Why this time?</p>
                                <p className="text-xs text-muted-foreground/60 mt-0.5">Factors that most influenced the prediction</p>
                              </div>
                              <ShapFactorsChart factors={mlPeakTime.explanation.factors} />
                            </div>
                          )}

                        </div>
                      </div>
                    </div>
                  ) : (
                    /* ── Heuristic fallback (no ML service) ─────────────────── */
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                      <div className="lg:col-span-3 space-y-3">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Average contributions by day of week</p>
                        <DowMiniChart data={ml.peakTime.dowChartData} height={160} />
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-500/90" />Peak days</span>
                          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-500/22" />Other days</span>
                        </div>
                      </div>
                      <div className="lg:col-span-2 space-y-4">
                        <div>
                          <p className="text-2xl font-bold text-blue-400">
                            {ml.peakTime.peakDays.length > 0 ? ml.peakTime.peakDays.join(" & ") : "Not enough data"}
                          </p>
                          <p className="text-sm text-muted-foreground">most productive days</p>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <StatPill label="Avg / active day" value={ml.peakTime.globalAvg} color="#60a5fa" />
                          <StatPill label="Peak day best" value={ml.peakTime.peakBestDay} color="#60a5fa" />
                          <StatPill label="Total active days" value={ml.peakTime.totalActiveDays} color="#60a5fa" />
                        </div>
                        <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3 space-y-2.5">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Schedule split</p>
                          {[
                            { label: "Weekdays (Mon–Fri)", sessions: ml.peakTime.wdDays, total: ml.peakTime.wdTotal },
                            { label: "Weekends (Sat–Sun)",  sessions: ml.peakTime.weDays, total: ml.peakTime.weTotal },
                          ].map((row) => {
                            const grand = ml.peakTime.wdTotal + ml.peakTime.weTotal;
                            const pct = grand > 0 ? Math.round((row.total / grand) * 100) : 0;
                            return (
                              <div key={row.label} className="space-y-1">
                                <div className="flex justify-between text-xs">
                                  <span className="text-muted-foreground">{row.label} · {row.sessions} sessions</span>
                                  <span className="text-blue-400 tabular-nums font-medium">{row.total} · {pct}%</span>
                                </div>
                                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                  <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                                    transition={{ duration: 0.8, ease: [0.19, 1, 0.22, 1] }}
                                    className="h-full rounded-full bg-blue-500/70"
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="space-y-2">
                          {ml.peakTime.bestWeekCount > 0 && (
                            <div className="flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                              <span className="text-blue-300 flex items-center gap-1.5"><Trophy className="h-3 w-3" />Best week ever</span>
                              <span className="font-semibold text-blue-300 tabular-nums">{ml.peakTime.bestWeekCount} contributions</span>
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <Info className="h-3 w-3 shrink-0 text-blue-400/60" />
                            {ml.peakTime.schedule}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>


            {/* ② Activity Forecast — momentum + consistency + 7-day outlook */}
            {mlPeakTime && (
              <motion.div variants={fadeUp}>
                <Card className="border-border/50 bg-card/50 relative overflow-hidden">
                  <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-violet-500 to-fuchsia-500" />
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-violet-400" />
                        Activity Forecast
                      </CardTitle>
                      <Badge variant="outline" className="text-xs text-violet-400 border-violet-400/30">
                        ML · next 7 days
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                      {/* Momentum */}
                      <div className="space-y-3">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">2-week momentum</p>
                        <div className="p-4 rounded-xl border border-white/[0.07] bg-white/[0.02] space-y-3">
                          <div className="flex items-center gap-2">
                            {mlPeakTime.momentum?.trend === "up" ? (
                              <div className="p-2 rounded-lg bg-green-500/15 border border-green-500/25">
                                <ArrowUpRight className="h-5 w-5 text-green-400" />
                              </div>
                            ) : mlPeakTime.momentum?.trend === "down" ? (
                              <div className="p-2 rounded-lg bg-red-500/15 border border-red-500/25">
                                <ArrowDownRight className="h-5 w-5 text-red-400" />
                              </div>
                            ) : (
                              <div className="p-2 rounded-lg bg-blue-500/15 border border-blue-500/25">
                                <Minus className="h-5 w-5 text-blue-400" />
                              </div>
                            )}
                            <div>
                              <p className="text-xl font-bold tabular-nums" style={{
                                color: mlPeakTime.momentum?.trend === "up" ? "#22c55e"
                                  : mlPeakTime.momentum?.trend === "down" ? "#ef4444" : "#60a5fa"
                              }}>
                                {mlPeakTime.momentum?.trend === "stable"
                                  ? "Steady"
                                  : `${mlPeakTime.momentum?.trend === "up" ? "+" : "-"}${Math.abs(mlPeakTime.momentum?.change_pct ?? 0)}%`}
                              </p>
                              <p className="text-xs text-muted-foreground">vs prior 2 weeks</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex flex-col items-center py-2 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                              <span className="text-base font-bold text-violet-300 tabular-nums">{mlPeakTime.momentum?.recent_active_days ?? 0}</span>
                              <span className="text-muted-foreground mt-0.5">last 14d</span>
                            </div>
                            <div className="flex flex-col items-center py-2 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                              <span className="text-base font-bold text-violet-300/60 tabular-nums">{mlPeakTime.momentum?.older_active_days ?? 0}</span>
                              <span className="text-muted-foreground mt-0.5">prior 14d</span>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">{mlPeakTime.momentum?.label}</p>
                        </div>
                      </div>

                      {/* Consistency */}
                      <div className="space-y-3">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">schedule consistency</p>
                        <div className="p-4 rounded-xl border border-white/[0.07] bg-white/[0.02] space-y-3">
                          {/* Score ring */}
                          <div className="flex items-center gap-4">
                            <div className="relative flex items-center justify-center shrink-0">
                              <svg viewBox="0 0 64 64" className="w-16 h-16 -rotate-90">
                                <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
                                <motion.circle
                                  cx="32" cy="32" r="26"
                                  fill="none"
                                  stroke={
                                    (mlPeakTime.consistency?.score ?? 0) >= 60 ? "#a78bfa"
                                    : (mlPeakTime.consistency?.score ?? 0) >= 40 ? "#60a5fa"
                                    : "#f59e0b"
                                  }
                                  strokeWidth="7"
                                  strokeLinecap="round"
                                  strokeDasharray={`${2 * Math.PI * 26}`}
                                  initial={{ strokeDashoffset: 2 * Math.PI * 26 }}
                                  animate={{ strokeDashoffset: 2 * Math.PI * 26 * (1 - (mlPeakTime.consistency?.score ?? 0) / 100) }}
                                  transition={{ duration: 1.2, ease: [0.19, 1, 0.22, 1] }}
                                />
                              </svg>
                              <span className="absolute text-sm font-bold tabular-nums" style={{
                                color: (mlPeakTime.consistency?.score ?? 0) >= 60 ? "#a78bfa"
                                  : (mlPeakTime.consistency?.score ?? 0) >= 40 ? "#60a5fa" : "#f59e0b"
                              }}>
                                {mlPeakTime.consistency?.score ?? 0}
                              </span>
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-foreground/90">{mlPeakTime.consistency?.label}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {mlPeakTime.consistency?.weekly_avg ?? 0} sessions / week avg
                              </p>
                            </div>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${mlPeakTime.consistency?.score ?? 0}%` }}
                              transition={{ duration: 1.0, ease: [0.19, 1, 0.22, 1] }}
                              className="h-full rounded-full"
                              style={{
                                background: (mlPeakTime.consistency?.score ?? 0) >= 60
                                  ? "linear-gradient(90deg,#7c3aed,#a78bfa)"
                                  : (mlPeakTime.consistency?.score ?? 0) >= 40
                                  ? "linear-gradient(90deg,#2563eb,#60a5fa)"
                                  : "linear-gradient(90deg,#d97706,#f59e0b)",
                              }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {(mlPeakTime.consistency?.score ?? 0) >= 60
                              ? "Your coding schedule is very predictable — great for building habits."
                              : (mlPeakTime.consistency?.score ?? 0) >= 40
                              ? "Moderate regularity — try picking fixed coding days for better consistency."
                              : "Irregular schedule detected — consistent daily blocks help retention."}
                          </p>
                        </div>
                      </div>

                      {/* 7-day forecast */}
                      <div className="space-y-3">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">7-day activity outlook</p>
                        <div className="p-4 rounded-xl border border-white/[0.07] bg-white/[0.02] space-y-3">
                          {(mlPeakTime.next_week_forecast?.length ?? 0) > 0 ? (
                            <>
                              <div className="flex items-end gap-1.5 h-20">
                                {mlPeakTime.next_week_forecast!.map((day) => {
                                  const pct = Math.max(4, Math.round(day.prob * 100));
                                  const isPeak = day.prob >= 0.5;
                                  return (
                                    <div key={day.date} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group relative">
                                      <div
                                        className="w-full rounded-t-sm transition-all duration-300"
                                        style={{
                                          height: `${pct}%`,
                                          background: isPeak
                                            ? "linear-gradient(180deg,#a78bfa,#7c3aed88)"
                                            : "rgba(139,92,246,0.2)",
                                          boxShadow: isPeak ? "0 0 8px rgba(167,139,250,0.4)" : "none",
                                        }}
                                      />
                                      {/* tooltip on hover */}
                                      <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block z-10 pointer-events-none">
                                        <div className="bg-[#1a1a2e] border border-white/10 rounded px-2 py-1 text-[10px] whitespace-nowrap text-violet-200">
                                          {day.confidence.toFixed(0)}%
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                              <div className="flex items-center gap-1.5">
                                {mlPeakTime.next_week_forecast!.map((day) => (
                                  <div key={day.date} className="flex-1 text-center">
                                    <span className={`text-[10px] font-medium ${day.prob >= 0.5 ? "text-violet-300" : "text-muted-foreground"}`}>
                                      {day.day_short}
                                    </span>
                                  </div>
                                ))}
                              </div>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                                <span className="flex items-center gap-1.5">
                                  <span className="w-2.5 h-2.5 rounded-sm bg-violet-400/80" />
                                  High probability
                                </span>
                                <span className="flex items-center gap-1.5">
                                  <span className="w-2.5 h-2.5 rounded-sm bg-violet-400/20" />
                                  Low probability
                                </span>
                              </div>
                            </>
                          ) : (
                            <p className="text-sm text-muted-foreground text-center py-6">Forecast unavailable</p>
                          )}
                        </div>
                      </div>

                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* ③ Streak Survival + Contest Readiness */}
            {mlPeakTime && (mlPeakTime.streak_survival || mlPeakTime.contest_readiness) && (
              <motion.div variants={fadeUp}>
                <Card className="border-border/50 bg-card/50 relative overflow-hidden">
                  <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-amber-500 to-orange-500" />
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Flame className="h-4 w-4 text-amber-400" />
                        Streak Survival &amp; Contest Readiness
                      </CardTitle>
                      <Badge variant="outline" className="text-xs text-amber-400 border-amber-400/30">ML Prediction</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                      {/* ── Left: Streak Survival ── */}
                      {mlPeakTime.streak_survival && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Streak survival forecast</p>
                            <Badge className={`text-xs px-2 py-0.5 ${
                              mlPeakTime.streak_survival.risk_label === "Low risk"
                                ? "bg-green-500/15 text-green-400 border border-green-500/25"
                                : mlPeakTime.streak_survival.risk_label === "Moderate risk"
                                ? "bg-amber-500/15 text-amber-400 border border-amber-500/25"
                                : "bg-red-500/15 text-red-400 border border-red-500/25"
                            }`}>{mlPeakTime.streak_survival.risk_label}</Badge>
                          </div>

                          {/* Current streak + survival stats */}
                          <div className="grid grid-cols-3 gap-2">
                            <StatPill label="Current streak" value={`${mlPeakTime.streak_survival.current_streak}d`} color="#fb923c" />
                            <StatPill label="3-day survival" value={`${mlPeakTime.streak_survival.survival_3d}%`}
                              color={mlPeakTime.streak_survival.survival_3d >= 60 ? "#22c55e" : mlPeakTime.streak_survival.survival_3d >= 35 ? "#f59e0b" : "#ef4444"} />
                            <StatPill label="7-day survival" value={`${mlPeakTime.streak_survival.survival_7d}%`}
                              color={mlPeakTime.streak_survival.survival_7d >= 50 ? "#22c55e" : mlPeakTime.streak_survival.survival_7d >= 25 ? "#f59e0b" : "#ef4444"} />
                          </div>

                          {/* 7-day survival curve */}
                          {mlPeakTime.streak_survival.daily_survival.length > 0 && (
                            <div className="space-y-1.5">
                              <p className="text-[10px] text-muted-foreground">Cumulative survival probability</p>
                              <div className="space-y-1">
                                {mlPeakTime.streak_survival.daily_survival.map((d, i) => {
                                  const pct = Math.round(d.cumulative_prob * 100);
                                  const isWeakest = mlPeakTime.streak_survival!.weakest_day?.day === d.day;
                                  const barColor = pct >= 60 ? "#22c55e" : pct >= 35 ? "#f59e0b" : "#ef4444";
                                  return (
                                    <div key={i} className="flex items-center gap-2">
                                      <span className={`text-[10px] w-7 shrink-0 font-medium ${isWeakest ? "text-amber-400" : "text-muted-foreground"}`}>
                                        {d.day_short}
                                      </span>
                                      <div className="flex-1 h-4 rounded bg-white/[0.04] overflow-hidden relative">
                                        <motion.div
                                          initial={{ width: 0 }}
                                          animate={{ width: `${pct}%` }}
                                          transition={{ duration: 0.8, delay: i * 0.07, ease: [0.19, 1, 0.22, 1] }}
                                          className="h-full rounded"
                                          style={{ background: barColor + "99" }}
                                        />
                                        {isWeakest && (
                                          <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] text-amber-400 font-semibold">
                                            weakest
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-[10px] tabular-nums w-8 text-right shrink-0"
                                        style={{ color: barColor }}>{pct}%</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {mlPeakTime.streak_survival.weakest_day && (
                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs">
                              <AlertCircle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                              <span className="text-amber-300">
                                Watch out for <strong>{mlPeakTime.streak_survival.weakest_day.day}</strong> —
                                only {Math.round(mlPeakTime.streak_survival.weakest_day.prob * 100)}% chance of activity
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* ── Right: Contest Readiness ── */}
                      {mlPeakTime.contest_readiness && (
                        <div className="space-y-4">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Contest readiness</p>

                          {/* Score hero */}
                          <div className="flex items-center gap-5 p-4 rounded-xl border border-white/[0.07] bg-white/[0.02]">
                            <div className="relative shrink-0">
                              <svg viewBox="0 0 72 72" className="w-18 h-18 -rotate-90" style={{ width: 72, height: 72 }}>
                                <circle cx="36" cy="36" r="28" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                                <motion.circle
                                  cx="36" cy="36" r="28"
                                  fill="none"
                                  stroke={
                                    mlPeakTime.contest_readiness.score >= 85 ? "#22c55e" :
                                    mlPeakTime.contest_readiness.score >= 70 ? "#60a5fa" :
                                    mlPeakTime.contest_readiness.score >= 50 ? "#fb923c" : "#ef4444"
                                  }
                                  strokeWidth="8" strokeLinecap="round"
                                  strokeDasharray={`${2 * Math.PI * 28}`}
                                  initial={{ strokeDashoffset: 2 * Math.PI * 28 }}
                                  animate={{ strokeDashoffset: 2 * Math.PI * 28 * (1 - mlPeakTime.contest_readiness.score / 100) }}
                                  transition={{ duration: 1.4, ease: [0.19, 1, 0.22, 1] }}
                                />
                              </svg>
                              <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-xl font-bold tabular-nums" style={{
                                  color: mlPeakTime.contest_readiness.score >= 85 ? "#22c55e" :
                                         mlPeakTime.contest_readiness.score >= 70 ? "#60a5fa" :
                                         mlPeakTime.contest_readiness.score >= 50 ? "#fb923c" : "#ef4444"
                                }}>
                                  {mlPeakTime.contest_readiness.score}
                                </span>
                                <span className="text-[9px] text-muted-foreground leading-none mt-0.5">/ 100</span>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <p className="text-lg font-bold" style={{
                                color: mlPeakTime.contest_readiness.score >= 85 ? "#22c55e" :
                                       mlPeakTime.contest_readiness.score >= 70 ? "#60a5fa" :
                                       mlPeakTime.contest_readiness.score >= 50 ? "#fb923c" : "#ef4444"
                              }}>
                                {mlPeakTime.contest_readiness.label}
                              </p>
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                {mlPeakTime.contest_readiness.recommendation}
                              </p>
                            </div>
                          </div>

                          {/* Component breakdown */}
                          <div className="space-y-2">
                            {Object.entries(mlPeakTime.contest_readiness.components).map(([key, comp]) => {
                              const pct = comp.max > 0 ? Math.round((comp.score / comp.max) * 100) : 0;
                              const capLabel = key.charAt(0).toUpperCase() + key.slice(1);
                              return (
                                <div key={key} className="space-y-1">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">{capLabel}</span>
                                    <span className="tabular-nums font-medium text-foreground/70">
                                      {comp.score}/{comp.max}
                                      <span className="text-muted-foreground ml-1.5">· {comp.label}</span>
                                    </span>
                                  </div>
                                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{ width: `${pct}%` }}
                                      transition={{ duration: 0.8, ease: [0.19, 1, 0.22, 1] }}
                                      className="h-full rounded-full"
                                      style={{
                                        background: pct >= 75 ? "linear-gradient(90deg,#16a34a,#22c55e)"
                                          : pct >= 50 ? "linear-gradient(90deg,#2563eb,#60a5fa)"
                                          : "linear-gradient(90deg,#d97706,#fb923c)",
                                      }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* ④ Weak Topic Detection ─ full width */}
            <motion.div variants={fadeUp}>
              <Card className="border-border/50 bg-card/50 relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-orange-500 to-rose-500" />
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-orange-400" />
                      Weak Topic Detection
                    </CardTitle>
                    {ml.weakTopic.hasLeetCode ? (
                      <Badge variant="outline" className="text-xs text-orange-400 border-orange-400/30">
                        {ml.weakTopic.totalSolved} topic tags · {ml.weakTopic.coveragePct}% core coverage
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-muted-foreground">LeetCode required</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {!ml.weakTopic.hasLeetCode ? (
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                      <div className="lg:col-span-2 flex flex-col items-center justify-center py-8 space-y-3">
                        <AlertCircle className="h-12 w-12 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground text-center">
                          Link your LeetCode account to detect weak topics and get personalized recommendations.
                        </p>
                      </div>
                      <div className="lg:col-span-3">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Core DSA topics (preview)</p>
                        <TopicCoverageChart
                          data={CORE_TOPICS.map((t) => ({ topic: t.name, count: 0, status: "unseen" as const }))}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                      {/* Left — stats + difficulty */}
                      <div className="lg:col-span-2 space-y-4">
                        {/* Coverage headline */}
                        <div>
                          <p className="text-3xl font-bold text-orange-400">{ml.weakTopic.coveragePct}%</p>
                          <p className="text-sm text-muted-foreground">core topic coverage</p>
                        </div>

                        {/* Stat pills */}
                        <div className="grid grid-cols-2 gap-2">
                          <StatPill label="Topics mastered" value={ml.weakTopic.goodCount} color="#22c55e" />
                          <StatPill label="Rarely practiced" value={ml.weakTopic.rareCount} color="#f59e0b" />
                          <StatPill label="Not attempted" value={ml.weakTopic.unseenCount} color="#ef4444" />
                          <StatPill label="Total LC solved" value={ml.weakTopic.totalSolvedLC} color="#fb923c" />
                        </div>

                        {/* Difficulty breakdown */}
                        {ml.weakTopic.totalSolvedLC > 0 && (
                          <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3 space-y-2.5">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Difficulty breakdown</p>
                            {[
                              { label: "Easy",   val: ml.weakTopic.easySolved,   color: "#22c55e" },
                              { label: "Medium", val: ml.weakTopic.mediumSolved,  color: "#f59e0b" },
                              { label: "Hard",   val: ml.weakTopic.hardSolved,    color: "#ef4444" },
                            ].map((row) => {
                              const pct = ml.weakTopic.totalSolvedLC > 0
                                ? Math.round((row.val / ml.weakTopic.totalSolvedLC) * 100) : 0;
                              return (
                                <div key={row.label} className="space-y-1">
                                  <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">{row.label}</span>
                                    <span style={{ color: row.color }} className="tabular-nums font-medium">{row.val} · {pct}%</span>
                                  </div>
                                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                                      transition={{ duration: 0.8, ease: [0.19, 1, 0.22, 1] }}
                                      className="h-full rounded-full" style={{ background: row.color + "99" }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Top practiced + summary */}
                        {ml.weakTopic.topTopic && (
                          <div className="flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                            <span className="text-orange-300 flex items-center gap-1.5">
                              <Trophy className="h-3 w-3" /> Most practiced
                            </span>
                            <span className="font-semibold text-orange-300">
                              {ml.weakTopic.topTopic.name} · {ml.weakTopic.topTopic.count}
                            </span>
                          </div>
                        )}

                        {ml.weakTopic.items.length === 0 ? (
                          <div className="flex items-center gap-2 text-sm text-green-400">
                            <CheckCircle2 className="h-4 w-4" />
                            Strong across all core topics!
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            Focus on {ml.weakTopic.items.filter(t => t.severity === "unseen").slice(0, 2).map(t => t.name).join(", ")} to improve coverage.
                          </p>
                        )}
                      </div>

                      {/* Right — chart */}
                      <div className="lg:col-span-3 space-y-3">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Core DSA topic coverage</p>
                        <TopicCoverageChart data={ml.weakTopic.topicCoverage} />
                        <div className="flex items-center gap-5 text-xs text-muted-foreground pt-1">
                          {[
                            { color: "#22c55e", label: "Mastered (5+ solved)" },
                            { color: "#f59e0b", label: "Rare (1–4 solved)" },
                            { color: "#ef4444", label: "Not attempted" },
                          ].map((l) => (
                            <span key={l.label} className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: l.color }} />
                              {l.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>


          </motion.div>
        )}

        {/* Empty state */}
        {isEmpty && !dbError && (
          <motion.div variants={fadeUp} initial="hidden" animate="show">
            <Card className="border-border/50 bg-card/50">
              <CardContent className="py-16 text-center">
                <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-semibold">No analytics data yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Connect your platforms and sync data to see your coding patterns here.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

      </div>
    </div>
  );
}