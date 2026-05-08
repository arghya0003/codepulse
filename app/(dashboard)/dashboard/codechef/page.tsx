import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getUserByClerkId } from "@/actions/users";
import { getUserPlatforms } from "@/actions/platforms";
import { getAllPlatformSnapshots } from "@/actions/contributions";
import { CodeChefDashboardClient } from "./codechef-dashboard-client";

export const metadata: Metadata = {
  title: "CodeChef Dashboard | CodePulse",
  description: "Your CodeChef competitive programming insights",
};

export default async function CodeChefDashboardPage() {
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

      // Get CodeChef profile
      const codechefProfile = platforms.find((p) => p.platform === "codechef");
      if (codechefProfile) {
        profile = codechefProfile;
        
        // Filter snapshots for CodeChef only
        snapshots = allSnapshots.filter((s) => s.platform === "codechef");
      }
    }
  } catch (err) {
    console.error("[codechef-dashboard] DB fetch failed:", err);
    dbError = err instanceof Error ? err.message : "Database unavailable";
  }

  if (!profile && !dbError) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-16">
            <h1 className="text-4xl font-bold mb-4">CodeChef Dashboard</h1>
            <p className="text-muted-foreground mb-8">No CodeChef account connected yet</p>
            <a
              href="/dashboard/settings?link=codechef"
              className="inline-block px-6 py-3 bg-[#5B4638] hover:bg-[#4A392D] text-white rounded-lg transition-colors"
            >
              Link CodeChef Account
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <CodeChefDashboardClient
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