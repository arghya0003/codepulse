"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

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
 * Toggle the user's public/private visibility.
 * isPublic stored as integer: 1 = public, 0 = private.
 */
export async function setUserVisibility(clerkId: string, isPublic: boolean) {
  const [updated] = await db
    .update(users)
    .set({ isPublic: isPublic ? 1 : 0, updatedAt: new Date() })
    .where(eq(users.clerkId, clerkId))
    .returning({ id: users.id, isPublic: users.isPublic });

  return updated;
}
