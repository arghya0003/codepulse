import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
config({ path: ".env.local" });

async function setup() {
  console.log("Setting up database...");
  if (!process.env.DATABASE_URL) {
    console.error("No DATABASE_URL found");
    return;
  }
  const sql = neon(process.env.DATABASE_URL);

  const steps = [
    { name: "drop contribution_snapshots", query: `DROP TABLE IF EXISTS contribution_snapshots CASCADE` },
    { name: "drop ml_predictions", query: `DROP TABLE IF EXISTS ml_predictions CASCADE` },
    { name: "drop friend_connections", query: `DROP TABLE IF EXISTS friend_connections CASCADE` },
    { name: "drop platform_profiles", query: `DROP TABLE IF EXISTS platform_profiles CASCADE` },
    { name: "drop users", query: `DROP TABLE IF EXISTS users CASCADE` },
    { name: "create users", query: `CREATE TABLE IF NOT EXISTS users (
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
    )` },
    { name: "create platform_profiles", query: `CREATE TABLE IF NOT EXISTS platform_profiles (
      id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id         uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      platform        text        NOT NULL,
      handle          text        NOT NULL,
      access_token    text,
      display_name    text,
      profile_url     text,
      avatar_url      text,
      rating          integer,
      rank            text,
      problems_solved integer,
      last_synced     timestamptz,
      created_at      timestamptz NOT NULL DEFAULT now(),
      updated_at      timestamptz NOT NULL DEFAULT now()
    )` },
    { name: "create contribution_snapshots", query: `CREATE TABLE IF NOT EXISTS contribution_snapshots (
      id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
      profile_id uuid        NOT NULL REFERENCES platform_profiles(id) ON DELETE CASCADE,
      date       date        NOT NULL,
      count      integer     NOT NULL DEFAULT 0,
      metadata   jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    )` },
    { name: "create friend_connections", query: `CREATE TABLE IF NOT EXISTS friend_connections (
      id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
      requester_id uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      addressee_id uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status       text        NOT NULL DEFAULT 'pending',
      created_at   timestamptz NOT NULL DEFAULT now(),
      updated_at   timestamptz NOT NULL DEFAULT now()
    )` },
    { name: "create ml_predictions", query: `CREATE TABLE IF NOT EXISTS ml_predictions (
      id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id         uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      prediction_type text        NOT NULL,
      payload         jsonb       NOT NULL,
      generated_at    timestamptz NOT NULL DEFAULT now()
    )` },
    { name: "index user_platform_idx", query: `CREATE UNIQUE INDEX IF NOT EXISTS user_platform_idx ON platform_profiles(user_id, platform)` },
    { name: "index platform_profiles_user_id_idx", query: `CREATE INDEX IF NOT EXISTS platform_profiles_user_id_idx ON platform_profiles(user_id)` },
    { name: "index profile_date_idx", query: `CREATE UNIQUE INDEX IF NOT EXISTS profile_date_idx ON contribution_snapshots(profile_id, date)` },
    { name: "index snapshots_profile_id_idx", query: `CREATE INDEX IF NOT EXISTS snapshots_profile_id_idx ON contribution_snapshots(profile_id)` },
    { name: "index snapshots_date_idx", query: `CREATE INDEX IF NOT EXISTS snapshots_date_idx ON contribution_snapshots(date)` },
    { name: "index requester_addressee_idx", query: `CREATE UNIQUE INDEX IF NOT EXISTS requester_addressee_idx ON friend_connections(requester_id, addressee_id)` },
    { name: "index ml_user_prediction_idx", query: `CREATE INDEX IF NOT EXISTS ml_user_prediction_idx ON ml_predictions(user_id, prediction_type)` },
    { name: "insert user row", query: `INSERT INTO users (clerk_id, email, first_name)
      VALUES ('user_3CPhdrFH5coPzHO2Zx1oEz5l5FF', 'your@email.com', 'Arghya')
      ON CONFLICT (clerk_id) DO NOTHING;` }
  ];

  for (const step of steps) {
    try {
      await sql.query(step.query);
      console.log(`✅ ${step.name}`);
    } catch (err) {
      console.error(`❌ ${step.name}:`, err);
    }
  }
  console.log("Database setup complete.");
}

setup();
