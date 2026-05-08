"use server";

import { db } from "@/db";
import { users, platformProfiles, contributionSnapshots } from "@/db/schema";
import { eq, inArray, sql } from "drizzle-orm";

export type UpsertUserInput = {
  clerkId: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  imageUrl?: string | null;
};

/**
 * Upsert a user row from a Clerk webhook payload.
 * Called from /api/webhooks/clerk on user.created and user.updated.
 * All queries are scoped by clerkId — no cross-user mutations possible.
 */
export async function upsertUser(input: UpsertUserInput) {
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, input.clerkId))
    .limit(1);

  if (existing.length > 0) {
    // UPDATE — only touches that user's row
    const [updated] = await db
      .update(users)
      .set({
        email: input.email,
        firstName: input.firstName ?? null,
        lastName: input.lastName ?? null,
        username: input.username ?? null,
        imageUrl: input.imageUrl ?? null,
        updatedAt: new Date(),
      })
      .where(eq(users.clerkId, input.clerkId))
      .returning({ id: users.id });

    return updated;
  }

  // INSERT
  const [created] = await db
    .insert(users)
    .values({
      clerkId: input.clerkId,
      email: input.email,
      firstName: input.firstName ?? null,
      lastName: input.lastName ?? null,
      username: input.username ?? null,
      imageUrl: input.imageUrl ?? null,
    })
    .returning({ id: users.id });

  return created;
}

/**
 * Hard-delete a user and cascade-delete all related rows.
 * Called from /api/webhooks/clerk on user.deleted.
 */
export async function deleteUser(clerkId: string) {
  await db.delete(users).where(eq(users.clerkId, clerkId));
}

/**
 * Get the internal DB user record for the currently signed-in Clerk user.
 * Never returns other users' data — scoped strictly by clerkId.
 */
export async function getUserByClerkId(clerkId: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);

  return user ?? null;
}

/**
 * Fetch a public user profile by internal DB id.
 * Returns null if the user doesn't exist or has set their profile to private.
 */
export async function getUserProfile(userId: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user || user.isPublic !== 1) return null;

  const platforms = await db
    .select()
    .from(platformProfiles)
    .where(eq(platformProfiles.userId, userId));

  const profileIds = platforms.map((p) => p.id);

  let totalContributions = 0;
  const platformContributions: Record<string, number> = {};

  if (profileIds.length > 0) {
    const sums = await db
      .select({
        profileId: contributionSnapshots.profileId,
        total: sql<number>`cast(sum(${contributionSnapshots.count}) as int)`,
      })
      .from(contributionSnapshots)
      .where(inArray(contributionSnapshots.profileId, profileIds))
      .groupBy(contributionSnapshots.profileId);

    for (const s of sums) {
      const platform = platforms.find((p) => p.id === s.profileId);
      if (platform) {
        platformContributions[platform.platform] = s.total;
        totalContributions += s.total;
      }
    }
  }

  return {
    user: {
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      imageUrl: user.imageUrl,
      createdAt: user.createdAt,
    },
    platforms: platforms.map((p) => ({
      platform: p.platform,
      handle: p.handle,
      rating: p.rating,
      rank: p.rank,
      problemsSolved: p.problemsSolved,
      profileUrl: p.profileUrl,
      lastSynced: p.lastSynced,
      contributions: platformContributions[p.platform] ?? 0,
    })),
    totalContributions,
  };
}

/**
 * Toggle the user's public/private visibility.
 */
export async function setUserVisibility(clerkId: string, isPublic: boolean) {
  const [updated] = await db
    .update(users)
    .set({ isPublic: isPublic ? 1 : 0, updatedAt: new Date() })
    .where(eq(users.clerkId, clerkId))
    .returning({ id: users.id, isPublic: users.isPublic });

  return updated;
}
