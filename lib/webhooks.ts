/**
 * Webhook Security Utilities
 *
 * HMAC-SHA256 signature validation for QStash webhooks
 */

import crypto from "crypto";

/**
 * Verify QStash webhook signature
 *
 * QStash signs all webhook calls with HMAC-SHA256 using your signing key.
 * We validate the signature to ensure the webhook came from QStash.
 *
 * @param body - The webhook request body as string
 * @param signature - The signature from upstash-signature header
 * @returns Whether the signature is valid
 */
export async function verifyQstashSignature(
  body: string,
  signature: string
): Promise<boolean> {
  try {
    const signingKey = process.env.QSTASH_SIGNING_KEY;

    if (!signingKey) {
      console.error("QSTASH_SIGNING_KEY not configured");
      return false;
    }

    // QStash uses base64url encoding for the signing key
    // We need to decode it first
    const decodedKey = Buffer.from(signingKey, "base64url");

    // Create HMAC-SHA256 signature of the body
    const computedSignature = crypto
      .createHmac("sha256", decodedKey)
      .update(body)
      .digest("base64url");

    // Compare signatures (timing-safe comparison)
    return crypto.timingSafeEqual(
      Buffer.from(computedSignature),
      Buffer.from(signature)
    );
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}

/**
 * Validate webhook payload structure
 *
 * Ensures the webhook payload matches expected schema
 *
 * @param payload - The webhook payload
 * @returns Whether payload is valid
 */
export function validateQstashPayload(payload: unknown): payload is {
  type: string;
  [key: string]: unknown;
} {
  if (typeof payload !== "object" || payload === null) {
    return false;
  }

  const obj = payload as Record<string, unknown>;

  // Check required fields
  if (typeof obj.type !== "string") {
    return false;
  }

  // Validate job type
  const validTypes = ["SYNC_ALL_PLATFORMS", "AGGREGATE_STATS"];
  if (!validTypes.includes(obj.type)) {
    return false;
  }

  return true;
}

/**
 * Create a QStash webhook URL
 *
 * Helper to construct the full webhook URL for QStash
 *
 * @param path - The API route path (e.g., '/api/webhooks/qstash')
 * @returns Full webhook URL
 */
export function createQstashWebhookUrl(path: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL;

  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_APP_URL or VERCEL_URL not set");
  }

  // Ensure baseUrl is absolute
  const url = baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`;

  return `${url}${path}`;
}

/**
 * Log webhook event for security audit
 *
 * @param eventType - Type of webhook event
 * @param metadata - Additional metadata to log
 */
export function logWebhookEvent(
  eventType: string,
  metadata?: Record<string, unknown>
): void {
  const timestamp = new Date().toISOString();
  console.log(`[Webhook] ${eventType} at ${timestamp}`, metadata || "");
}
