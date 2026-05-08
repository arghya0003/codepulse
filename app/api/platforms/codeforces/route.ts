import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getCached, setCached, CACHE_KEYS, checkRateLimit } from "@/lib/redis";
import { getUserPlatforms, updatePlatformStats } from "@/actions/platforms";
import { upsertSnapshots } from "@/actions/contributions";
import { fetchAllowed } from "@/lib/fetch-allowed";

export async function GET(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed } = await checkRateLimit(clerkId, "codeforces");
  if (!allowed) return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });

  const profiles = await getUserPlatforms(clerkId);
  const cfProfile = profiles.find((p) => p.platform === "codeforces");
  if (!cfProfile) return NextResponse.json({ error: "Codeforces not connected." }, { status: 404 });

  const handle = cfProfile.handle;
  const cacheKey = CACHE_KEYS.platformData("codeforces", handle);
  const cached = await getCached(cacheKey);
  if (cached) return NextResponse.json({ ...cached as object, source: "cache" });

  try {
    // ── Profile + submissions + rating history in parallel ────────────────────
    const [infoRes, subRes, histRes] = await Promise.all([
      fetchAllowed(`https://codeforces.com/api/user.info?handles=${encodeURIComponent(handle)}`),
      fetchAllowed(`https://codeforces.com/api/user.status?handle=${encodeURIComponent(handle)}&from=1&count=10000`),
      fetchAllowed(`https://codeforces.com/api/user.rating?handle=${encodeURIComponent(handle)}`),
    ]);

    if (!infoRes.ok) throw new Error(`CF user.info ${infoRes.status}`);
    const infoData = await infoRes.json();
    if (infoData.status !== "OK") throw new Error(`CF API: ${infoData.comment ?? "error"}`);
    const cfUser = infoData.result[0];

    const rating     = cfUser.rating    ?? null;
    const maxRating  = cfUser.maxRating ?? null;
    const rank       = cfUser.rank      ?? null;
    const maxRank    = cfUser.maxRank   ?? null;
    const avatarUrl  = cfUser.titlePhoto ?? null;
    const displayName = [cfUser.firstName, cfUser.lastName].filter(Boolean).join(" ") || handle;

    // ── Build heatmap + unique solved count from submissions ─────────────────
    const snapshots: { date: string; count: number }[] = [];
    let problemsSolved = 0;

    if (subRes.ok) {
      const subData = await subRes.json();
      if (subData.status === "OK") {
        const dateMap = new Map<string, number>();
        const solvedSet = new Set<string>();
        for (const sub of subData.result as any[]) {
          if (sub.verdict === "OK") {
            if (sub.creationTimeSeconds) {
              const date = new Date(sub.creationTimeSeconds * 1000).toISOString().split("T")[0];
              dateMap.set(date, (dateMap.get(date) ?? 0) + 1);
            }
            solvedSet.add(`${sub.problem.contestId}-${sub.problem.index}`);
          }
        }
        for (const [date, count] of Array.from(dateMap.entries())) snapshots.push({ date, count });
        problemsSolved = solvedSet.size;
      }
    }

    // ── Rating history ────────────────────────────────────────────────────────
    let ratingHistory: any[] = [];
    if (histRes.ok) {
      const histData = await histRes.json();
      if (histData.status === "OK") {
        ratingHistory = histData.result.map((h: any) => ({
          contestName: h.contestName,
          rating: h.newRating,
          rank: h.rank,
          contestDate: h.ratingUpdateTimeSeconds,
        }));
      }
    }

    await upsertSnapshots(clerkId, "codeforces", snapshots);
    await updatePlatformStats(clerkId, "codeforces", {
      rating: rating ?? undefined,
      rank: rank ?? undefined,
      problemsSolved,
      displayName,
      avatarUrl: avatarUrl ?? undefined,
      profileUrl: `https://codeforces.com/profile/${handle}`,
      metadata: { maxRating, maxRank, ratingHistory },
    });

    const result = { handle, rating, rank, problemsSolved, displayName, avatarUrl, snapshotCount: snapshots.length };
    await setCached(cacheKey, result);
    return NextResponse.json({ ...result, source: "api" });

  } catch (err) {
    console.error("[codeforces] Sync error:", err);
    return NextResponse.json({ error: "Failed to fetch Codeforces data. Check your handle." }, { status: 502 });
  }
}
