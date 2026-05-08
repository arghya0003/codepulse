/**
 * Database migration script — uses Neon HTTP driver with sql.query()
 * Works from any environment where TCP to PostgreSQL is blocked.
 *
 * Usage: npm run db:migrate-http
 */

import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { join } from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌  DATABASE_URL is not set in .env.local");
  process.exit(1);
}

async function migrate() {
  console.log("🚀  Starting migration via Neon HTTP driver...\n");

  const sql = neon(DATABASE_URL!);

  const migrationPath = join(
    process.cwd(),
    "db/migrations/0001_initial_schema.sql"
  );
  const migrationSQL = readFileSync(migrationPath, "utf-8");

  // Split into individual statements, removing empty ones and comment-only lines
  const statements = migrationSQL
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !/^--/.test(s));

  console.log(`📄  Found ${statements.length} SQL statements\n`);

  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i].endsWith(";")
      ? statements[i]
      : statements[i] + ";";
    const preview = stmt.slice(0, 70).replace(/\s+/g, " ");

    try {
      // sql.query() accepts a raw string — correct API for non-template use
      await sql.query(stmt);
      console.log(`  ✅  [${i + 1}/${statements.length}] ${preview}…`);
      succeeded++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      // "already exists" = idempotent — treat as success
      if (
        msg.includes("already exists") ||
        msg.includes("duplicate_object") ||
        msg.includes("already")
      ) {
        console.log(
          `  ⏭️   [${i + 1}/${statements.length}] ALREADY EXISTS — ${preview}…`
        );
        succeeded++;
      } else {
        console.error(
          `  ❌  [${i + 1}/${statements.length}] FAILED — ${preview}…`
        );
        console.error(`       ${msg}\n`);
        failed++;
      }
    }
  }

  console.log(`\n${"─".repeat(60)}`);
  console.log(`Result: ${succeeded} succeeded, ${failed} failed`);

  if (failed > 0) {
    console.error("\n⚠️  Some statements failed. Review errors above.");
    process.exit(1);
  }

  console.log("\n🎉  Schema applied successfully to Neon!");
}

migrate().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
