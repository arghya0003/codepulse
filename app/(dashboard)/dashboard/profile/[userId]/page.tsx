import { notFound } from "next/navigation";
import { getUserProfile } from "@/actions/users";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Code2, Trophy, Star, GitCommit, ExternalLink, Calendar, Activity } from "lucide-react";

const GithubIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.2c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

const PLATFORM_META: Record<string, { label: string; Icon: React.ComponentType<any>; color: string }> = {
  github:     { label: "GitHub",     Icon: GithubIcon, color: "hsl(210 100% 60%)" },
  leetcode:   { label: "LeetCode",   Icon: Code2,      color: "hsl(38 92% 55%)"  },
  codeforces: { label: "Codeforces", Icon: Trophy,     color: "hsl(0 72% 55%)"   },
  codechef:   { label: "CodeChef",   Icon: Star,       color: "hsl(38 80% 45%)"  },
};

function timeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 86400 * 30) return `${Math.floor(seconds / 86400)}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export default async function UserProfilePage({
  params,
}: {
  params: { userId: string };
}) {
  const profile = await getUserProfile(params.userId);
  if (!profile) notFound();

  const { user, platforms, totalContributions } = profile;

  const displayName =
    user.username ||
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    "User";

  const totalSolved = platforms.reduce(
    (sum, p) => sum + (p.problemsSolved ?? 0),
    0
  );

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : null;

  return (
    <div className="max-w-4xl mx-auto space-y-8">

      {/* ── Profile header ── */}
      <Card className="border-border/50 bg-card/50 overflow-hidden">
        {/* Top accent gradient */}
        <div className="h-24 w-full relative"
          style={{ background: "linear-gradient(135deg, hsl(265 89% 58% / 0.25) 0%, hsl(210 100% 56% / 0.15) 100%)" }}>
          <div className="absolute inset-0"
            style={{ backgroundImage: "radial-gradient(circle at 20% 50%, hsl(265 89% 58% / 0.12), transparent 60%)" }} />
        </div>

        <CardContent className="pt-0 pb-6 px-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 -mt-10">
            {/* Avatar */}
            <Avatar className="h-20 w-20 ring-4 ring-background shrink-0">
              <AvatarImage src={user.imageUrl ?? ""} />
              <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            {/* Name + meta */}
            <div className="flex-1 pb-1">
              <h1 className="text-2xl font-bold tracking-tight">{displayName}</h1>
              <div className="flex flex-wrap items-center gap-3 mt-1.5">
                {user.username && (
                  <span className="text-sm text-muted-foreground">@{user.username}</span>
                )}
                {memberSince && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    Joined {memberSince}
                  </span>
                )}
                <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                  {platforms.length} platform{platforms.length !== 1 ? "s" : ""} linked
                </Badge>
              </div>
            </div>
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-border/50">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{totalContributions.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center justify-center gap-1">
                <Activity className="h-3 w-3" /> Total contributions
              </p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-400">{totalSolved.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center justify-center gap-1">
                <Code2 className="h-3 w-3" /> Problems solved
              </p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-400">{platforms.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center justify-center gap-1">
                <GitCommit className="h-3 w-3" /> Platforms
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Platform cards ── */}
      {platforms.length > 0 ? (
        <div>
          <h2 className="text-lg font-semibold mb-4">Platforms</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {platforms.map((p) => {
              const meta = PLATFORM_META[p.platform];
              if (!meta) return null;
              const { label, Icon, color } = meta;
              return (
                <Card key={p.platform} className="border-border/50 bg-card/50 overflow-hidden">
                  {/* Color accent bar */}
                  <div className="h-0.5" style={{ background: `linear-gradient(90deg, ${color}bb, ${color}22)` }} />

                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl"
                          style={{ background: `${color}20`, border: `1px solid ${color}40` }}>
                          <Icon className="h-5 w-5" style={{ color }} />
                        </div>
                        <div>
                          <CardTitle className="text-base">{label}</CardTitle>
                          {p.handle && (
                            <p className="text-xs text-muted-foreground mt-0.5">@{p.handle}</p>
                          )}
                        </div>
                      </div>
                      {p.profileUrl && (
                        <a href={p.profileUrl} target="_blank" rel="noopener noreferrer"
                          className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="grid grid-cols-2 gap-2">
                      {p.rating != null && p.rating > 0 && (
                        <StatCell label="Rating" value={p.rating.toLocaleString()} color={color} />
                      )}
                      {p.rank && (
                        <StatCell label="Rank" value={p.rank} color={color} />
                      )}
                      {p.problemsSolved != null && p.problemsSolved > 0 && (
                        <StatCell label="Solved" value={p.problemsSolved.toLocaleString()} color={color} />
                      )}
                      {p.contributions > 0 && (
                        <StatCell label="Contributions" value={p.contributions.toLocaleString()} color="hsl(265 89% 68%)" />
                      )}
                      {p.lastSynced && (
                        <StatCell label="Last synced" value={timeAgo(p.lastSynced)} color="hsl(240 5% 55%)" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ) : (
        <Card className="border-border/50 bg-card/50">
          <CardContent className="py-12 text-center text-muted-foreground">
            This user hasn't linked any platforms yet.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCell({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg p-2.5 bg-background/50 border border-border/30">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-sm font-semibold mt-0.5" style={{ color }}>{value}</p>
    </div>
  );
}
