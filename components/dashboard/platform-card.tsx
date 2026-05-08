"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, RefreshCw, Link2, Unlink } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type PlatformStatus = "connected" | "not_connected" | "syncing" | "error";

export type PlatformCardProps = {
  id: string;
  name: string;
  handle?: string;
  icon: LucideIcon | React.ComponentType<React.SVGProps<SVGSVGElement>>;
  color: string;
  description: string;
  status: PlatformStatus;
  rating?: number | null;
  rank?: string | null;
  problemsSolved?: number | null;
  profileUrl?: string | null;
  lastSynced?: Date | null;
  onSync?: () => void;
  onLink?: () => void;
  onUnlink?: () => void;
};

const STATUS_BADGE: Record<PlatformStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  connected:     { label: "Connected",    variant: "default" },
  not_connected: { label: "Not linked",   variant: "outline" },
  syncing:       { label: "Syncing…",     variant: "secondary" },
  error:         { label: "Sync error",   variant: "destructive" },
};

export function PlatformCard({
  id,
  name,
  handle,
  icon: Icon,
  color,
  description,
  status,
  rating,
  rank,
  problemsSolved,
  profileUrl,
  lastSynced,
  onSync,
  onLink,
  onUnlink,
}: PlatformCardProps) {
  const badge = STATUS_BADGE[status];
  const isConnected = status === "connected" || status === "syncing" || status === "error";

  return (
    <motion.div
      id={`platform-card-${id}`}
      whileHover={{ y: -2, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <Card className="relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm h-full">
        {/* Gradient accent bar */}
        <div
          className="absolute top-0 left-0 right-0 h-0.5"
          style={{ background: `linear-gradient(90deg, ${color}aa, ${color}22)` }}
        />

        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              {/* Icon bubble */}
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl shadow-lg"
                style={{ background: `${color}20`, border: `1px solid ${color}40` }}
              >
                <Icon
                  className="h-5 w-5"
                  style={{ color }}
                />
              </div>
              <div>
                <CardTitle className="text-base">{name}</CardTitle>
                {handle ? (
                  <p className="text-xs text-muted-foreground mt-0.5">@{handle}</p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                )}
              </div>
            </div>
            <Badge variant={badge.variant} className="shrink-0 text-xs">
              {badge.label}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Stats grid */}
          {isConnected && (
            <div className="grid grid-cols-2 gap-2">
              {rating != null && (
                <StatChip label="Rating" value={rating.toLocaleString()} color={color} />
              )}
              {rank != null && (
                <StatChip label="Rank" value={rank} color={color} />
              )}
              {problemsSolved != null && (
                <StatChip label="Solved" value={problemsSolved.toLocaleString()} color={color} />
              )}
              {lastSynced && (
                <StatChip
                  label="Synced"
                  value={timeAgo(lastSynced)}
                  color="hsl(240 5% 55%)"
                />
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            {isConnected ? (
              <>
                <Button
                  id={`sync-${id}`}
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-xs flex-1"
                  onClick={onSync}
                  disabled={status === "syncing"}
                >
                  <RefreshCw className={`h-3 w-3 ${status === "syncing" ? "animate-spin" : ""}`} />
                  {status === "syncing" ? "Syncing" : "Sync now"}
                </Button>
                {profileUrl && (
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" asChild>
                    <a href={profileUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                )}
                <Button
                  id={`unlink-${id}`}
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                  onClick={onUnlink}
                >
                  <Unlink className="h-3 w-3" />
                </Button>
              </>
            ) : (
              <Button
                id={`link-${id}`}
                variant="outline"
                size="sm"
                className="h-7 gap-1 text-xs w-full"
                onClick={onLink}
                style={{ borderColor: `${color}40`, color }}
              >
                <Link2 className="h-3 w-3" />
                Connect {name}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function StatChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg p-2 bg-background/50 border border-border/30">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-sm font-semibold mt-0.5" style={{ color }}>{value}</p>
    </div>
  );
}

export function PlatformCardSkeleton() {
  return (
    <Card className="border-border/50 bg-card/50 h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-12 rounded-lg" />
          <Skeleton className="h-12 rounded-lg" />
        </div>
        <Skeleton className="h-7 w-full rounded-md" />
      </CardContent>
    </Card>
  );
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
