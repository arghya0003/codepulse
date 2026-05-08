-- CodePulse — Full Reset & Rebuild (wrapped in transaction)
-- Paste ENTIRE file into Neon SQL Editor and click Run

BEGIN;

-- Drop old tables
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS platform_tokens CASCADE;
DROP TABLE IF EXISTS user_stats CASCADE;
DROP TABLE IF EXISTS friendships CASCADE;
DROP TABLE IF EXISTS contribution_snapshots CASCADE;
DROP TABLE IF EXISTS friend_connections CASCADE;
DROP TABLE IF EXISTS ml_predictions CASCADE;
DROP TABLE IF EXISTS platform_profiles CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop old types
DROP TYPE IF EXISTS platform CASCADE;
DROP TYPE IF EXISTS friend_status CASCADE;
DROP TYPE IF EXISTS prediction_type CASCADE;

-- New enum types
CREATE TYPE platform AS ENUM('github','leetcode','codeforces','codechef','gfg');
CREATE TYPE friend_status AS ENUM('pending','accepted','blocked');
CREATE TYPE prediction_type AS ENUM('peak_hours','anomaly','forecast');

-- Users
CREATE TABLE users (
  id          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id    text          NOT NULL UNIQUE,
  email       text          NOT NULL,
  username    text,
  first_name  text,
  last_name   text,
  image_url   text,
  is_public   integer       NOT NULL DEFAULT 1,
  created_at  timestamptz   NOT NULL DEFAULT now(),
  updated_at  timestamptz   NOT NULL DEFAULT now()
);

-- Platform Profiles
CREATE TABLE platform_profiles (
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
  metadata        jsonb       NOT NULL DEFAULT '{}'::jsonb,
  last_synced     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Contribution Snapshots
CREATE TABLE contribution_snapshots (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid        NOT NULL REFERENCES platform_profiles(id) ON DELETE CASCADE,
  date       date        NOT NULL,
  count      integer     NOT NULL DEFAULT 0,
  metadata   jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Friend Connections
CREATE TABLE friend_connections (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  addressee_id uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status       text        NOT NULL DEFAULT 'pending',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- ML Predictions
CREATE TABLE ml_predictions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  prediction_type text        NOT NULL,
  payload         jsonb       NOT NULL,
  generated_at    timestamptz NOT NULL DEFAULT now()
);

-- Indexes (all after all tables are created)
CREATE UNIQUE INDEX user_platform_idx        ON platform_profiles(user_id, platform);
CREATE INDEX platform_profiles_user_id_idx  ON platform_profiles(user_id);
CREATE UNIQUE INDEX profile_date_idx        ON contribution_snapshots(profile_id, date);
CREATE INDEX snapshots_profile_id_idx       ON contribution_snapshots(profile_id);
CREATE INDEX snapshots_date_idx             ON contribution_snapshots(date);
CREATE UNIQUE INDEX requester_addressee_idx ON friend_connections(requester_id, addressee_id);
CREATE INDEX ml_user_prediction_idx         ON ml_predictions(user_id, prediction_type);

-- Re-insert your user (update email below)
INSERT INTO users (clerk_id, email, first_name)
VALUES ('user_3CPhdrFH5coPzHO2Zx1oEz5l5FF', 'arghyabhatt2003@email.com', 'Arghya')
ON CONFLICT (clerk_id) DO NOTHING;

COMMIT;
