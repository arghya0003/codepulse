const dotenv = require("dotenv");
const path = require("path");
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

async function checkData() {
  const { db } = require("../db");
  const { sql } = require("drizzle-orm");

  try {
    const user1 = "67654026-a30b-4311-8092-5ccc0f242b24";
    const profiles = await db.execute(sql`
      SELECT * FROM platform_profiles WHERE user_id = ${user1}
    `);
    console.log(`Profiles for user ${user1}:`, JSON.stringify(profiles.rows, null, 2));

  } catch (err) {
    console.error("Error checking data:", err);
  } finally {
    process.exit(0);
  }
}

checkData();
