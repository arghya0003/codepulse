"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { Code2, TrendingUp, Trophy, RefreshCw, ExternalLink, Zap, CheckCircle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRelativeTime } from "@/lib/utils";
import type { platformProfiles, contributionSnapshots } from "@/db/schema";

// Dynamic imports for charts (SSR disabled)
const HeatmapCalendar = dynamic(
  () => import("@/components/charts/heatmap-calendar").then((m) => m.HeatmapCalendar),
  { ssr: false, loading: () => <Skeleton className="h-32 w-full rounded-lg" /> }
);
const TopicsChart = dynamic(
  () => import("@/components/charts/topics-chart").then((m) => m.TopicsChart),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full rounded-lg" /> }
);
const RatingChart = dynamic(
  () => import("@/components/charts/rating-chart").then((m) => m.RatingChart),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full rounded-lg" /> }
);

type Profile = Omit<typeof platformProfiles.$inferSelect, "accessToken">;
type Snapshot = typeof contributionSnapshots.$inferSelect;

type RecentSubmission = {
  title: string;
  titleSlug: string;
  timestamp: string | number;
  statusDisplay: string;
  lang: string;
};

interface Props {
  clerkId: string;
  clerkUser: { firstName: string | null; imageUrl: string | null };
  profile: Profile | null;
  snapshots: Snapshot[];
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

function computeStreak(snapshots: Snapshot[]): number {
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

export function LeetCodeDashboardClient({
  clerkId,
  clerkUser,
  profile,
  snapshots,
  dbError,
}: Props) {
  const [isSyncing, setIsSyncing] = useState(false);

  const metadata = profile?.metadata as any || {};
  const difficultyStats = metadata.difficultyStats || { easy: 0, medium: 0, hard: 0 };
  const easySolved = metadata.easySolved || 0;
  const mediumSolved = metadata.mediumSolved || 0;
  const hardSolved = metadata.hardSolved || 0;
  const recentSubmissions = (metadata.recentSubmissions || []) as RecentSubmission[];
  const topicDistribution = metadata.topicWiseDistribution || {};

  // Sort topics by count descending
  const sortedTopics = Object.entries(topicDistribution)
    .sort((a, b) => (b[1] as number) - (a[1] as number));

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

  const syncLeetCode = useCallback(async () => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/platforms/leetcode?force=true", { method: "GET" });
      if (!res.ok) throw new Error("Sync failed");
      window.location.reload();
    } catch (err) {
      console.error("Sync error:", err);
      setIsSyncing(false);
    }
  }, []);

  const validSnapshots = (snapshots || []).filter((s) => s && s.date);
  const heatmapData = validSnapshots.map((s) => ({
    date: s.date,
    count: s.count || 0,
  }));

  const statusColors: Record<string, string> = {
    "Accepted": "text-green-500",
    "Rejected": "text-red-500",
    "Time Limit Exceeded": "text-orange-500",
    "Wrong Answer": "text-red-500",
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
              <span className="gradient-text">LeetCode</span> Dashboard
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {profile ? `@${profile.handle}` : "Connect your LeetCode account"}
            </p>
          </motion.div>

          <motion.div variants={fadeUp}>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={syncLeetCode}
              disabled={isSyncing || !profile}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Syncing…" : "Sync LeetCode"}
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

        {/* Profile Header + Contest Stats */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 lg:grid-cols-3 gap-4"
        >
          {/* Profile Card */}
          <motion.div variants={fadeUp}>
            <Card className="border-border/50 bg-card/50">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {profile?.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt={profile.displayName || "LeetCode"}
                      className="w-20 h-20 rounded-full mx-auto object-cover border border-border"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-amber-500/20 text-amber-500 rounded-full flex items-center justify-center mx-auto">
                      <Code2 className="w-8 h-8" />
                    </div>
                  )}
                  <div className="text-center">
                    <p className="font-semibold text-lg text-foreground">{profile?.displayName || "—"}</p>
                    <p className="text-sm text-muted-foreground">@{profile?.handle || "—"}</p>
                  </div>
                  {profile?.rank && (
                    <div className="text-center pt-2 border-t border-border/50">
                      <p className="text-xs text-muted-foreground">Rank</p>
                      <p className="text-xl font-bold text-primary">{profile.rank}</p>
                    </div>
                  )}
                  {profile?.profileUrl && (
                    <a
                      href={profile.profileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:text-primary/80 flex items-center justify-center gap-2 font-medium pt-2"
                    >
                      View Full Profile
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Contest Stats */}
          <motion.div variants={fadeUp}>
            <Card className="border-border/50 bg-card/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Contest Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {profile?.rating && (
                  <div>
                    <p className="text-xs text-muted-foreground">Contest Rating</p>
                    <p className="text-2xl font-bold text-primary">{profile.rating.toLocaleString()}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">Problems Solved</p>
                  <p className="text-2xl font-bold text-blue-500">{profile?.problemsSolved?.toLocaleString() || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Submissions (30d)</p>
                  <p className="text-xl font-bold text-cyan-500">{last30Days.toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Problem Breakdown */}
          <motion.div variants={fadeUp}>
            <Card className="border-border/50 bg-card/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Problem Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-muted-foreground">Easy</p>
                    <p className="text-sm font-bold text-green-500">{easySolved}/{difficultyStats.easy}</p>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${Math.min(100, (easySolved / Math.max(1, difficultyStats.easy)) * 100)}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-muted-foreground">Medium</p>
                    <p className="text-sm font-bold text-yellow-500">{mediumSolved}/{difficultyStats.medium}</p>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-yellow-500 h-2 rounded-full"
                      style={{ width: `${Math.min(100, (mediumSolved / Math.max(1, difficultyStats.medium)) * 100)}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-muted-foreground">Hard</p>
                    <p className="text-sm font-bold text-red-500">{hardSolved}/{difficultyStats.hard}</p>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-red-500 h-2 rounded-full"
                      style={{ width: `${Math.min(100, (hardSolved / Math.max(1, difficultyStats.hard)) * 100)}%` }}
                    />
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
                <CardTitle className="text-base">Submission Activity</CardTitle>
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

        {/* Rating Chart */}
        {metadata.ratingHistory && metadata.ratingHistory.length > 0 && (
          <motion.div variants={fadeUp} initial="hidden" animate="show">
            <Card className="border-border/50 bg-card/50">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-yellow-500" />
                    Rating History
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <RatingChart data={metadata.ratingHistory} color="hsl(45 93% 47%)" />
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Topics */}
        {sortedTopics.length > 0 && (
          <motion.div variants={fadeUp} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="border-border/50 bg-card/50 lg:col-span-2 flex flex-col h-[400px]">
              <CardHeader className="pb-3 shrink-0">
                <CardTitle className="text-base">Top Skills & Topics</CardTitle>
                <p className="text-xs text-muted-foreground">Most frequently solved topics</p>
              </CardHeader>
              <CardContent className="flex-1 min-h-0">
                <TopicsChart data={sortedTopics.map(([topic, count]) => ({ topic, count: count as number }))} color="#fbbf24" />
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/50 lg:col-span-1 flex flex-col h-[400px]">
              <CardHeader className="pb-3 shrink-0">
                <CardTitle className="text-base">All Topics</CardTitle>
                <p className="text-xs text-muted-foreground">{sortedTopics.length} topics mastered</p>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto overflow-x-hidden pr-4 custom-scrollbar">
                <div className="flex flex-col gap-3">
                  {sortedTopics.map(([topic, count]) => (
                    <div key={topic} className="flex items-center justify-between text-sm">
                      <span className="text-foreground font-medium truncate max-w-[160px]" title={topic}>{topic}</span>
                      <Badge variant="secondary" className="bg-background/50 border-border/50 shrink-0">
                        <span className="text-amber-500 font-bold px-1">{String(count)}</span>
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Recent Submissions */}
        {recentSubmissions.length > 0 && (
          <motion.div variants={fadeUp} initial="hidden" animate="show">
            <Card className="border-border/50 bg-card/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Last 10 Submissions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {recentSubmissions.map((submission, idx) => {
                    const timestamp = typeof submission.timestamp === "string" 
                      ? parseInt(submission.timestamp, 10) * 1000
                      : submission.timestamp * 1000;
                    const date = new Date(timestamp);
                    const isAccepted = submission.statusDisplay === "Accepted";

                    return (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-background/50 hover:bg-background/80 transition-colors">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {isAccepted ? (
                            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                          ) : (
                            <Clock className="w-4 h-4 text-orange-500 flex-shrink-0" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground truncate">{submission.title}</p>
                            <p className="text-xs text-muted-foreground">{submission.lang}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className={`text-xs font-medium ${isAccepted ? "text-green-500" : "text-orange-500"}`}>
                            {submission.statusDisplay}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatRelativeTime(date)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
