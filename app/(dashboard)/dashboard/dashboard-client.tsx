"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { Zap, TrendingUp, GitCommit, Trophy, Code2, Star, Flame, RefreshCw, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PlatformCard, PlatformCardSkeleton } from "@/components/dashboard/platform-card";
import type { PlatformCardProps } from "@/components/dashboard/platform-card";
import type { InferSelectModel } from "drizzle-orm";
import type { users, platformProfiles } from "@/db/schema";

// Dynamic imports for chart components (SSR disabled — uses browser APIs)
const HeatmapCalendar = dynamic(
  () => import("@/components/charts/heatmap-calendar").then((m) => m.HeatmapCalendar),
  { ssr: false, loading: () => <Skeleton className="h-32 w-full rounded-lg" /> }
);
const ActivityAreaChart = dynamic(
  () => import("@/components/charts/activity-area-chart").then((m) => m.ActivityAreaChart),
  { ssr: false, loading: () => <Skeleton className="h-40 w-full rounded-lg" /> }
);
const ActivityBarChart = dynamic(
  () => import("@/components/charts/activity-bar-chart").then((m) => m.ActivityBarChart),
  { ssr: false, loading: () => <Skeleton className="h-40 w-full rounded-lg" /> }
);

type User = InferSelectModel<typeof users> | null;
// SafeProfile matches what getUserPlatforms() returns — accessToken is stripped server-side
type Platform = {
  id: string;
  userId: string;
  platform: "github" | "leetcode" | "codeforces" | "codechef";
  handle: string;
  displayName: string | null;
  profileUrl: string | null;
  avatarUrl: string | null;
  rating: number | null;
  rank: string | null;
  problemsSolved: number | null;
  lastSynced: Date | null;
  createdAt: Date;
  updatedAt: Date;
};
type Snapshot = {
  date: string;
  count: number;
  platform: "github" | "leetcode" | "codeforces" | "codechef";
  metadata: unknown;
};

const GithubIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.2c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

const PLATFORM_META: Record<string, { icon: PlatformCardProps["icon"]; color: string; description: string }> = {
  github:     { icon: GithubIcon, color: "hsl(210 100% 60%)", description: "Commits, PRs & issues" },
  leetcode:   { icon: Code2,      color: "hsl(38 92% 55%)",  description: "DSA problem solving" },
  codeforces: { icon: Trophy,     color: "hsl(0 72% 55%)",   description: "Competitive programming" },
  codechef:   { icon: Star,       color: "hsl(38 80% 45%)",  description: "Competitive programming" },
};

type Props = {
  user: User;
  clerkUser: { firstName: string | null; imageUrl: string | null };
  platforms: Platform[];
  snapshots: Snapshot[];
  clerkId: string;
  dbError?: string | null;
};

const ALL_PLATFORMS = ["github", "leetcode", "codeforces", "codechef"] as const;

const stagger = {
  show: { transition: { staggerChildren: 0.07 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.19, 1, 0.22, 1] as [number, number, number, number] } },
};

export function DashboardClient({ user, clerkUser, platforms, snapshots, clerkId, dbError }: Props) {
  const [syncingPlatform, setSyncingPlatform] = useState<string | null>(null);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [syncErrors, setSyncErrors] = useState<Record<string, string>>({});

  const totalContributions = snapshots.reduce((sum, s) => sum + s.count, 0);
  const last30Days = snapshots.filter((s) => {
    const d = new Date(s.date + "T00:00:00");
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    return d >= cutoff;
  }).reduce((sum, s) => sum + s.count, 0);

  // Compute streak
  const streak = computeStreak(snapshots);

  const syncPlatform = useCallback(async (platform: string) => {
    setSyncingPlatform(platform);
    setSyncErrors((prev) => { const next = { ...prev }; delete next[platform]; return next; });
    try {
      const res = await fetch(`/api/platforms/${platform}`, { method: "GET" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setSyncErrors((prev) => ({ ...prev, [platform]: body.error ?? `Sync failed (${res.status})` }));
        setSyncingPlatform(null);
        return;
      }
    } catch {
      setSyncErrors((prev) => ({ ...prev, [platform]: "Network error — check your connection." }));
      setSyncingPlatform(null);
      return;
    }
    setSyncingPlatform(null);
    window.location.reload();
  }, []);

  const clearCache = useCallback(async () => {
    setIsClearingCache(true);
    try {
      await fetch("/api/cache/clear", { method: "POST" });
    } finally {
      setIsClearingCache(false);
    }
  }, []);

  const syncAll = useCallback(async () => {
    setIsSyncingAll(true);
    try {
      await fetch("/api/cache/clear", { method: "POST" });
      const res = await fetch("/api/sync", { method: "POST" });
      if (!res.ok) {
        const error = await res.json();
        alert(`Sync failed: ${error.error || "Unknown error"}`);
      }
    } catch (err) {
      alert("Failed to connect to sync service. Please try again.");
    } finally {
      setIsSyncingAll(false);
      window.location.reload();
    }
  }, []);

  // Map DB platforms to card props
  const platformCards = ALL_PLATFORMS.map((platform) => {
    const profile = platforms.find((p) => p.platform === platform);
    const meta = PLATFORM_META[platform];
    return {
      id: platform,
      name: platform.charAt(0).toUpperCase() + platform.slice(1),
      handle: profile?.handle,
      icon: meta.icon,
      color: meta.color,
      description: meta.description,
      status: (profile
        ? syncingPlatform === platform ? "syncing" : syncErrors[platform] ? "error" : "connected"
        : "not_connected") as PlatformCardProps["status"],
      syncError: syncErrors[platform] ?? null,
      rating: profile?.rating,
      rank: profile?.rank,
      problemsSolved: profile?.problemsSolved,
      profileUrl: profile?.profileUrl,
      lastSynced: profile?.lastSynced ? new Date(profile.lastSynced) : null,
      onSync: () => syncPlatform(platform),
      onLink: () => window.location.href = `/dashboard/settings?link=${platform}`,
      onUnlink: () => window.location.href = `/dashboard/settings?unlink=${platform}`,
    };
  });

  const heatmapData = snapshots.map((s) => ({ date: s.date, count: s.count }));
  const activityData = snapshots.map((s) => ({ date: s.date, count: s.count, platform: s.platform }));

  const displayName = user?.firstName ?? clerkUser?.firstName ?? "Developer";

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {dbError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm flex items-center gap-2"
          >
            <Zap className="h-4 w-4" />
            <div className="flex-1">
              <p className="font-semibold">Database Sync Issue</p>
              <p className="opacity-80">{dbError}</p>
            </div>
          </motion.div>
        )}

        {/* Header */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <motion.div variants={fadeUp}>
            <h1 className="text-2xl font-bold tracking-tight">
              Welcome back, <span className="gradient-text">{displayName}</span> 👋
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {platforms.length === 0
                ? "Connect your first platform to start tracking"
                : `Tracking ${platforms.length} platform${platforms.length > 1 ? "s" : ""}`}
            </p>
          </motion.div>

          <motion.div variants={fadeUp} className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={clearCache}
              disabled={isClearingCache || isSyncingAll || platforms.length === 0}
              title="Clear cached data so next sync fetches fresh results"
            >
              <Trash2 className={`h-3.5 w-3.5 ${isClearingCache ? "animate-pulse" : ""}`} />
              {isClearingCache ? "Clearing…" : "Clear cache"}
            </Button>
            <Button
              id="sync-all"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={syncAll}
              disabled={isSyncingAll || platforms.length === 0}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncingAll ? "animate-spin" : ""}`} />
              {isSyncingAll ? "Syncing all…" : "Sync all platforms"}
            </Button>
          </motion.div>
        </motion.div>

        {/* Stats row */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {[
            { label: "Total contributions", value: totalContributions.toLocaleString(), icon: GitCommit, color: "hsl(265 89% 58%)" },
            { label: "Last 30 days", value: last30Days.toLocaleString(), icon: TrendingUp, color: "hsl(186 85% 50%)" },
            { label: "Current streak", value: `${streak}d`, icon: Flame, color: "hsl(38 92% 55%)" },
            { label: "Platforms linked", value: `${platforms.length}/4`, icon: Zap, color: "hsl(120 60% 40%)" },
          ].map((stat) => (
            <motion.div key={stat.label} variants={fadeUp}>
              <Card className="border-border/50 bg-card/50">
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <stat.icon className="h-3.5 w-3.5" style={{ color: stat.color }} />
                  </div>
                  <p className="text-2xl font-bold" style={{ color: stat.color }}>
                    {stat.value}
                  </p>
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
                <CardTitle className="text-base">Contribution Activity</CardTitle>
                <Badge variant="outline" className="text-xs">
                  Last 12 months
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pb-5">
              <HeatmapCalendar data={heatmapData} />
            </CardContent>
          </Card>
        </motion.div>

        {/* Activity charts */}
        {snapshots.length > 0 && (
          <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <motion.div variants={fadeUp}>
              <Card className="border-border/50 bg-card/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Weekly Total (Last 26 weeks)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ActivityAreaChart data={activityData} />
                </CardContent>
              </Card>
            </motion.div>
            <motion.div variants={fadeUp}>
              <Card className="border-border/50 bg-card/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Platform Split (Last 12 weeks)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ActivityBarChart data={activityData} />
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}

        {/* Platform cards */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="space-y-4"
        >
          <motion.h2 variants={fadeUp} className="text-lg font-semibold">
            Platforms
          </motion.h2>
          <motion.div
            variants={stagger}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {platformCards.map((card) => (
              <motion.div key={card.id} variants={fadeUp}>
                <PlatformCard {...card} />
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

function computeStreak(snapshots: Snapshot[]): number {
  if (snapshots.length === 0) return 0;
  const activeDates = new Set(
    snapshots.filter((s) => s.count > 0).map((s) => s.date)
  );
  let streak = 0;
  const today = new Date();
  const cursor = new Date(today);
  while (true) {
    const dateStr = cursor.toISOString().split("T")[0];
    if (!activeDates.has(dateStr)) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
