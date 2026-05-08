"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { RefreshCw, ExternalLink, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { platformProfiles, contributionSnapshots } from "@/db/schema";

// Dynamic imports for charts (SSR disabled)
const HeatmapCalendar = dynamic(
  () => import("@/components/charts/heatmap-calendar").then((m) => m.HeatmapCalendar),
  { ssr: false, loading: () => <Skeleton className="h-32 w-full rounded-lg" /> }
);

type Profile = Omit<typeof platformProfiles.$inferSelect, "accessToken">;
type Snapshot = typeof contributionSnapshots.$inferSelect;
type PinnedRepo = {
  name: string;
  description?: string;
  url: string;
  stargazerCount: number;
  primaryLanguage?: { name: string; color: string };
  isPrivate: boolean;
};

interface Props {
  clerkId: string;
  clerkUser: { firstName: string | null; imageUrl: string | null };
  profile: Profile | null;
  snapshots: Snapshot[];
  pinnedRepos: PinnedRepo[];
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
    .filter((s) => s && s.date) // Filter out undefined or invalid snapshots
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

export function GitHubDashboardClient({
  clerkId,
  clerkUser,
  profile,
  snapshots,
  pinnedRepos,
  dbError,
}: Props) {
  const [isSyncing, setIsSyncing] = useState(false);

  const totalContributions = snapshots.reduce((sum, s) => sum + (s?.count || 0), 0);

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

  const syncGitHub = useCallback(async () => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/platforms/github", { method: "GET" });
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
              <span className="gradient-text">GitHub</span> Dashboard
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {profile ? `@${profile.handle}` : "Connect your GitHub account"}
            </p>
          </motion.div>

          <motion.div variants={fadeUp}>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={syncGitHub}
              disabled={isSyncing || !profile}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Syncing…" : "Sync GitHub"}
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

        {/* Profile Header + Contribution Stats */}
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
                  {profile?.avatarUrl && (
                    <img
                      src={profile.avatarUrl}
                      alt={profile.displayName || "GitHub"}
                      className="w-20 h-20 rounded-full mx-auto"
                    />
                  )}
                  <div className="text-center">
                    <p className="font-semibold text-lg text-foreground">{profile?.displayName || "—"}</p>
                    <p className="text-sm text-muted-foreground">@{profile?.handle || "—"}</p>
                  </div>
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

          {/* Contribution Stats */}
          <motion.div variants={fadeUp}>
            <Card className="border-border/50 bg-card/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Contribution Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Total Contributions</p>
                  <p className="text-2xl font-bold text-blue-500">{totalContributions.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Last 30 Days</p>
                  <p className="text-2xl font-bold text-cyan-500">{last30Days.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Current Streak</p>
                  <p className="text-xl font-bold text-orange-500">{streak}d</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Repository Info */}
          <motion.div variants={fadeUp}>
            <Card className="border-border/50 bg-card/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Repository Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Pinned Repositories</p>
                  <p className="text-2xl font-bold text-green-500">{pinnedRepos.length}</p>
                </div>
                {profile?.lastSynced && (
                  <div className="pt-2 border-t border-border/50">
                    <p className="text-xs text-muted-foreground">Last Synced</p>
                    <p className="text-xs font-medium text-foreground">
                      {new Date(profile.lastSynced).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
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

        {/* Pinned Repositories */}
        {pinnedRepos.length > 0 && (
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
          >
            <Card className="border-border/50 bg-card/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Pinned Repositories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pinnedRepos.map((repo) => (
                    <a
                      key={repo.name}
                      href={repo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-4 rounded-lg border border-border/50 bg-background/50 hover:bg-background/80 transition-colors group"
                    >
                      <div className="space-y-3">
                        {/* Repo Name */}
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                            {repo.name}
                          </p>
                          {repo.isPrivate && (
                            <Badge variant="outline" className="text-xs whitespace-nowrap">
                              Private
                            </Badge>
                          )}
                        </div>

                        {/* Description */}
                        {repo.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {repo.description}
                          </p>
                        )}

                        {/* Stats */}
                        <div className="flex items-center gap-3 pt-2">
                          {repo.primaryLanguage && (
                            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: repo.primaryLanguage.color || "#ccc" }}
                              />
                              {repo.primaryLanguage.name}
                            </span>
                          )}
                          {repo.stargazerCount > 0 && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Star className="w-3 h-3" />
                              {repo.stargazerCount.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}