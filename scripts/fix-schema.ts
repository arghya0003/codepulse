import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const cleanUrl = process.env.DATABASE_URL!.replace(/[&?]channel_binding=require/g, "");
const sql = neon(cleanUrl);

async function main() {
  try {
    console.log("Adding metadata column to platform_profiles...");
    await sql`ALTER TABLE platform_profiles ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb NOT NULL;`;
    console.log("Successfully added metadata column.");
  } catch (error) {
    console.error("Error updating schema:", error);
  }
}

main();
