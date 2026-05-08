/**
 * QStash Client Wrapper
 *
 * High-level interface for interacting with Upstash QStash
 * for scheduling cron jobs and managing webhooks
 */

import { Client } from "@upstash/qstash";
import { createQstashWebhookUrl } from "./webhooks";

// Initialize QStash client
const qstashClient = new Client({
  token: process.env.QSTASH_TOKEN || "",
});

/**
 * Schedule a sync job for all platforms
 * Runs every 6 hours by default
 */
export async function scheduleSyncJob(cronExpression = "0 */6 * * *") {
  try {
    const webhookUrl = createQstashWebhookUrl("/api/webhooks/qstash");

    const response = await qstashClient.scheduleEmail({
      schedule: cronExpression,
      destination: webhookUrl,
      body: {
        type: "SYNC_ALL_PLATFORMS",
        scheduledAt: new Date().toISOString(),
      },
      retries: 3,
      headers: {
        "content-type": "application/json",
      },
    });

    console.log("[QStash] Sync job scheduled:", response);
    return response;
  } catch (error) {
    console.error("[QStash] Error scheduling sync job:", error);
    throw error;
  }
}

/**
 * Schedule a stats aggregation job
 * Runs once daily at 2 AM by default
 */
export async function scheduleStatsAggregationJob(
  cronExpression = "0 2 * * *"
) {
  try {
    const webhookUrl = createQstashWebhookUrl("/api/webhooks/qstash");

    const response = await qstashClient.scheduleEmail({
      schedule: cronExpression,
      destination: webhookUrl,
      body: {
        type: "AGGREGATE_STATS",
        scheduledAt: new Date().toISOString(),
      },
      retries: 3,
      headers: {
        "content-type": "application/json",
      },
    });

    console.log("[QStash] Stats aggregation job scheduled:", response);
    return response;
  } catch (error) {
    console.error("[QStash] Error scheduling stats job:", error);
    throw error;
  }
}

/**
 * Manually trigger a sync job (useful for testing)
 */
export async function triggerSyncJob() {
  try {
    const webhookUrl = createQstashWebhookUrl("/api/webhooks/qstash");

    const response = await qstashClient.publishJSON({
      url: webhookUrl,
      body: {
        type: "SYNC_ALL_PLATFORMS",
        triggeredManually: true,
        triggeredAt: new Date().toISOString(),
      },
    });

    console.log("[QStash] Sync job triggered:", response);
    return response;
  } catch (error) {
    console.error("[QStash] Error triggering sync job:", error);
    throw error;
  }
}

/**
 * Manually trigger a stats aggregation job (useful for testing)
 */
export async function triggerStatsAggregation() {
  try {
    const webhookUrl = createQstashWebhookUrl("/api/webhooks/qstash");

    const response = await qstashClient.publishJSON({
      url: webhookUrl,
      body: {
        type: "AGGREGATE_STATS",
        triggeredManually: true,
        triggeredAt: new Date().toISOString(),
      },
    });

    console.log("[QStash] Stats aggregation triggered:", response);
    return response;
  } catch (error) {
    console.error("[QStash] Error triggering stats aggregation:", error);
    throw error;
  }
}

/**
 * Get QStash client instance
 * Use for advanced operations not covered by helper functions
 */
export function getQstashClient() {
  return qstashClient;
}

/**
 * Check if QStash is properly configured
 */
export function isQstashConfigured(): boolean {
  const token = process.env.QSTASH_TOKEN;
  const signingKey = process.env.QSTASH_SIGNING_KEY;

  if (!token || !signingKey) {
    console.warn("[QStash] Not properly configured");
    return false;
  }

  return true;
}
