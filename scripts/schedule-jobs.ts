/**
 * Phase 5 Job Scheduler Setup Script
 *
 * Schedules QStash cron jobs for background synchronization.
 * Run this once to set up recurring sync jobs.
 *
 * Usage:
 *   npx ts-node scripts/schedule-jobs.ts
 */

import { scheduleSyncJob, scheduleStatsAggregationJob } from "../lib/qstash";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

async function scheduleAllJobs() {
  console.log("🚀 Setting up QStash cron jobs...\n");

  try {
    // Check if QStash is configured
    if (!process.env.QSTASH_TOKEN || !process.env.QSTASH_SIGNING_KEY) {
      console.error(
        "❌ Error: QSTASH_TOKEN and QSTASH_SIGNING_KEY must be set in .env.local"
      );
      process.exit(1);
    }

    console.log("✓ QStash credentials found\n");

    // Schedule sync job (every 6 hours)
    console.log("📅 Scheduling platform sync (every 6 hours)...");
    const syncJob = await scheduleSyncJob("0 */6 * * *");
    console.log("✓ Sync job scheduled");
    console.log(`  Cron: 0 */6 * * * (Every 6 hours)\n`);

    // Schedule stats aggregation job (daily at 2 AM)
    console.log("📅 Scheduling stats aggregation (daily at 2 AM)...");
    const statsJob = await scheduleStatsAggregationJob("0 2 * * *");
    console.log("✓ Stats aggregation job scheduled");
    console.log(`  Cron: 0 2 * * * (Daily at 2 AM)\n`);

    console.log("✅ All jobs scheduled successfully!\n");
    console.log("📌 Next steps:");
    console.log(
      "   1. Verify jobs in QStash console: https://console.upstash.com"
    );
    console.log("   2. Check webhook URL is publicly accessible");
    console.log(
      "   3. Test webhook manually by publishing a message in QStash\n"
    );
  } catch (error) {
    console.error("❌ Error scheduling jobs:", error);
    process.exit(1);
  }
}

// Run the scheduler
scheduleAllJobs();
