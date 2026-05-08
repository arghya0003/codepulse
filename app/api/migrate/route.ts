import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";

/**
 * Quick migration endpoint — adds missing columns to existing tables.
 * Hit GET /api/migrate?secret=12345 to run.
 */
export async function GET(req: Request) {
  const secret = new URL(req.url).searchParams.get("secret");
  const expectedSecret = process.env.SETUP_SECRET;
  if (!expectedSecret || secret !== expectedSecret) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const results: string[] = [];

  const steps: Array<{ name: string; query: string }> = [
    {
      name: "add metadata column to platform_profiles",
      query: `ALTER TABLE platform_profiles ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'`,
    },
  ];

  for (const step of steps) {
    try {
      await db.execute(sql.raw(step.query));
      results.push(`✅ ${step.name}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push(`❌ ${step.name}: ${msg}`);
    }
  }

  return NextResponse.json({ results });
}
