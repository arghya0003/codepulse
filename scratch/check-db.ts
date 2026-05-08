const dotenv = require("dotenv");
const path = require("path");
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

async function checkSchema() {
  const { db } = require("../db");
  const { sql } = require("drizzle-orm");

  try {
    const result = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'platform_profiles'
    `);
    console.log("Columns in platform_profiles:", JSON.stringify(result.rows, null, 2));
  } catch (err) {
    console.error("Error checking schema:", err);
  } finally {
    process.exit(0);
  }
}

checkSchema();
