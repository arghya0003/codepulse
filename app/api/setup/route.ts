import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";

/**
 * One-time setup endpoint — creates all tables if they don't exist.
 * Protected by a setup secret so it can't be called by anyone else.
 * Hit GET /api/setup?secret=12345 to run.
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
      name: "drop contribution_snapshots",
      query: `DROP TABLE IF EXISTS contribution_snapshots CASCADE`,
    },
    {
      name: "drop ml_predictions",
      query: `DROP TABLE IF EXISTS ml_predictions CASCADE`,
    },
    {
      name: "drop friend_connections",
      query: `DROP TABLE IF EXISTS friend_connections CASCADE`,
    },
    {
      name: "drop platform_profiles",
      query: `DROP TABLE IF EXISTS platform_profiles CASCADE`,
    },
    {
      name: "drop users",
      query: `DROP TABLE IF EXISTS users CASCADE`,
    },
    // Old schema tables
    {
      name: "drop audit_logs",
      query: `DROP TABLE IF EXISTS audit_logs CASCADE`,
    },
    {
      name: "drop platform_tokens",
      query: `DROP TABLE IF EXISTS platform_tokens CASCADE`,
    },
    {
      name: "drop user_stats",
      query: `DROP TABLE IF EXISTS user_stats CASCADE`,
    },
    {
      name: "drop friendships",
      query: `DROP TABLE IF EXISTS friendships CASCADE`,
    },
    // Drop and recreate enums to stay in sync
    {
      name: "drop enums",
      query: `
        DROP TYPE IF EXISTS platform CASCADE;
        DROP TYPE IF EXISTS friend_status CASCADE;
        DROP TYPE IF EXISTS prediction_type CASCADE;
      `,
    },
    {
      name: "create platform enum",
      query: `CREATE TYPE platform AS ENUM ('github', 'leetcode', 'codeforces', 'codechef')`,
    },
    {
      name: "create friend_status enum",
      query: `CREATE TYPE friend_status AS ENUM ('pending', 'accepted', 'blocked')`,
    },
    {
      name: "create prediction_type enum",
      query: `CREATE TYPE prediction_type AS ENUM ('peak_hours', 'anomaly', 'forecast')`,
    },
    {
      name: "create users",
      query: `CREATE TABLE IF NOT EXISTS users (
        id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
        clerk_id   text        NOT NULL UNIQUE,
        email      text        NOT NULL,
        username   text,
        first_name text,
        last_name  text,
        image_url  text,
        is_public  integer     NOT NULL DEFAULT 1,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`,
    },
    {
      name: "create platform_profiles",
      query: `CREATE TABLE IF NOT EXISTS platform_profiles (
        id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id         uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        platform        platform    NOT NULL,
        handle          text        NOT NULL,
        access_token    text,
        display_name    text,
        profile_url     text,
        avatar_url      text,
        rating          integer,
        rank            text,
        problems_solved integer,
        metadata        jsonb       NOT NULL DEFAULT '{}',
        last_synced     timestamptz,
        created_at      timestamptz NOT NULL DEFAULT now(),
        updated_at      timestamptz NOT NULL DEFAULT now()
      )`,
    },
    {
      name: "create contribution_snapshots",
      query: `CREATE TABLE IF NOT EXISTS contribution_snapshots (
        id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
        profile_id uuid        NOT NULL REFERENCES platform_profiles(id) ON DELETE CASCADE,
        date       date        NOT NULL,
        count      integer     NOT NULL DEFAULT 0,
        metadata   jsonb,
        created_at timestamptz NOT NULL DEFAULT now()
      )`,
    },
    {
      name: "create friend_connections",
      query: `CREATE TABLE IF NOT EXISTS friend_connections (
        id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
        requester_id uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        addressee_id uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status       friend_status NOT NULL DEFAULT 'pending',
        created_at   timestamptz NOT NULL DEFAULT now(),
        updated_at   timestamptz NOT NULL DEFAULT now()
      )`,
    },
    {
      name: "create ml_predictions",
      query: `CREATE TABLE IF NOT EXISTS ml_predictions (
        id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id         uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        prediction_type prediction_type NOT NULL,
        payload         jsonb       NOT NULL,
        generated_at    timestamptz NOT NULL DEFAULT now()
      )`,
    },
    {
      name: "index user_platform_idx",
      query: `CREATE UNIQUE INDEX IF NOT EXISTS user_platform_idx ON platform_profiles(user_id, platform)`,
    },
    {
      name: "index platform_profiles_user_id_idx",
      query: `CREATE INDEX IF NOT EXISTS platform_profiles_user_id_idx ON platform_profiles(user_id)`,
    },
    {
      name: "index profile_date_idx",
      query: `CREATE UNIQUE INDEX IF NOT EXISTS profile_date_idx ON contribution_snapshots(profile_id, date)`,
    },
    {
      name: "index snapshots_profile_id_idx",
      query: `CREATE INDEX IF NOT EXISTS snapshots_profile_id_idx ON contribution_snapshots(profile_id)`,
    },
    {
      name: "index snapshots_date_idx",
      query: `CREATE INDEX IF NOT EXISTS snapshots_date_idx ON contribution_snapshots(date)`,
    },
    {
      name: "index requester_addressee_idx",
      query: `CREATE UNIQUE INDEX IF NOT EXISTS requester_addressee_idx ON friend_connections(requester_id, addressee_id)`,
    },
    {
      name: "index ml_user_prediction_idx",
      query: `CREATE INDEX IF NOT EXISTS ml_user_prediction_idx ON ml_predictions(user_id, prediction_type)`,
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
