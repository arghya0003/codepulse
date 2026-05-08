import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getUserPlatforms } from "@/actions/platforms";
import { getAllPlatformSnapshots } from "@/actions/contributions";
import { predictPeakTime, type MlPeakTimeData } from "@/lib/ml-client";
import { AnalyticsClient } from "./analytics-client";

export const metadata: Metadata = {
  title: "Analytics | CodePulse",
  description: "Deep dive into your coding activity patterns",
};

export default async function AnalyticsPage() {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/sign-in");

  let platforms: Awaited<ReturnType<typeof getUserPlatforms>> = [];
  let snapshots: Awaited<ReturnType<typeof getAllPlatformSnapshots>> = [];
  let dbError: string | null = null;

  try {
    [platforms, snapshots] = await Promise.all([
      getUserPlatforms(clerkId),
      getAllPlatformSnapshots(clerkId),
    ]);
  } catch (err) {
    console.error("[analytics] DB fetch failed:", err);
    dbError = err instanceof Error ? err.message : "Database unavailable";
  }

  let mlPeakTime: MlPeakTimeData | null = null;
  if (snapshots.length > 0 && process.env.ML_SERVICE_URL) {
    const submissions = snapshots
      .filter((s) => s.count > 0)
      .map((s) => ({ date: s.date, count: s.count }));
    mlPeakTime = await predictPeakTime(submissions);
  }

  return (
    <AnalyticsClient
      platforms={platforms}
      snapshots={snapshots}
      dbError={dbError}
      mlPeakTime={mlPeakTime}
    />
  );
}
