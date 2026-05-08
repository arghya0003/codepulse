import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getUserByClerkId } from "@/actions/users";
import { getUserPlatforms } from "@/actions/platforms";
import { getAllPlatformSnapshots } from "@/actions/contributions";
import { GitHubDashboardClient } from "./github-dashboard-client";

export const metadata: Metadata = {
  title: "GitHub Dashboard | CodePulse",
  description: "Your GitHub contribution insights",
};

type PinnedRepo = {
  name: string;
  description?: string;
  url: string;
  stargazerCount: number;
  primaryLanguage?: { name: string; color: string };
  isPrivate: boolean;
};

export default async function GitHubDashboardPage() {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/sign-in");

  const clerkUser = await currentUser();

  let dbUser = null;
  let profile = null;
  let snapshots: any[] = [];
  let pinnedRepos: PinnedRepo[] = [];
  let dbError: string | null = null;

  try {
    dbUser = await getUserByClerkId(clerkId);

    if (dbUser) {
      // Fetch all platforms and snapshots using existing actions
      const [platforms, allSnapshots] = await Promise.all([
        getUserPlatforms(clerkId),
        getAllPlatformSnapshots(clerkId),
      ]);

      // Get GitHub profile
      const githubProfile = platforms.find((p) => p.platform === "github");
      if (githubProfile) {
        profile = githubProfile;
        pinnedRepos = (githubProfile.metadata?.pinnedRepos as PinnedRepo[]) || [];
        
        // Filter snapshots for GitHub only
        snapshots = allSnapshots.filter((s) => s.platform === "github");
      }
    }
  } catch (err) {
    console.error("[github-dashboard] DB fetch failed:", err);
    dbError = err instanceof Error ? err.message : "Database unavailable";
  }

  if (!profile && !dbError) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-16">
            <h1 className="text-4xl font-bold mb-4">GitHub Dashboard</h1>
            <p className="text-muted-foreground mb-8">No GitHub account connected yet</p>
            <a
              href="/dashboard/settings?link=github"
              className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Link GitHub Account
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <GitHubDashboardClient
      clerkId={clerkId}
      clerkUser={{
        firstName: clerkUser?.firstName ?? null,
        imageUrl: clerkUser?.imageUrl ?? null,
      }}
      profile={profile}
      snapshots={snapshots}
      pinnedRepos={pinnedRepos}
      dbError={dbError}
    />
  );
}
