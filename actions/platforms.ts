"use server";

import { db } from "@/db";
import { platformProfiles, users } from "@/db/schema";
import { encrypt, decrypt } from "@/lib/encryption";
import { eq, and } from "drizzle-orm";
import type { platformEnum } from "@/db/schema";
import type { InferSelectModel } from "drizzle-orm";
import { currentUser } from "@clerk/nextjs/server";

type Platform = (typeof platformEnum.enumValues)[number];
type PlatformProfile = InferSelectModel<typeof platformProfiles>;

// Strip the encrypted token before returning to client
type SafeProfile = Omit<PlatformProfile, "accessToken">;

function stripToken(profile: PlatformProfile): SafeProfile {
  const { accessToken: _, ...safe } = profile;
  return safe;
}

/**
 * Get the internal userId from a Clerk ID.
 * Ensures the user exists in our DB, creating them if necessary.
 */
async function resolveUserId(clerkId: string): Promise<string> {
  const user = await currentUser();
  if (!user || user.id !== clerkId) throw new Error("Unauthorized");

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);

  if (existing) return existing.id;

  const [newUser] = await db
    .insert(users)
    .values({
      clerkId,
      email: user.emailAddresses[0].emailAddress,
    })
    .returning({ id: users.id });

  return newUser.id;
}

/**
 * Link a platform handle to the user's account.
 * If accessToken is provided, it is AES-256-GCM encrypted before storage.
 * Security: userId resolved server-side from Clerk session — never from client input.
 */
export async function linkPlatform(
  clerkId: string,
  platform: Platform,
  handle: string,
  accessToken?: string
): Promise<SafeProfile> {
  const userId = await resolveUserId(clerkId);

  const encryptedToken = accessToken ? encrypt(accessToken) : null;

  const [profile] = await db
    .insert(platformProfiles)
    .values({
      userId,
      platform,
      handle,
      accessToken: encryptedToken,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [platformProfiles.userId, platformProfiles.platform],
      set: {
        handle,
        accessToken: encryptedToken,
        updatedAt: new Date(),
      },
    })
    .returning();

  return stripToken(profile);
}

/**
 * Remove a platform link for a user.
 */
export async function unlinkPlatform(clerkId: string, platform: Platform) {
  const userId = await resolveUserId(clerkId);

  await db
    .delete(platformProfiles)
    .where(
      and(
        eq(platformProfiles.userId, userId),
        eq(platformProfiles.platform, platform)
      )
    );
}

/**
 * Get all linked platforms for a user — tokens stripped from response.
 * Security: scoped by userId resolved from clerkId, never client-supplied.
 */
export async function getUserPlatforms(clerkId: string): Promise<SafeProfile[]> {
  const userId = await resolveUserId(clerkId);

  const profiles = await db
    .select()
    .from(platformProfiles)
    .where(eq(platformProfiles.userId, userId));

  return profiles.map(stripToken);
}

/**
 * Internal-only: decrypt and return access token for a specific platform.
 * NEVER called from client components — server actions only.
 * Used by the sync engine (Phase 3) to make authenticated API calls.
 */
export async function getDecryptedToken(
  clerkId: string,
  platform: Platform
): Promise<string | null> {
  const userId = await resolveUserId(clerkId);

  const [profile] = await db
    .select({ accessToken: platformProfiles.accessToken })
    .from(platformProfiles)
    .where(
      and(
        eq(platformProfiles.userId, userId),
        eq(platformProfiles.platform, platform)
      )
    )
    .limit(1);

  if (!profile?.accessToken) return null;
  return decrypt(profile.accessToken);
}

/**
 * Update platform stats after a sync — rating, rank, problems solved, lastSynced.
 */
export async function updatePlatformStats(
  clerkId: string,
  platform: Platform,
  stats: {
    displayName?: string;
    rating?: number;
    rank?: string;
    problemsSolved?: number;
    profileUrl?: string;
    avatarUrl?: string;
    metadata?: Record<string, unknown>;
  }
) {
  const userId = await resolveUserId(clerkId);

  const [updated] = await db
    .update(platformProfiles)
    .set({
      ...stats,
      lastSynced: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(platformProfiles.userId, userId),
        eq(platformProfiles.platform, platform)
      )
    )
    .returning();

  return updated ? stripToken(updated) : null;
}
