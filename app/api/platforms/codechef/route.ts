import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getCached, setCached, CACHE_KEYS, checkRateLimit } from "@/lib/redis";
import { getUserPlatforms, updatePlatformStats } from "@/actions/platforms";
import { upsertSnapshots } from "@/actions/contributions";
import { fetchAllowed } from "@/lib/fetch-allowed";

const HADES_BASE = "https://hades.mani.works/api";

/**
 * CodeChef platform sync.
 * Uses the Hades unified API (hades.mani.works) to fetch
 * profile data including rating, star rank, and problems solved.
 *
 * Note: Hades CodeChef currently does not expose a submission
 * calendar endpoint, so heatmap snapshots are not available.
 */
export async function GET(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { allowed, remaining } = await checkRateLimit(clerkId, "codechef");
  if (!allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again in 60 seconds." },
      { status: 429, headers: { "X-RateLimit-Remaining": remaining.toString() } }
    );
  }

  const profiles = await getUserPlatforms(clerkId);
  const ccProfile = profiles.find((p) => p.platform === "codechef");
  if (!ccProfile) {
    return NextResponse.json(
      { error: "CodeChef account not connected. Link it in Settings." },
      { status: 404 }
    );
  }
  const handle = ccProfile.handle;

  const cacheKey = CACHE_KEYS.platformData("codechef", handle);
  const cached = await getCached(cacheKey);
  if (cached) {
    return NextResponse.json({ ...cached as object, source: "cache" });
  }

  try {
    // ── Fetch user profile from Hades ──────────────────────────────────────────
    const profileRes = await fetchAllowed(
      `${HADES_BASE}/codechef/user/${encodeURIComponent(handle)}`
    );
    if (!profileRes.ok) {
      throw new Error(
        `Hades CC profile error: ${profileRes.status} ${profileRes.statusText}`
      );
    }
    const profileJson = await profileRes.json();

    // Hades CodeChef response: { status, data: { username, country, problemSolved, rating: {...}, contests: [...] } }
    const cc = profileJson?.data;
    if (!cc) {
      throw new Error("No CodeChef data returned from Hades");
    }

    // ── Fetch heatmap data via scraping (Hades doesn't provide it) ─────────────
    let snapshots: any[] = [];
    try {
      const scraperRes = await fetchAllowed(
        `https://www.codechef.com/users/${encodeURIComponent(handle)}`,
        { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" } }
      );
      if (scraperRes.ok) {
        const html = await scraperRes.text();
        const statsMatch = html.match(/var userDailySubmissionsStats = (\[.*?\]);/);
        const ratingMatch = html.match(/var all_rating = (\[.*?\]);/);

        if (statsMatch && statsMatch[1]) {
          const rawStats = JSON.parse(statsMatch[1]);
          snapshots = rawStats.map((s: any) => ({
            date: s.date.split("-").map((p: string) => p.padStart(2, "0")).join("-"),
            count: s.value,
          }));
          
          // Fix date format: 2025-1-6 -> 2025-01-06
          snapshots = snapshots.map(s => {
            const parts = s.date.split("-");
            if (parts[1].length === 1) parts[1] = "0" + parts[1];
            if (parts[2].length === 1) parts[2] = "0" + parts[2];
            return { ...s, date: parts.join("-") };
          });
        }

        if (ratingMatch && ratingMatch[1]) {
          const rawHistory = JSON.parse(ratingMatch[1]);
          cc.ratingHistory = rawHistory.map((h: any) => ({
            contestName: h.name,
            rating: parseInt(h.rating),
            rank: h.rank,
            contestDate: Math.floor(new Date(h.end_date.replace(" ", "T")).getTime() / 1000),
          }));
        }
      }
    } catch (scrapeErr) {
      console.warn("[codechef] Scraper failed, falling back to empty heatmap:", scrapeErr);
    }

    // rating.currentRatingNumber can contain trailing whitespace / extra text
    const rawRating = String(cc.rating?.currentRatingNumber ?? "").trim();
    const rating = rawRating ? (parseInt(rawRating, 10) || null) : null;

    // ratingStar is already formatted as "★★★★★★★"
    const rank = cc.rating?.ratingStar || null;

    // highestRating can be "2700(Highest" – extract the number
    const rawHighest = String(cc.rating?.highestRating ?? "").trim();
    const maxRating = rawHighest ? (parseInt(rawHighest, 10) || null) : null;

    const globalRank = cc.rating?.globalRank ?? null;
    const countryRank = cc.rating?.countryRank ?? null;

    // problemSolved is a string in Hades response
    const problemsSolved = parseInt(String(cc.problemSolved ?? "0"), 10) || 0;

    const displayName = cc.username || handle;

    // ── Persist snapshots ────────────────────────────────────────────────
    if (snapshots.length > 0) {
      await upsertSnapshots(clerkId, "codechef", snapshots);
    }

    const statsPayload = {
      handle,
      rating,
      rank,
      problemsSolved,
      displayName,
      profileUrl: `https://www.codechef.com/users/${handle}`,
    };

    await updatePlatformStats(clerkId, "codechef", {
      rating:        rating   ?? undefined,
      rank:          rank     ?? undefined,
      problemsSolved,
      displayName,
      profileUrl: `https://www.codechef.com/users/${handle}`,
      metadata: {
        maxRating,
        globalRank,
        countryRank,
        ratingHistory: cc.ratingHistory || [],
        lastScraped: snapshots.length > 0 ? new Date() : null,
      },
    });

    const result = { ...statsPayload, snapshotCount: snapshots.length };
    await setCached(cacheKey, result);
    return NextResponse.json({ ...result, source: "api" });
  } catch (err) {
    console.error("[codechef] Sync error:", err);
    return NextResponse.json(
      { error: "Failed to fetch CodeChef data. Check your handle." },
      { status: 502 }
    );
  }
}
