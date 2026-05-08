"use server";

import { db } from "@/db";
import { contributionSnapshots, platformProfiles, users } from "@/db/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import type { platformEnum } from "@/db/schema";

type Platform = (typeof platformEnum.enumValues)[number];

export type ContributionInput = {
  date: string;         // ISO date string: "YYYY-MM-DD"
  count: number;
  metadata?: Record<string, unknown>;
};

/**
 * Resolve the platform profile ID for a given user+platform combination.
 * Security: resolves via userId from clerkId — never from client input.
 */
async function resolveProfileId(
  clerkId: string,
  platform: Platform
): Promise<string | null> {
  const [row] = await db
    .select({ profileId: platformProfiles.id })
    .from(platformProfiles)
    .innerJoin(users, eq(users.id, platformProfiles.userId))
    .where(
      and(
        eq(users.clerkId, clerkId),
        eq(platformProfiles.platform, platform)
      )
    )
    .limit(1);

  return row?.profileId ?? null;
}

/**
 * Bulk upsert contribution snapshots for a platform.
 * Uses ON CONFLICT DO UPDATE to make syncs idempotent.
 * Never overwrites with a lower count.
 */
export async function upsertSnapshots(
  clerkId: string,
  platform: Platform,
  snapshots: ContributionInput[]
) {
  if (snapshots.length === 0) return { upserted: 0 };

  const profileId = await resolveProfileId(clerkId, platform);
  if (!profileId) {
    throw new Error(
      `No platform profile found for ${platform}. Link the platform first.`
    );
  }

  // Process in batches of 100 to stay within Neon's HTTP payload limits
  const BATCH_SIZE = 100;
  let totalUpserted = 0;

  for (let i = 0; i < snapshots.length; i += BATCH_SIZE) {
    const batch = snapshots.slice(i, i + BATCH_SIZE);

    await db
      .insert(contributionSnapshots)
      .values(
        batch.map((s) => ({
          profileId,
          date: s.date,
          count: s.count,
          metadata: s.metadata ?? null,
        }))
      )
      .onConflictDoUpdate({
        // Unique constraint: (profileId, date)
        target: [contributionSnapshots.profileId, contributionSnapshots.date],
        set: {
          count: sql`excluded.count`,
          metadata: sql`excluded.metadata`,
        },
      });

    totalUpserted += batch.length;
  }

  return { upserted: totalUpserted };
}

/**
 * Fetch contribution snapshots for a user+platform within a date range.
 * Used to render heatmaps and feed the ML service.
 *
 * Security: profileId resolved via join on clerkId — users can only
 * fetch their own snapshots.
 */
export async function getSnapshots(
  clerkId: string,
  platform: Platform,
  fromDate: string,
  toDate: string
) {
  const profileId = await resolveProfileId(clerkId, platform);
  if (!profileId) return [];

  const rows = await db
    .select({
      date: contributionSnapshots.date,
      count: contributionSnapshots.count,
      metadata: contributionSnapshots.metadata,
    })
    .from(contributionSnapshots)
    .where(
      and(
        eq(contributionSnapshots.profileId, profileId),
        gte(contributionSnapshots.date, fromDate),
        lte(contributionSnapshots.date, toDate)
      )
    )
    .orderBy(desc(contributionSnapshots.date));

  return rows;
}

/**
 * Get last 365 days of snapshots across ALL linked platforms for a user.
 * Used to build the unified cross-platform heatmap on the dashboard.
 */
export async function getAllPlatformSnapshots(clerkId: string) {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const fromDate = oneYearAgo.toISOString().split("T")[0];
  const toDate = new Date().toISOString().split("T")[0];

  const rows = await db
    .select({
      date: contributionSnapshots.date,
      count: contributionSnapshots.count,
      platform: platformProfiles.platform,
      metadata: contributionSnapshots.metadata,
    })
    .from(contributionSnapshots)
    .innerJoin(
      platformProfiles,
      eq(platformProfiles.id, contributionSnapshots.profileId)
    )
    .innerJoin(users, eq(users.id, platformProfiles.userId))
    .where(
      and(
        eq(users.clerkId, clerkId),
        gte(contributionSnapshots.date, fromDate),
        lte(contributionSnapshots.date, toDate)
      )
    )
    .orderBy(desc(contributionSnapshots.date));

  return rows;
}
