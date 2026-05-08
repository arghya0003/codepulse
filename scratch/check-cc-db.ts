const dotenv = require("dotenv");
const path = require("path");
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const { db } = require("../db");
const { platformProfiles } = require("../db/schema");
const { eq } = require("drizzle-orm");

async function check() {
  const profiles = await db.select().from(platformProfiles).where(eq(platformProfiles.platform, "codechef"));
  console.log("CodeChef Profiles:", JSON.stringify(profiles, null, 2));
}

check().then(() => process.exit(0));
