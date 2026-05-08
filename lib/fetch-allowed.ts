/**
 * SSRF (Server-Side Request Forgery) protection.
 *
 * All outbound fetch calls MUST go through fetchAllowed().
 * Any URL not matching the allowlist is rejected with a hard error.
 * This prevents user-controlled handles from being used to probe
 * internal network resources or arbitrary URLs.
 */

// ── URL Allowlist ─────────────────────────────────────────────────────────────
const ALLOWED_HOSTS = new Set([
  "api.github.com",
  "github.com",
  "leetcode.com",
  "alfa-leetcode-api.onrender.com",   // community LeetCode API
  "api.codeforces.com",
  "codeforces.com",
  "codechef-api.vercel.app",
  "www.codechef.com",
  "codechef.com",
  "api.codolio.com",
  "hades.mani.works",   // unified CP API (Codeforces + CodeChef)
]);

/**
 * Validates a URL against the allowlist, then performs the fetch.
 * Throws if the hostname is not in the allowlist.
 */
export async function fetchAllowed(
  url: string,
  init?: RequestInit
): Promise<Response> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`[SSRF] Invalid URL: ${url}`);
  }

  if (!ALLOWED_HOSTS.has(parsed.hostname)) {
    throw new Error(
      `[SSRF] Blocked request to disallowed host: ${parsed.hostname}. ` +
        `Allowed hosts: ${Array.from(ALLOWED_HOSTS).join(", ")}`
    );
  }

  return fetch(url, {
    ...init,
    headers: {
      "User-Agent": "CodePulse/1.0 (+https://codepulse.app)",
      ...init?.headers,
    },
  });
}
