import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const cleanUrl = process.env.DATABASE_URL!.replace(/[&?]channel_binding=require/g, "");
const sql = neon(cleanUrl);

async function main() {
  try {
    const res = await sql`
      SELECT cs.date, cs.count 
      FROM contribution_snapshots cs
      JOIN platform_profiles pp ON cs.profile_id = pp.id
      WHERE pp.platform = 'github'
    `;
    console.log(`Found ${res.length} snapshots`);
    if (res.length > 0) {
      console.log(res.slice(0, 5));
    }
  } catch (error) {
    console.error("Error updating schema:", error);
  }
}

main();
