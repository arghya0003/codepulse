import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { verifyQstashSignature } from "@/lib/webhooks";
// We comment these out because the modules do not exist yet.
// They will be implemented in Phase 3.
// import { syncAllPlatforms, aggregateStats } from "@/actions/sync";
// import { logSecurityAudit } from "@/actions/audit";

/**
 * QStash Webhook Handler
 * Receives cron events from Upstash QStash
 * Validates HMAC signature and processes sync jobs
 */
export async function POST(request: NextRequest) {
  try {
    // Get request headers
    const headersList = headers();
    const signature = headersList.get("upstash-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing signature header" },
        { status: 401 }
      );
    }

    // Read request body
    const body = await request.json();

    // Verify HMAC signature
    const isValid = await verifyQstashSignature(
      JSON.stringify(body),
      signature
    );

    if (!isValid) {
      console.error("[QStash] Invalid signature");
      console.log("await logSecurityAudit('INVALID_WEBHOOK_SIGNATURE');");

      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    console.log("[QStash] Webhook received:", body);

    // Log the incoming webhook
    console.log("await logSecurityAudit('QSTASH_WEBHOOK_RECEIVED');");

    // Process based on job type
    switch (body.type) {
      case "SYNC_ALL_PLATFORMS":
        await handleSyncAllPlatforms();
        break;

      case "AGGREGATE_STATS":
        await handleAggregateStats();
        break;

      default:
        console.warn(`[QStash] Unknown job type: ${body.type}`);
        return NextResponse.json(
          { error: "Unknown job type" },
          { status: 400 }
        );
    }

    return NextResponse.json(
      {
        success: true,
        jobType: body.type,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[QStash] Webhook error:", error);

    await logSecurityAudit("QSTASH_WEBHOOK_ERROR", undefined, {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Handle SYNC_ALL_PLATFORMS job
 * Syncs all platforms for all users
 */
async function handleSyncAllPlatforms() {
  const startTime = Date.now();

  try {
    console.log("[Sync] Starting platform sync for all users");

    // Call the sync action (Phase 3 implementation)
    // This will be implemented when Phase 3 (Platform APIs) is started
    // await syncAllPlatforms();

    // For now, just log and verify webhook is working
    const duration = Date.now() - startTime;
    console.log(`[Sync] Completed in ${duration}ms`);

    await logSecurityAudit("PLATFORM_SYNC_COMPLETED", undefined, {
      duration,
      jobType: "SYNC_ALL_PLATFORMS",
    });
  } catch (error) {
    console.error("[Sync] Error syncing platforms:", error);

    await logSecurityAudit("PLATFORM_SYNC_FAILED", undefined, {
      error: error instanceof Error ? error.message : String(error),
      jobType: "SYNC_ALL_PLATFORMS",
    });

    throw error;
  }
}

/**
 * Handle AGGREGATE_STATS job
 * Aggregates and recalculates user statistics
 */
async function handleAggregateStats() {
  const startTime = Date.now();

  try {
    console.log("[Stats] Starting stats aggregation");

    // Call the aggregation action (Phase 3 implementation)
    // This will be implemented when Phase 3 (Platform APIs) is started
    // await aggregateStats();

    // For now, just log and verify webhook is working
    const duration = Date.now() - startTime;
    console.log(`[Stats] Aggregation completed in ${duration}ms`);

    await logSecurityAudit("STATS_AGGREGATION_COMPLETED", undefined, {
      duration,
      jobType: "AGGREGATE_STATS",
    });
  } catch (error) {
    console.error("[Stats] Error aggregating stats:", error);

    await logSecurityAudit("STATS_AGGREGATION_FAILED", undefined, {
      error: error instanceof Error ? error.message : String(error),
      jobType: "AGGREGATE_STATS",
    });

    throw error;
  }
}
