/**
 * Data normalizer — converts each platform's raw API response
 * into a unified ContributionSnapshot shape used throughout the app.
 */

export type ContributionSnapshot = {
  date: string;                        // "YYYY-MM-DD"
  count: number;
  platform: string;
  metadata?: Record<string, unknown>;
};

// ── GitHub ────────────────────────────────────────────────────────────────────
/**
 * Normalize GitHub GraphQL contributions response.
 * Input: contributionCalendar.weeks[] from the GraphQL API
 */
export function normalizeGitHub(
  weeks: Array<{
    contributionDays: Array<{ date: string; contributionCount: number }>;
  }>
): ContributionSnapshot[] {
  return weeks.flatMap((week) =>
    week.contributionDays.map((day) => ({
      date: day.date,
      count: day.contributionCount,
      platform: "github",
      metadata: { type: "contribution" },
    }))
  );
}

// ── LeetCode ──────────────────────────────────────────────────────────────────
/**
 * Normalize LeetCode submissionCalendar (Unix timestamp → count map).
 */
export function normalizeLeetCode(
  submissionCalendar: Record<string, number>
): ContributionSnapshot[] {
  return Object.entries(submissionCalendar).map(([timestamp, count]) => {
    const date = new Date(parseInt(timestamp) * 1000)
      .toISOString()
      .split("T")[0];
    return {
      date,
      count,
      platform: "leetcode",
      metadata: { type: "submission" },
    };
  });
}

// ── Codeforces ────────────────────────────────────────────────────────────────
/**
 * Normalize Codeforces user.status[] (submissions by date).
 */
export function normalizeCodeforces(
  submissions: Array<{ creationTimeSeconds: number; verdict: string }>
): ContributionSnapshot[] {
  // Group AC submissions by date
  const countByDate: Record<string, number> = {};
  for (const sub of submissions) {
    if (sub.verdict !== "OK") continue;
    const date = new Date(sub.creationTimeSeconds * 1000)
      .toISOString()
      .split("T")[0];
    countByDate[date] = (countByDate[date] ?? 0) + 1;
  }

  return Object.entries(countByDate).map(([date, count]) => ({
    date,
    count,
    platform: "codeforces",
    metadata: { type: "ac_submission" },
  }));
}

// ── CodeChef ──────────────────────────────────────────────────────────────────
/**
 * Normalize CodeChef heatMap array.
 */
export function normalizeCodeChef(
  heatMap: Array<{ date: string; value: number }>
): ContributionSnapshot[] {
  return heatMap.map((entry) => ({
    date: entry.date,
    count: entry.value,
    platform: "codechef",
    metadata: { type: "submission" },
  }));
}

