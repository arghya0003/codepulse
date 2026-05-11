"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { Code2, TrendingUp, Trophy, RefreshCw, ExternalLink, Zap, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { contributionSnapshots } from "@/db/schema";

// Dynamic imports for charts (SSR disabled)
const HeatmapCalendar = dynamic(
  () => import("@/components/charts/heatmap-calendar").then((m) => m.HeatmapCalendar),
  { ssr: false, loading: () => <Skeleton className="h-32 w-full rounded-lg" /> }
);
const RatingChart = dynamic(
  () => import("@/components/charts/rating-chart").then((m) => m.RatingChart),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full rounded-lg" /> }
);

type Profile = any;
type Snapshot = typeof contributionSnapshots.$inferSelect;

interface Props {
  clerkId: string;
  clerkUser: { firstName: string | null; imageUrl: string | null };
  profile: any | null;
  snapshots: any[];
  dbError: string | null;
}

const stagger = {
  show: { transition: { staggerChildren: 0.07 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.19, 1, 0.22, 1] as [number, number, number, number] },
  },
};

function computeStreak(snapshots: any[]): number {
  if (!snapshots || !snapshots.length) return 0;
  
  let streak = 0;
  const sorted = [...snapshots]
    .filter((s) => s && s.date)
    .sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA;
    });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let currentDate = new Date(today);
  for (const snapshot of sorted) {
    const snapDate = new Date(snapshot.date);
    snapDate.setHours(0, 0, 0, 0);

    if (snapDate.getTime() === currentDate.getTime() && snapshot.count > 0) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else if (snapDate.getTime() < currentDate.getTime()) {
      break;
    }
  }

  return streak;
}

export function CodeChefDashboardClient({
  clerkId,
  clerkUser,
  profile,
  snapshots,
  dbError,
}: Props) {
  const [isSyncing, setIsSyncing] = useState(false);

  const metadata = profile?.metadata as any || {};
  const problemStats = metadata.problemsSolved || profile?.problemsSolved || 0;
  const currentRating = metadata.rating || profile?.rating || 0;
  const currentRank = metadata.rank || profile?.rank || "Unrated";
  
  // CodeChef specific stats if they exist in metadata, otherwise fallback to defaults
  const maxRating = metadata.maxRating || currentRating;
  const globalRank = metadata.globalRank || "N/A";
  
  const totalSubmissions = snapshots.reduce((sum, s) => sum + (s?.count || 0), 0);
  const last30Days = (snapshots || [])
    .filter((s) => s && s.date)
    .filter((s) => {
      const d = new Date(s.date + "T00:00:00");
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      return d >= cutoff;
    })
    .reduce((sum, s) => sum + (s?.count || 0), 0);

  const streak = computeStreak(snapshots || []);

  const syncCodeChef = useCallback(async () => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/platforms/codechef?force=true", { method: "GET" });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Sync failed");
      }
      window.location.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Sync failed");
      setIsSyncing(false);
    }
  }, []);

  const validSnapshots = (snapshots || []).filter((s) => s && s.date);
  const heatmapData = validSnapshots.map((s) => ({
    date: s.date,
    count: s.count || 0,
  }));

  const getRankColor = (rank: string) => {
    if (!rank) return "text-gray-500";
    const r = rank.toLowerCase();
    if (r.includes("7") || r.includes("6")) return "text-red-600 font-bold";
    if (r.includes("5")) return "text-yellow-500 font-bold";
    if (r.includes("4")) return "text-purple-500 font-bold";
    if (r.includes("3")) return "text-blue-500 font-bold";
    if (r.includes("2")) return "text-green-500 font-bold";
    if (r.includes("1")) return "text-gray-500 font-bold";
    return "text-[#5B4638] font-bold";
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <motion.div variants={fadeUp}>
            <h1 className="text-2xl font-bold tracking-tight">
              <span className="text-[#5B4638]">CodeChef</span> Dashboard
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {profile ? `@${profile.handle}` : "Connect your CodeChef account"}
            </p>
          </motion.div>

          <motion.div variants={fadeUp}>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={syncCodeChef}
              disabled={isSyncing || !profile}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Syncing…" : "Sync CodeChef"}
            </Button>
          </motion.div>
        </motion.div>

        {dbError && (
          <motion.div
            initial="hidden"
            animate="show"
            variants={fadeUp}
            className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm"
          >
            {dbError}
          </motion.div>
        )}

        {/* Stats Grid */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {/* Profile Card */}
          <motion.div variants={fadeUp} className="col-span-1">
            <Card className="border-border/50 bg-card/50 h-full flex flex-col justify-center text-center p-6">
              {profile?.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.displayName || "CodeChef"}
                  className="w-24 h-24 rounded-lg mx-auto mb-4 object-cover border border-border"
                />
              ) : (
                <div className="w-24 h-24 bg-[#5B4638]/20 text-[#5B4638] rounded-lg flex items-center justify-center mx-auto mb-4 border border-[#5B4638]/20">
                  <Code2 className="w-10 h-10" />
                </div>
              )}
              <h2 className="text-xl font-bold">{profile?.displayName || profile?.handle || "—"}</h2>
              <p className="text-sm text-muted-foreground mb-4">@{profile?.handle || "—"}</p>
              
              {profile?.profileUrl && (
                <a
                  href={profile.profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[#5B4638] hover:text-[#4A392D] flex items-center justify-center gap-2 mt-auto"
                >
                  View Profile <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </Card>
          </motion.div>

          {/* Rating Card */}
          <motion.div variants={fadeUp}>
            <Card className="border-border/50 bg-card/50 h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-yellow-500" />
                  Contest Rating
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-1">
                  <span className={`text-4xl tracking-tight ${getRankColor(currentRank)}`}>
                    {currentRating > 0 ? currentRating.toLocaleString() : "—"}
                  </span>
                  <span className={`text-sm capitalize ${getRankColor(currentRank)}`}>
                    {currentRank || "Unrated"}
                  </span>
                  
                  {maxRating > 0 && maxRating !== currentRating && (
                    <div className="text-xs text-muted-foreground mt-4 pt-4 border-t border-border/50 flex justify-between">
                      <span>Max Rating</span>
                      <span className="font-medium text-foreground">{maxRating}</span>
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground mt-2 flex justify-between">
                    <span>Global Rank</span>
                    <span className="font-medium text-foreground">{globalRank}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Solved Problems */}
          <motion.div variants={fadeUp}>
            <Card className="border-border/50 bg-card/50 h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Problems Solved
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col h-full justify-between">
                  <span className="text-4xl font-bold tracking-tight text-foreground">
                    {problemStats.toLocaleString()}
                  </span>
                  
                  <div className="text-xs text-muted-foreground mt-4 pt-4 border-t border-border/50">
                    Total problems solved all-time
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Activity Card */}
          <motion.div variants={fadeUp}>
            <Card className="border-border/50 bg-card/50 h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  Activity Stream
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  <div>
                    <span className="text-3xl font-bold tracking-tight text-foreground">
                      {last30Days.toLocaleString()}
                    </span>
                    <p className="text-xs text-muted-foreground mt-1">Submissions past 30 days</p>
                  </div>
                  
                  <div>
                    <span className="text-xl font-semibold tracking-tight text-foreground">
                      {streak}
                    </span>
                    <span className="text-xs text-muted-foreground ml-1">Day Streak 🔥</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Heatmap */}
        <motion.div variants={fadeUp} initial="hidden" animate="show">
          <Card className="border-border/50 bg-card/50 overflow-x-auto">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Activity Heatmap</CardTitle>
                <Badge variant="outline" className="text-xs font-normal">
                  {totalSubmissions.toLocaleString()} Total Submissions
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="min-w-[800px] pt-4">
              {heatmapData.length > 0 ? (
                <HeatmapCalendar data={heatmapData} />
              ) : (
                <div className="h-32 flex items-center justify-center text-sm text-muted-foreground border border-dashed rounded-md">
                  No activity data available
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Rating Chart */}
        {metadata.ratingHistory && metadata.ratingHistory.length > 0 && (
          <motion.div variants={fadeUp} initial="hidden" animate="show">
            <Card className="border-border/50 bg-card/50">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#5B4638]" />
                    Rating History
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <RatingChart data={metadata.ratingHistory} />
              </CardContent>
            </Card>
          </motion.div>
        )}

      </div>
    </div>
  );
}