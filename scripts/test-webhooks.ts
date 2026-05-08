/**
 * Phase 5 Webhook Testing Script
 *
 * Tests webhook functionality and security.
 * Run before deploying to verify everything works.
 *
 * Usage:
 *   npx ts-node scripts/test-webhooks.ts
 */

import { triggerSyncJob, triggerStatsAggregation } from "../lib/qstash";
import { checkMlServiceHealth } from "../lib/ml-client";
import { verifyQstashSignature } from "../lib/webhooks";
import dotenv from "dotenv";
import crypto from "crypto";

// Load environment variables
dotenv.config({ path: ".env.local" });

async function runTests() {
  console.log("🧪 Phase 5 Integration Tests\n");

  let passed = 0;
  let failed = 0;

  // Test 1: Check environment variables
  console.log("TEST 1: Environment Configuration");
  console.log("─".repeat(40));

  const requiredEnvVars = [
    "QSTASH_TOKEN",
    "QSTASH_SIGNING_KEY",
    "ML_SERVICE_URL",
    "ML_SERVICE_API_KEY",
  ];

  let envValid = true;
  for (const envVar of requiredEnvVars) {
    const value = process.env[envVar];
    if (value) {
      console.log(`✓ ${envVar}: configured`);
      passed++;
    } else {
      console.log(`✗ ${envVar}: NOT configured`);
      envValid = false;
      failed++;
    }
  }

  if (!envValid) {
    console.log(
      "\n⚠️  Some environment variables are missing. Update .env.local\n"
    );
  } else {
    console.log("✓ All environment variables configured\n");
  }

  // Test 2: ML Service Health
  if (process.env.ML_SERVICE_URL && process.env.ML_SERVICE_API_KEY) {
    console.log("TEST 2: ML Service Health");
    console.log("─".repeat(40));

    try {
      const health = await checkMlServiceHealth();
      console.log(`✓ ML Service responding: ${health.status}`);
      console.log(`  Timestamp: ${health.timestamp}\n`);
      passed++;
    } catch (error) {
      console.log(`✗ ML Service error: ${error}`);
      console.log(
        "  Make sure FastAPI service is running on the configured URL\n"
      );
      failed++;
    }
  }

  // Test 3: HMAC Signature Verification
  console.log("TEST 3: HMAC Signature Verification");
  console.log("─".repeat(40));

  try {
    const testPayload = JSON.stringify({
      type: "SYNC_ALL_PLATFORMS",
      timestamp: new Date().toISOString(),
    });

    const signingKey = process.env.QSTASH_SIGNING_KEY;
    if (!signingKey) {
      throw new Error("QSTASH_SIGNING_KEY not configured");
    }

    // Create a valid signature
    const decodedKey = Buffer.from(signingKey, "base64url");
    const validSignature = crypto
      .createHmac("sha256", decodedKey)
      .update(testPayload)
      .digest("base64url");

    // Verify it
    const isValid = await verifyQstashSignature(testPayload, validSignature);
    if (isValid) {
      console.log("✓ Valid signature verified correctly");
      passed++;
    } else {
      console.log("✗ Valid signature failed verification");
      failed++;
    }

    // Test invalid signature
    const invalidSignature = "invalid-signature-test";
    const isInvalid = await verifyQstashSignature(testPayload, invalidSignature);
    if (!isInvalid) {
      console.log("✓ Invalid signature rejected correctly\n");
      passed++;
    } else {
      console.log("✗ Invalid signature was accepted\n");
      failed++;
    }
  } catch (error) {
    console.log(`✗ Signature verification error: ${error}\n`);
    failed++;
  }

  // Test 4: QStash Message Publishing (Optional)
  if (process.env.QSTASH_TOKEN && envValid) {
    console.log("TEST 4: QStash Message Publishing");
    console.log("─".repeat(40));

    try {
      console.log("Triggering sync job (manual)...");
      await triggerSyncJob();
      console.log("✓ Sync job triggered successfully");
      passed++;

      console.log("Triggering stats aggregation (manual)...");
      await triggerStatsAggregation();
      console.log("✓ Stats aggregation triggered successfully\n");
      passed++;
    } catch (error) {
      console.log(`✗ QStash publishing error: ${error}\n`);
      console.log(
        "Note: This may fail if webhook URL is not publicly accessible\n"
      );
      failed++;
    }
  }

  // Summary
  console.log("═".repeat(40));
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed\n`);

  if (failed === 0) {
    console.log("✅ All tests passed! Phase 5 is ready.\n");
    process.exit(0);
  } else {
    console.log(
      "⚠️  Some tests failed. Check configuration and try again.\n"
    );
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  console.error("Test execution error:", error);
  process.exit(1);
});
