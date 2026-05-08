import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getCached, setCached, CACHE_KEYS, checkRateLimit } from "@/lib/redis";
import { getUserPlatforms, updatePlatformStats } from "@/actions/platforms";
import { upsertSnapshots } from "@/actions/contributions";
import { fetchAllowed } from "@/lib/fetch-allowed";

const HADES_BASE = "https://hades.mani.works/api";

/**
 * Codeforces platform sync.
 * Uses the Hades unified API (hades.mani.works) to fetch
 * profile data and submission history.
 */
export async function GET(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { allowed, remaining } = await checkRateLimit(clerkId, "codeforces");
  if (!allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again in 60 seconds." },
      { status: 429, headers: { "X-RateLimit-Remaining": remaining.toString() } }
    );
  }

  const profiles = await getUserPlatforms(clerkId);
  const cfProfile = profiles.find((p) => p.platform === "codeforces");
  if (!cfProfile) {
    return NextResponse.json(
      { error: "Codeforces account not connected. Link it in Settings." },
      { status: 404 }
    );
  }
  const handle = cfProfile.handle;

  const cacheKey = CACHE_KEYS.platformData("codeforces", handle);
  const cached = await getCached(cacheKey);
  if (cached) {
    return NextResponse.json({ ...cached as object, source: "cache" });
  }

  try {
    // ── 1. Fetch user profile ─────────────────────────────────────────────────
    const profileRes = await fetchAllowed(
      `${HADES_BASE}/codeforces/user/${encodeURIComponent(handle)}`
    );
    if (!profileRes.ok) {
      throw new Error(`Hades CF profile error: ${profileRes.status} ${profileRes.statusText}`);
    }
    const profileJson = await profileRes.json();

    // Hades wraps the raw CF API response: { status, data: { status, result: [...] } }
    const cfUser = profileJson?.data?.result?.[0];
    if (!cfUser) {
      throw new Error("No Codeforces user data returned from Hades");
    }

    const rating     = cfUser.rating     ?? null;
    const maxRating  = cfUser.maxRating  ?? null;
    const rank       = cfUser.rank       ?? null;
    const maxRank    = cfUser.maxRank    ?? null;
    const avatarUrl  = cfUser.titlePhoto ?? cfUser.avatar ?? null;
    const displayName =
      [cfUser.firstName, cfUser.lastName].filter(Boolean).join(" ") || handle;

    // ── 2. Fetch submission history for heatmap ───────────────────────────────
    const calRes = await fetchAllowed(
      `${HADES_BASE}/codeforces/user/${encodeURIComponent(handle)}/calendar`
    );

    const snapshots: { date: string; count: number }[] = [];
    if (calRes.ok) {
      const calJson = await calRes.json();
      const submissions: any[] = calJson?.data?.result ?? [];

      // Aggregate AC submissions per calendar date
      const dateMap = new Map<string, number>();
      for (const sub of submissions) {
        if (sub.verdict === "OK" && sub.creationTimeSeconds) {
          const date = new Date(sub.creationTimeSeconds * 1000)
            .toISOString()
            .split("T")[0];
          dateMap.set(date, (dateMap.get(date) ?? 0) + 1);
        }
      }
      for (const [date, count] of Array.from(dateMap.entries())) {
        snapshots.push({ date, count });
      }
    }

    // ── 3. Fetch rating history for graph ────────────────────────────────────
    let ratingHistory: any[] = [];
    try {
      const historyRes = await fetchAllowed(
        `https://codeforces.com/api/user.rating?handle=${encodeURIComponent(handle)}`
      );
      if (historyRes.ok) {
        const historyJson = await historyRes.json();
        if (historyJson.status === "OK") {
          ratingHistory = historyJson.result.map((h: any) => ({
            contestName: h.contestName,
            rating: h.newRating,
            rank: h.rank,
            contestDate: h.ratingUpdateTimeSeconds,
          }));
        }
      }
    } catch (err) {
      console.warn("[codeforces] Rating history fetch failed:", err);
    }

    await upsertSnapshots(clerkId, "codeforces", snapshots);

    const statsPayload = {
      handle,
      rating,
      rank,
      problemsSolved: snapshots.reduce((sum, s) => sum + s.count, 0), // best approximation from submissions
      displayName,
      avatarUrl,
      profileUrl: `https://codeforces.com/profile/${handle}`,
    };

    await updatePlatformStats(clerkId, "codeforces", {
      rating:       rating    ?? undefined,
      rank:         rank      ?? undefined,
      problemsSolved: statsPayload.problemsSolved,
      displayName,
      avatarUrl:    avatarUrl ?? undefined,
      profileUrl:   `https://codeforces.com/profile/${handle}`,
      metadata: {
        maxRating,
        maxRank,
        ratingHistory,
      },
    });

    const result = { ...statsPayload, snapshotCount: snapshots.length };
    await setCached(cacheKey, result);
    return NextResponse.json({ ...result, source: "api" });
  } catch (err) {
    console.error("[codeforces] Sync error:", err);
    return NextResponse.json(
      { error: "Failed to fetch Codeforces data. Check your handle." },
      { status: 502 }
    );
  }
}
