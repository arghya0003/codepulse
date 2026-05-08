import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { fetchAllowed } from "@/lib/fetch-allowed";
import { normalizeGitHub } from "@/lib/normalizer";
import { getCached, setCached, CACHE_KEYS, checkRateLimit } from "@/lib/redis";
import { getDecryptedToken, updatePlatformStats } from "@/actions/platforms";
import { upsertSnapshots } from "@/actions/contributions";

/**
 * GitHub platform sync.
 * Uses OAuth token from Clerk (decrypted server-side — never exposed to client).
 * Fetches contribution calendar via GitHub GraphQL API.
 */
export async function GET(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Rate limit ───────────────────────────────────────────────────────────
  const { allowed, remaining } = await checkRateLimit(clerkId, "github");
  if (!allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again in 60 seconds." },
      {
        status: 429,
        headers: { "X-RateLimit-Remaining": remaining.toString() },
      }
    );
  }

  // ── Check cache ──────────────────────────────────────────────────────────
  const cacheKey = CACHE_KEYS.platformData("github", clerkId);
  const cached = await getCached<{ contributions: unknown; stats: unknown }>(cacheKey);
  if (cached) {
    return NextResponse.json({ ...cached, source: "cache" });
  }

  // ── Fetch from GitHub ────────────────────────────────────────────────────
  const token = await getDecryptedToken(clerkId, "github");
  if (!token) {
    return NextResponse.json(
      { error: "GitHub account not connected. Link it in Settings." },
      { status: 404 }
    );
  }

  try {
    const query = `
      query {
        viewer {
          login
          name
          avatarUrl
          url
          contributionsCollection {
            contributionCalendar {
              totalContributions
              weeks {
                contributionDays {
                  date
                  contributionCount
                }
              }
            }
          }
          pinnedItems(first: 6, types: REPOSITORY) {
            nodes {
              ... on Repository {
                name
                description
                url
                stargazerCount
                primaryLanguage {
                  name
                  color
                }
                isPrivate
              }
            }
          }
        }
      }
    `;

    const res = await fetchAllowed("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });

    if (!res.ok) {
      throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
    }

    const json = await res.json();
    const viewer = json.data?.viewer;
    if (!viewer) throw new Error("No viewer data in GitHub response");

    const calendar = viewer.contributionsCollection.contributionCalendar;
    const snapshots = normalizeGitHub(calendar.weeks);
    const pinnedRepos = viewer.pinnedItems?.nodes || [];

    console.log("[github] Synced - Pinned repos count:", pinnedRepos.length, "Repos:", pinnedRepos);

    // ── Persist snapshots ────────────────────────────────────────────────
    await upsertSnapshots(clerkId, "github", snapshots);

    // ── Update profile stats with pinned repos in metadata ─────────────────
    await updatePlatformStats(clerkId, "github", {
      displayName: viewer.name ?? viewer.login,
      profileUrl: viewer.url,
      avatarUrl: viewer.avatarUrl,
      metadata: { pinnedRepos },
    });

    const result = {
      handle: viewer.login,
      totalContributions: calendar.totalContributions,
      snapshotCount: snapshots.length,
      pinnedRepos,
    };

    // ── Cache the result ─────────────────────────────────────────────────
    await setCached(cacheKey, result);

    return NextResponse.json({ ...result, source: "api" });
  } catch (err) {
    console.error("[github] Sync error:", err);
    return NextResponse.json(
      { error: "Failed to fetch GitHub data. Check your token and try again." },
      { status: 502 }
    );
  }
}
