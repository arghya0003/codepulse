import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { fetchAllowed } from "@/lib/fetch-allowed";
import { normalizeLeetCode } from "@/lib/normalizer";
import { getCached, setCached, CACHE_KEYS, checkRateLimit } from "@/lib/redis";
import { getUserPlatforms, updatePlatformStats } from "@/actions/platforms";
import { upsertSnapshots } from "@/actions/contributions";

/**
 * LeetCode platform sync.
 * Uses community GraphQL API (leetcode.com/graphql) — no official REST API.
 * Handle is pulled from the user's linked platform profile in DB.
 */
export async function GET(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Rate limit ───────────────────────────────────────────────────────────
  const { allowed, remaining } = await checkRateLimit(clerkId, "leetcode");
  if (!allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again in 60 seconds." },
      { status: 429, headers: { "X-RateLimit-Remaining": remaining.toString() } }
    );
  }

  // ── Get linked handle ────────────────────────────────────────────────────
  const profiles = await getUserPlatforms(clerkId);
  const leetcodeProfile = profiles.find((p) => p.platform === "leetcode");
  if (!leetcodeProfile) {
    return NextResponse.json(
      { error: "LeetCode account not connected. Link it in Settings." },
      { status: 404 }
    );
  }
  const handle = leetcodeProfile.handle;

  // ── Check cache ──────────────────────────────────────────────────────────
  const forceRefresh = req.nextUrl.searchParams.get("force") === "true";
  const cacheKey = CACHE_KEYS.platformData("leetcode", handle);
  if (!forceRefresh) {
    const cached = await getCached(cacheKey);
    if (cached) {
      return NextResponse.json({ ...cached as object, source: "cache" });
    }
  }

  try {
    // Fetch submission calendar + user stats + contest stats + solved stats in parallel
    const [calendarRes, statsRes, contestRes, solvedRes] = await Promise.allSettled([
      fetchAllowed(`https://alfa-leetcode-api.onrender.com/${handle}/calendar`, {
        headers: { Accept: "application/json" },
      }),
      fetchAllowed(`https://alfa-leetcode-api.onrender.com/${handle}`, {
        headers: { Accept: "application/json" },
      }),
      fetchAllowed(`https://alfa-leetcode-api.onrender.com/${handle}/contest`, {
        headers: { Accept: "application/json" },
      }),
      fetchAllowed(`https://alfa-leetcode-api.onrender.com/userProfile/${handle}`, {
        headers: { Accept: "application/json" },
      }),
    ]);

    if (calendarRes.status === "rejected") {
      throw new Error("Failed to fetch LeetCode calendar: " + calendarRes.reason);
    }

    const calendarData = await calendarRes.value.json();
    const submissionCalendar: Record<string, number> =
      calendarData.submissionCalendar
        ? JSON.parse(calendarData.submissionCalendar)
        : {};

    const snapshots = normalizeLeetCode(submissionCalendar);
    await upsertSnapshots(clerkId, "leetcode", snapshots);

    // Parse stats if available
    let statsPayload: Record<string, unknown> = {};
    let contestRating: number | undefined = undefined;
    let exactProblemsSolved: number | undefined = undefined;
    let solvedData: any = {};
    let ratingHistory: any[] = [];
    let maxRating: number | undefined = undefined;
    let maxRank: string | undefined = undefined;

    if (contestRes.status === "fulfilled" && contestRes.value.ok) {
      const contestData = await contestRes.value.json();
      if (contestData.contestRating) {
        contestRating = Math.round(contestData.contestRating);
      }

      // Parse contest history native from LeetCode Alfa API instead of Codolio
      if (contestData.contestParticipation && Array.isArray(contestData.contestParticipation)) {
        ratingHistory = contestData.contestParticipation
          .filter((p: any) => p.attended)
          .map((p: any) => ({
            contestName: p.contest?.title || "Contest",
            contestDate: p.contest?.startTime || 0,
            rating: Math.round(p.rating),
            rank: p.ranking
          }));

        if (ratingHistory.length > 0) {
          maxRating = Math.max(...ratingHistory.map((r: any) => r.rating));
          maxRank = Math.min(...ratingHistory.map((r: any) => r.rank)).toString();
        }
      }
    }

    // Parse solved data early so we can use it for difficulty stats
    if (solvedRes.status === "fulfilled" && solvedRes.value.ok) {
      solvedData = await solvedRes.value.json();
      if (solvedData.solvedProblem || solvedData.totalSolved) {
        exactProblemsSolved = solvedData.solvedProblem || solvedData.totalSolved;
      }
    }

    if (statsRes.status === "fulfilled" && statsRes.value.ok) {
      const statsData = await statsRes.value.json();

      // Alfa API returns errors for non-existent users
      if (statsData.errors) {
        throw new Error("User does not exist on LeetCode");
      }

      // Extract difficulty breakdown from solved endpoint if available, otherwise from stats
      let difficultyStats = {
        easy: solvedData.totalEasy ?? solvedData.easyTotal ?? statsData.easyTotal ?? 0,
        medium: solvedData.totalMedium ?? solvedData.mediumTotal ?? statsData.mediumTotal ?? 0,
        hard: solvedData.totalHard ?? solvedData.hardTotal ?? statsData.hardTotal ?? 0,
      };

      let easySolved = solvedData.easySolved ?? statsData.easySolved ?? 0;
      let mediumSolved = solvedData.mediumSolved ?? statsData.mediumSolved ?? 0;
      let hardSolved = solvedData.hardSolved ?? statsData.hardSolved ?? 0;

      // Fetch recent submissions and topics from LeetCode GraphQL
      let recentSubmissions: any[] = [];
      let topicWiseDistribution: Record<string, number> = {};
      let graphqlAvatar: string | null = null;
      try {
        const graphqlRes = await fetchAllowed("https://leetcode.com/graphql", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
          body: JSON.stringify({
            query: `
              query getLeetCodeData($username: String!) {
                recentSubmissionList(username: $username, limit: 50) {
                  title
                  titleSlug
                  timestamp
                  statusDisplay
                  lang
                }
                matchedUser(username: $username) {
                  profile {
                    userAvatar
                  }
                  tagProblemCounts {
                    advanced {
                      tagName
                      problemsSolved
                    }
                    intermediate {
                      tagName
                      problemsSolved
                    }
                    fundamental {
                      tagName
                      problemsSolved
                    }
                  }
                }
              }
            `,
            variables: { username: handle }
          }),
        });

        if (graphqlRes.ok) {
          const graphqlData = await graphqlRes.json();
          recentSubmissions = graphqlData.data?.recentSubmissionList || [];
          graphqlAvatar = graphqlData.data?.matchedUser?.profile?.userAvatar || null;

          const tags = graphqlData.data?.matchedUser?.tagProblemCounts;
          if (tags) {
            const allTags = [
              ...(tags.advanced || []),
              ...(tags.intermediate || []),
              ...(tags.fundamental || [])
            ];
            for (const tag of allTags) {
              if (tag.tagName && tag.problemsSolved) {
                topicWiseDistribution[tag.tagName] = (topicWiseDistribution[tag.tagName] || 0) + tag.problemsSolved;
              }
            }
          }
        }
      } catch {
        // graphql enrichment is best-effort
      }

      // Removing profile picture as requested
      let finalAvatarUrl = null;

      statsPayload = {
        problemsSolved: exactProblemsSolved ?? statsData.totalSolved ?? null,
        rank: statsData.ranking ? `#${statsData.ranking}` : null,
        rating: contestRating ?? null,
        displayName: statsData.realName ?? statsData.name ?? handle,
        profileUrl: `https://leetcode.com/${handle}`,
        avatarUrl: finalAvatarUrl ?? null,
        metadata: {
          difficultyStats,
          easySolved,
          mediumSolved,
          hardSolved,
          recentSubmissions,
          topicWiseDistribution,
          ratingHistory,
          maxRating,
          maxRank,
        },
      };
      await updatePlatformStats(clerkId, "leetcode", {
        problemsSolved: exactProblemsSolved ?? statsData.totalSolved ?? snapshots.length,
        rank: statsData.ranking ? `#${statsData.ranking}` : undefined,
        rating: contestRating,
        displayName: statsData.realName ?? statsData.name ?? handle,
        profileUrl: `https://leetcode.com/${handle}`,
        avatarUrl: finalAvatarUrl ?? undefined,
        metadata: {
          difficultyStats,
          easySolved,
          mediumSolved,
          hardSolved,
          recentSubmissions,
          topicWiseDistribution,
          ratingHistory,
          maxRating,
          maxRank,
        },
      });
    }

    const result = {
      handle,
      snapshotCount: snapshots.length,
      ...statsPayload,
    };

    await setCached(cacheKey, result);
    return NextResponse.json({ ...result, source: "api" });
  } catch (err) {
    console.error("[leetcode] Sync error:", err);
    return NextResponse.json(
      { error: "Failed to fetch LeetCode data. Check your handle and try again." },
      { status: 502 }
    );
  }
}
