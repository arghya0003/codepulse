import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import * as cheerio from "cheerio";
import { getCached, setCached, CACHE_KEYS, checkRateLimit } from "@/lib/redis";
import { getUserPlatforms, updatePlatformStats } from "@/actions/platforms";
import { upsertSnapshots } from "@/actions/contributions";

export async function GET(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed } = await checkRateLimit(clerkId, "codechef");
  if (!allowed) return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });

  const profiles = await getUserPlatforms(clerkId);
  const ccProfile = profiles.find((p) => p.platform === "codechef");
  if (!ccProfile) return NextResponse.json({ error: "CodeChef not connected." }, { status: 404 });

  const handle = ccProfile.handle;
  const forceRefresh = req.nextUrl.searchParams.get("force") === "true";
  const cacheKey = CACHE_KEYS.platformData("codechef", handle);
  if (!forceRefresh) {
    const cached = await getCached(cacheKey);
    if (cached) return NextResponse.json({ ...cached as object, source: "cache" });
  }

  try {
    const res = await fetch(`https://www.codechef.com/users/${encodeURIComponent(handle)}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });

    if (!res.ok) throw new Error(`CodeChef returned ${res.status}`);

    const html = await res.text();
    const $ = cheerio.load(html);

    // ── Extract fields using the same selectors as hades ─────────────────────
    const username       = $(".m-username--link").first().text().trim() || handle;
    const country        = $(".user-country-name").text().trim();
    const ratingNumber   = $(".rating-number").text().trim();
    const ratingStar     = $(".rating-star").text().trim();

    // Highest rating: ".rating-header small" → "(Highest Rating 3445)(Highest Rating 0)" → first match
    const highestRatingMatch = $(".rating-header small").text().match(/\(Highest Rating (\d+)\)/);
    const highestRating  = highestRatingMatch ? highestRatingMatch[1] : null;

    const globalRank     = $(".rating-ranks strong").first().text().trim();
    const countryRank    = $(".rating-ranks strong").last().text().trim();

    // problemSolved: ".problems-solved h3" eq(3) → "Total Problems Solved: 42" → split → [3]
    const problemSolvedRaw = $(".problems-solved h3").eq(3).text().trim().split(" ");
    const problemSolvedStr = problemSolvedRaw[problemSolvedRaw.length - 1];

    // ── Heatmap: embedded JS variable in page ─────────────────────────────────
    // Format: var userDailySubmissionsStats = [{"date":"2024-8-6","value":1}]
    const heatmapMatch = html.match(/var userDailySubmissionsStats = (\[[\s\S]*?\]);/);
    const snapshots: { date: string; count: number }[] = [];
    if (heatmapMatch) {
      const raw: { date: string; value: number }[] = JSON.parse(heatmapMatch[1]);
      for (const entry of raw) {
        if (entry.value > 0 && entry.date) {
          // Normalize "YYYY-M-D" → "YYYY-MM-DD"
          const [y, m, d] = entry.date.split("-");
          const isoDate = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
          snapshots.push({ date: isoDate, count: entry.value });
        }
      }
    }

    // ── Parse to numbers ──────────────────────────────────────────────────────
    const rating         = ratingNumber   ? parseInt(ratingNumber, 10)   || null : null;
    const maxRating      = highestRating  ? parseInt(highestRating, 10)  || null : null;
    const problemsSolved = problemSolvedStr ? parseInt(problemSolvedStr, 10) || 0 : 0;

    if (snapshots.length > 0) await upsertSnapshots(clerkId, "codechef", snapshots);

    // ── Rating history: embedded JS variable ──────────────────────────────────
    // Format: var all_rating = [{"code":"JAN10","rating":"1396","rank":"152","name":"January 2010 (Contest XII)","end_date":"2010-01-15 15:00:00",...}]
    const ratingHistoryMatch = html.match(/var all_rating\s*=\s*(\[[\s\S]*?\]);/);
    const ratingHistory: { contestName: string; rating: number; contestDate: number; rank: number }[] = [];
    if (ratingHistoryMatch) {
      try {
        const raw: { name: string; code: string; rating: string; rank: string; end_date: string }[] = JSON.parse(ratingHistoryMatch[1]);
        for (const entry of raw) {
          if (entry.rating && entry.end_date) {
            ratingHistory.push({
              contestName: entry.name || entry.code || "Contest",
              rating:      parseInt(entry.rating, 10),
              contestDate: Math.floor(new Date(entry.end_date).getTime() / 1000),
              rank:        parseInt(entry.rank, 10) || 0,
            });
          }
        }
      } catch {
        // rating history parsing is best-effort
      }
    }

    // ── Persist ───────────────────────────────────────────────────────────────
    await updatePlatformStats(clerkId, "codechef", {
      rating:         rating     ?? undefined,
      rank:           ratingStar || undefined,
      problemsSolved,
      displayName:    username,
      profileUrl:     `https://www.codechef.com/users/${handle}`,
      metadata: {
        maxRating,
        globalRank:   globalRank   || null,
        countryRank:  countryRank  || null,
        country:      country      || null,
        ratingHistory,
      },
    });

    const result = { handle, rating, rank: ratingStar || null, problemsSolved, displayName: username, snapshotCount: snapshots.length, ratingHistoryCount: ratingHistory.length };
    await setCached(cacheKey, result);
    return NextResponse.json({ ...result, source: "api" });

  } catch (err) {
    console.error("[codechef] Sync error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch CodeChef data." },
      { status: 502 }
    );
  }
}
