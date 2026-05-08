import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Add it to .env.local from your Neon dashboard."
  );
}

// Strip channel_binding=require — unsupported by the Neon HTTP serverless driver
const cleanUrl = process.env.DATABASE_URL.replace(/[&?]channel_binding=require/g, "");
const sql = neon(cleanUrl);

export const db = drizzle(sql, {
  schema,
  logger: process.env.NODE_ENV === "development",
});

// Re-export schema for convenient co-location
export * from "./schema";
