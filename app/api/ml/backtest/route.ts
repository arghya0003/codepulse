import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getAllPlatformSnapshots } from "@/actions/contributions";
import { runBacktest } from "@/lib/ml-client";

export const maxDuration = 60;

export async function GET() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.ML_SERVICE_URL) {
    return NextResponse.json({ error: "ML service not configured" }, { status: 503 });
  }

  try {
    const snapshots = await getAllPlatformSnapshots(clerkId);
    const submissions = snapshots
      .filter((s) => s.count > 0)
      .map((s) => ({ date: s.date, count: s.count }));

    if (submissions.length === 0) {
      return NextResponse.json({ error: "No data — sync a platform first" }, { status: 422 });
    }

    const data = await runBacktest(submissions, { test_weeks: 4, n_splits: 3, top_k: 10 });
    if (!data) return NextResponse.json({ error: "ML service unavailable" }, { status: 503 });

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("[api/ml/backtest]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
