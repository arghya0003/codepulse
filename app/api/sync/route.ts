import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getUserPlatforms } from "@/actions/platforms";

const PLATFORM_ROUTES: Record<string, string> = {
  github: "/api/platforms/github",
  leetcode: "/api/platforms/leetcode",
  codeforces: "/api/platforms/codeforces",
  codechef: "/api/platforms/codechef",
};

/**
 * Unified sync endpoint — triggers all linked platforms for the signed-in user.
 * Each platform fetch is independent; failures don't abort the others.
 * Returns a summary of which platforms succeeded, failed, or were skipped.
 *
 * Security: user identity comes from Clerk session — not the request body.
 */
export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get the platforms this user has actually linked
  const profiles = await getUserPlatforms(clerkId);
  const linkedPlatforms = profiles.map((p) => p.platform);

  if (linkedPlatforms.length === 0) {
    return NextResponse.json({
      message: "No platforms linked. Add platforms in Settings first.",
      results: [],
    });
  }

  // Build the base URL from the request origin (handles localhost and production)
  const baseUrl = new URL(req.url).origin;

  // Sync all platforms concurrently — failures are isolated
  const results = await Promise.allSettled(
    linkedPlatforms.map(async (platform) => {
      const route = PLATFORM_ROUTES[platform];
      if (!route) return { platform, status: "skipped", reason: "No route" };

      const syncUrl = `${baseUrl}${route}`;

      const forwardHeaders = new Headers(req.headers);
      forwardHeaders.delete("host"); // Avoid host header mismatch issues

      // Forward the Clerk session cookies so auth() works in sub-routes
      const res = await fetch(syncUrl, {
        headers: forwardHeaders,
      });

      const data = await res.json();
      return {
        platform,
        status: res.ok ? "success" : "error",
        statusCode: res.status,
        data: res.ok ? data : undefined,
        error: !res.ok ? data.error : undefined,
      };
    })
  );

  const summary = results.map((r) =>
    r.status === "fulfilled" ? r.value : { status: "error", error: r.reason }
  );

  const successCount = summary.filter((r) => r.status === "success").length;
  const failCount = summary.filter((r) => r.status === "error").length;

  return NextResponse.json({
    message: `Sync complete: ${successCount} succeeded, ${failCount} failed`,
    synced: linkedPlatforms,
    results: summary,
  });
}
