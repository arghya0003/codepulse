const dotenv = require("dotenv");
const path = require("path");
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

async function checkData() {
  const { db } = require("../db");
  const { sql } = require("drizzle-orm");

  try {
    const profiles = await db.execute(sql`
      SELECT * FROM platform_profiles
    `);
    console.log("Profiles in DB:", JSON.stringify(profiles.rows, null, 2));

    const users = await db.execute(sql`
      SELECT * FROM users
    `);
    console.log("Users in DB:", JSON.stringify(users.rows, null, 2));

  } catch (err) {
    console.error("Error checking data:", err);
  } finally {
    process.exit(0);
  }
}

checkData();
