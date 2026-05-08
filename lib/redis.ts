import { Redis } from "@upstash/redis";

if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
  throw new Error(
    "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set in .env.local.\n" +
    "Get them from: https://console.upstash.com"
  );
}

// Singleton Redis client — Edge Runtime compatible
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// ── Cache key helpers ─────────────────────────────────────────────────────────
// All keys are namespaced to prevent collision. Platform/handle are
// sanitized before use (see sanitizeCacheSegment).

/**
 * Sanitize a user-controlled string before embedding in a cache key.
 * Only allows alphanumeric, dash, underscore, and dot.
 */
export function sanitizeCacheSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 64);
}

export const CACHE_KEYS = {
  platformData: (platform: string, handle: string) =>
    `platform:${sanitizeCacheSegment(platform)}:${sanitizeCacheSegment(handle)}`,

  userSync: (userId: string) =>
    `sync:${sanitizeCacheSegment(userId)}`,

  rateLimit: (userId: string, platform: string) =>
    `ratelimit:${sanitizeCacheSegment(userId)}:${sanitizeCacheSegment(platform)}`,
};

// 6-hour TTL for all platform API responses
export const CACHE_TTL_SECONDS = 6 * 60 * 60; // 21,600

// ── Sliding window rate limiter ───────────────────────────────────────────────
// Max 10 requests per user per platform per minute
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_SECONDS = 60;

export async function checkRateLimit(
  userId: string,
  platform: string
): Promise<{ allowed: boolean; remaining: number; resetInSeconds: number }> {
  const key = CACHE_KEYS.rateLimit(userId, platform);
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_SECONDS * 1000;

  // Sliding window using Redis sorted set (score = timestamp)
  const pipeline = redis.pipeline();
  pipeline.zremrangebyscore(key, 0, windowStart);         // Remove expired entries
  pipeline.zadd(key, { score: now, member: now.toString() }); // Add current request
  pipeline.zcard(key);                                     // Count in window
  pipeline.expire(key, RATE_LIMIT_WINDOW_SECONDS);         // Auto-expire the key

  const results = await pipeline.exec();
  const count = (results[2] as number) ?? 0;

  return {
    allowed: count <= RATE_LIMIT_MAX,
    remaining: Math.max(0, RATE_LIMIT_MAX - count),
    resetInSeconds: RATE_LIMIT_WINDOW_SECONDS,
  };
}

// ── Generic get/set with TTL ──────────────────────────────────────────────────
export async function getCached<T>(key: string): Promise<T | null> {
  try {
    return await redis.get<T>(key);
  } catch {
    return null; // Cache miss is never fatal
  }
}

export async function setCached<T>(
  key: string,
  value: T,
  ttlSeconds = CACHE_TTL_SECONDS
): Promise<void> {
  try {
    await redis.setex(key, ttlSeconds, value);
  } catch {
    // Cache write failure is non-fatal — app continues without cache
  }
}
