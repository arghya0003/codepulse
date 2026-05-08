import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getUserPlatforms } from "@/actions/platforms";
import { getAllPlatformSnapshots } from "@/actions/contributions";
import { getUserByClerkId, upsertUser } from "@/actions/users";
import { DashboardClient } from "./dashboard-client";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your unified coding dashboard",
};

export default async function DashboardPage() {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/sign-in");

  const clerkUser = await currentUser();

  // Gracefully handle DB errors (e.g. tables not yet migrated,
  // or user not yet in DB because webhook isn't configured yet)
  let dbUser = null;
  let platforms: Parameters<typeof DashboardClient>[0]["platforms"] = [];
  let snapshots: Parameters<typeof DashboardClient>[0]["snapshots"] = [];
  let dbError: string | null = null;

  try {
    let foundUser = await getUserByClerkId(clerkId);

    // Auto-create user on first login if webhook hasn't fired yet
    if (!foundUser && clerkUser) {
      const email = clerkUser.emailAddresses?.[0]?.emailAddress;
      if (email) {
        await upsertUser({
          clerkId,
          email,
          firstName: clerkUser.firstName ?? null,
          lastName: clerkUser.lastName ?? null,
          username: clerkUser.username ?? null,
          imageUrl: clerkUser.imageUrl ?? null,
        });
        foundUser = await getUserByClerkId(clerkId);
      }
    }

    const [platformsResult, snapshotsResult] = await Promise.all([
      getUserPlatforms(clerkId),
      getAllPlatformSnapshots(clerkId),
    ]) as any;

    dbUser = foundUser;
    platforms = platformsResult;
    snapshots = snapshotsResult;
  } catch (err) {
    console.error("[dashboard] DB fetch failed:", err);
    dbError =
      err instanceof Error ? err.message : "Database unavailable";
  }

  return (
    <DashboardClient
      user={dbUser}
      clerkUser={{
        firstName: clerkUser?.firstName ?? null,
        imageUrl: clerkUser?.imageUrl ?? null,
      }}
      platforms={platforms}
      snapshots={snapshots}
      clerkId={clerkId}
      dbError={dbError}
    />
  );
}
