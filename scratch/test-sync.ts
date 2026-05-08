const dotenv = require("dotenv");
const path = require("path");
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

// Mock auth and other next/server stuff if needed, 
// but here we just want to run the core logic.

const { db } = require("../db");
const { platformProfiles } = require("../db/schema");
const { eq, and } = require("drizzle-orm");
const { updatePlatformStats } = require("../actions/platforms");

async function testSync() {
  const clerkId = "user_3CPhdrFH5coPzHO2Zx1oEz5l5FF";
  const platform = "leetcode";
  const handle = "kablakartik";

  console.log(`Starting test sync for ${platform} handle: ${handle}`);

  try {
    const res = await fetch(`https://alfa-leetcode-api.onrender.com/${handle}`);
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    const data = await res.json();
    console.log("Fetched data keys:", Object.keys(data));

    // Try to update stats
    const stats = {
      problemsSolved: data.totalSolved || 0,
      rank: data.ranking ? `#${data.ranking}` : undefined,
      displayName: data.realName || handle,
      profileUrl: `https://leetcode.com/${handle}`,
    };

    console.log("Updating stats in DB...");
    // We need to bypass resolveUserId in updatePlatformStats because it uses currentUser() which fails in node
    // So we'll just do a direct update
    const [user] = await db.select().from(require("../db/schema").users).where(eq(require("../db/schema").users.clerkId, clerkId)).limit(1);
    if (!user) throw new Error("User not found");

    await db.update(platformProfiles)
      .set({
        ...stats,
        lastSynced: new Date(),
        updatedAt: new Date(),
      })
      .where(and(
        eq(platformProfiles.userId, user.id),
        eq(platformProfiles.platform, platform)
      ));

    console.log("Sync successful!");
  } catch (err) {
    console.error("Sync failed:", err);
  } finally {
    process.exit(0);
  }
}

testSync();
