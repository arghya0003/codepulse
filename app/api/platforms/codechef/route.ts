import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getCached, setCached, CACHE_KEYS, checkRateLimit } from "@/lib/redis";
import { getUserPlatforms, updatePlatformStats } from "@/actions/platforms";
import { upsertSnapshots } from "@/actions/contributions";
import { fetchAllowed } from "@/lib/fetch-allowed";

export async function GET(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed } = await checkRateLimit(clerkId, "codechef");
  if (!allowed) return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });

  const profiles = await getUserPlatforms(clerkId);
  const ccProfile = profiles.find((p) => p.platform === "codechef");
  if (!ccProfile) return NextResponse.json({ error: "CodeChef not connected." }, { status: 404 });

  const handle = ccProfile.handle;
  const cacheKey = CACHE_KEYS.platformData("codechef", handle);
  const cached = await getCached(cacheKey);
  if (cached) return NextResponse.json({ ...cached as object, source: "cache" });

  try {
    // ── Profile via codechef-api.vercel.app ───────────────────────────────────
    const profileRes = await fetchAllowed(`https://codechef-api.vercel.app/${encodeURIComponent(handle)}`);
    if (!profileRes.ok) throw new Error(`CodeChef API error: ${profileRes.status}`);
    const cc = await profileRes.json();
    if (!cc.success) throw new Error("CodeChef API returned unsuccessful response");

    const rating       = cc.currentRating   ?? null;
    const maxRating    = cc.highestRating    ?? null;
    const rank         = cc.stars           ?? null;
    const globalRank   = cc.globalRank      ?? null;
    const countryRank  = cc.countryRank     ?? null;
    const problemsSolved = cc.totalProblemsSolved ?? 0;
    const displayName  = cc.name || handle;

    // ── Heatmap from API response ──────────────────────────────────────────────
    const snapshots: { date: string; count: number }[] = [];
    if (Array.isArray(cc.heatMap)) {
      for (const entry of cc.heatMap) {
        if (entry.date && entry.value > 0) {
          snapshots.push({ date: entry.date, count: entry.value });
        }
      }
    }

    // ── Rating history ─────────────────────────────────────────────────────────
    const ratingHistory = Array.isArray(cc.ratingData)
      ? cc.ratingData.map((h: any) => ({
          contestName: h.name,
          rating: Number(h.rating),
          rank: h.rank,
          contestDate: h.end_date
            ? Math.floor(new Date(h.end_date).getTime() / 1000)
            : null,
        }))
      : [];

    if (snapshots.length > 0) await upsertSnapshots(clerkId, "codechef", snapshots);

    await updatePlatformStats(clerkId, "codechef", {
      rating: rating ?? undefined,
      rank: rank ?? undefined,
      problemsSolved,
      displayName,
      profileUrl: `https://www.codechef.com/users/${handle}`,
      metadata: { maxRating, globalRank, countryRank, ratingHistory },
    });

    const result = { handle, rating, rank, problemsSolved, displayName, snapshotCount: snapshots.length };
    await setCached(cacheKey, result);
    return NextResponse.json({ ...result, source: "api" });

  } catch (err) {
    console.error("[codechef] Sync error:", err);
    return NextResponse.json({ error: "Failed to fetch CodeChef data. Check your handle." }, { status: 502 });
  }
}
