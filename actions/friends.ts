"use server";

import { db } from "@/db";
import { users, friendConnections, platformProfiles, contributionSnapshots } from "@/db/schema";
import { eq, and, or, ilike, not, desc, sql, inArray } from "drizzle-orm";
import { currentUser } from "@clerk/nextjs/server";

async function getInternalUserId() {
  const user = await currentUser();
  if (!user) throw new Error("Unauthorized");
  
  const [dbUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, user.id))
    .limit(1);
    
  if (!dbUser) throw new Error("User not found in database");
  return dbUser.id;
}

export async function getAllUsers() {
  const currentUserId = await getInternalUserId();

  // Collect IDs already connected (pending or accepted) so we can exclude them
  const existingConnections = await db
    .select({
      requesterId: friendConnections.requesterId,
      addresseeId: friendConnections.addresseeId,
    })
    .from(friendConnections)
    .where(
      or(
        eq(friendConnections.requesterId, currentUserId),
        eq(friendConnections.addresseeId, currentUserId)
      )
    );

  const connectedIds = existingConnections.map((c) =>
    c.requesterId === currentUserId ? c.addresseeId : c.requesterId
  );

  const excludeIds = [currentUserId, ...connectedIds];

  const results = await db
    .select({
      id: users.id,
      username: users.username,
      firstName: users.firstName,
      lastName: users.lastName,
      imageUrl: users.imageUrl,
    })
    .from(users)
    .where(
      and(
        eq(users.isPublic, 1),
        not(inArray(users.id, excludeIds))
      )
    )
    .orderBy(desc(users.createdAt))
    .limit(30);

  return results;
}

export async function searchUsers(query: string) {
  if (!query || query.length < 2) return [];
  
  const currentUserId = await getInternalUserId();
  
  const results = await db
    .select({
      id: users.id,
      username: users.username,
      firstName: users.firstName,
      lastName: users.lastName,
      imageUrl: users.imageUrl,
    })
    .from(users)
    .where(
      and(
        eq(users.isPublic, 1),
        not(eq(users.id, currentUserId)),
        or(
          ilike(users.username, `%${query}%`),
          ilike(users.firstName, `%${query}%`),
          ilike(users.email, `%${query}%`)
        )
      )
    )
    .limit(10);
    
  return results;
}

export async function sendFriendRequest(targetUserId: string) {
  const currentUserId = await getInternalUserId();
  
  if (currentUserId === targetUserId) throw new Error("Cannot send request to yourself");
  
  // Check if request already exists
  const existing = await db
    .select()
    .from(friendConnections)
    .where(
      or(
        and(eq(friendConnections.requesterId, currentUserId), eq(friendConnections.addresseeId, targetUserId)),
        and(eq(friendConnections.requesterId, targetUserId), eq(friendConnections.addresseeId, currentUserId))
      )
    )
    .limit(1);
    
  if (existing.length > 0) {
    throw new Error("Friend connection or request already exists");
  }
  
  await db.insert(friendConnections).values({
    requesterId: currentUserId,
    addresseeId: targetUserId,
    status: "pending",
  });
  
  return { success: true };
}

export async function acceptFriendRequest(connectionId: string) {
  const currentUserId = await getInternalUserId();
  
  const [updated] = await db
    .update(friendConnections)
    .set({ status: "accepted", updatedAt: new Date() })
    .where(
      and(
        eq(friendConnections.id, connectionId),
        eq(friendConnections.addresseeId, currentUserId) // Only addressee can accept
      )
    )
    .returning();
    
  if (!updated) throw new Error("Friend request not found or unauthorized");
  return { success: true };
}

export async function getPendingRequests() {
  const currentUserId = await getInternalUserId();
  
  const requests = await db
    .select({
      id: friendConnections.id,
      createdAt: friendConnections.createdAt,
      requester: {
        id: users.id,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        imageUrl: users.imageUrl,
      }
    })
    .from(friendConnections)
    .innerJoin(users, eq(friendConnections.requesterId, users.id))
    .where(
      and(
        eq(friendConnections.addresseeId, currentUserId),
        eq(friendConnections.status, "pending")
      )
    )
    .orderBy(desc(friendConnections.createdAt));
    
  return requests;
}

export async function getFriendsLeaderboard() {
  const currentUserId = await getInternalUserId();
  
  // 1. Get all accepted friends + self
  const connections = await db
    .select()
    .from(friendConnections)
    .where(
      and(
        eq(friendConnections.status, "accepted"),
        or(
          eq(friendConnections.requesterId, currentUserId),
          eq(friendConnections.addresseeId, currentUserId)
        )
      )
    );
    
  const friendIds = connections.map(c => 
    c.requesterId === currentUserId ? c.addresseeId : c.requesterId
  );
  const allUserIds = [currentUserId, ...friendIds];
  
  // 2. Fetch User basic info
  const leaderboardUsers = await db
    .select({
      id: users.id,
      username: users.username,
      firstName: users.firstName,
      lastName: users.lastName,
      imageUrl: users.imageUrl,
    })
    .from(users)
    .where(inArray(users.id, allUserIds));
    
  // 3. Fetch all their platform profiles
  const profiles = await db
    .select()
    .from(platformProfiles)
    .where(inArray(platformProfiles.userId, allUserIds));
    
  // 4. Fetch total contributions (sum of snapshots) per profile
  const profileIds = profiles.map(p => p.id);
  
  let contributionSums: { profileId: string, total: number }[] = [];
  if (profileIds.length > 0) {
    const sums = await db
      .select({
        profileId: contributionSnapshots.profileId,
        total: sql<number>`cast(sum(${contributionSnapshots.count}) as int)`
      })
      .from(contributionSnapshots)
      .where(inArray(contributionSnapshots.profileId, profileIds))
      .groupBy(contributionSnapshots.profileId);
      
    contributionSums = sums as any;
  }
  
  // 5. Assemble data
  return leaderboardUsers.map(u => {
    const userProfiles = profiles.filter(p => p.userId === u.id);
    
    let totalContributions = 0;
    const platforms: Record<string, any> = {};
    
    for (const p of userProfiles) {
      const sumObj = contributionSums.find(s => s.profileId === p.id);
      const contributions = sumObj?.total || 0;
      totalContributions += contributions;
      
      platforms[p.platform] = {
        handle: p.handle,
        problemsSolved: p.problemsSolved || 0,
        rating: p.rating || 0,
        rank: p.rank,
        contributions: contributions
      };
    }
    
    return {
      user: u,
      isSelf: u.id === currentUserId,
      totalContributions,
      platforms
    };
  });
}
