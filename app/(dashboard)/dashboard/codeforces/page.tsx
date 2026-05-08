import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getUserByClerkId } from "@/actions/users";
import { getUserPlatforms } from "@/actions/platforms";
import { getAllPlatformSnapshots } from "@/actions/contributions";
import { CodeforcesDashboardClient } from "./codeforces-dashboard-client";

export const metadata: Metadata = {
  title: "Codeforces Dashboard | CodePulse",
  description: "Your Codeforces competitive programming insights",
};

export default async function CodeforcesDashboardPage() {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/sign-in");

  const clerkUser = await currentUser();

  let dbUser = null;
  let profile = null;
  let snapshots: any[] = [];
  let dbError: string | null = null;

  try {
    dbUser = await getUserByClerkId(clerkId);

    if (dbUser) {
      // Fetch all platforms and snapshots using existing actions
      const [platforms, allSnapshots] = await Promise.all([
        getUserPlatforms(clerkId),
        getAllPlatformSnapshots(clerkId),
      ]);

      // Get Codeforces profile
      const codeforcesProfile = platforms.find((p) => p.platform === "codeforces");
      if (codeforcesProfile) {
        profile = codeforcesProfile;
        
        // Filter snapshots for Codeforces only
        snapshots = allSnapshots.filter((s) => s.platform === "codeforces");
      }
    }
  } catch (err) {
    console.error("[codeforces-dashboard] DB fetch failed:", err);
    dbError = err instanceof Error ? err.message : "Database unavailable";
  }

  if (!profile && !dbError) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-16">
            <h1 className="text-4xl font-bold mb-4">Codeforces Dashboard</h1>
            <p className="text-muted-foreground mb-8">No Codeforces account connected yet</p>
            <a
              href="/dashboard/settings?link=codeforces"
              className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Link Codeforces Account
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <CodeforcesDashboardClient
      clerkId={clerkId}
      clerkUser={{
        firstName: clerkUser?.firstName ?? null,
        imageUrl: clerkUser?.imageUrl ?? null,
      }}
      profile={profile}
      snapshots={snapshots}
      dbError={dbError}
    />
  );
}