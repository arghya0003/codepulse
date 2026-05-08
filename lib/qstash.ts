/**
 * QStash scheduling stubs — Phase 3 placeholder.
 * Replace with real @upstash/qstash calls once QSTASH_TOKEN is provisioned.
 */

export async function scheduleSyncJob(cronExpression = "0 */6 * * *") {
  console.log("[QStash] scheduleSyncJob not yet configured", cronExpression);
}

export async function scheduleStatsAggregationJob(cronExpression = "0 2 * * *") {
  console.log("[QStash] scheduleStatsAggregationJob not yet configured", cronExpression);
}

export async function triggerSyncJob() {
  console.log("[QStash] triggerSyncJob not yet configured");
}

export async function triggerStatsAggregation() {
  console.log("[QStash] triggerStatsAggregation not yet configured");
}

export function isQstashConfigured(): boolean {
  return !!(process.env.QSTASH_TOKEN && process.env.QSTASH_SIGNING_KEY);
}
