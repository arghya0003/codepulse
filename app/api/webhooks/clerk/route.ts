import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { WebhookEvent } from "@clerk/nextjs/server";
import { upsertUser, deleteUser } from "@/actions/users";

/**
 * Clerk webhook endpoint.
 * Security gate: validates svix-signature HMAC before any processing.
 * Unsigned or tampered requests are rejected with 401.
 */
export async function POST(req: NextRequest) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("[clerk-webhook] CLERK_WEBHOOK_SECRET is not set");
    return new NextResponse("Webhook secret not configured", { status: 500 });
  }

  // ── Read svix headers ────────────────────────────────────────────────
  const svixId        = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new NextResponse("Missing svix headers", { status: 400 });
  }

  // ── Verify signature ─────────────────────────────────────────────────
  const body = await req.text();
  const wh = new Webhook(webhookSecret);

  let event: WebhookEvent;
  try {
    event = wh.verify(body, {
      "svix-id":        svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("[clerk-webhook] Invalid signature:", err);
    return new NextResponse("Invalid webhook signature", { status: 401 });
  }

  // ── Handle events ────────────────────────────────────────────────────
  const { type, data } = event;
  console.log(`[clerk-webhook] ${type} — id: ${data.id}`);

  try {
    switch (type) {
      case "user.created":
      case "user.updated": {
        const email = data.email_addresses?.[0]?.email_address;
        if (!email) {
          console.warn("[clerk-webhook] User has no email address:", data.id);
          break;
        }
        await upsertUser({
          clerkId: data.id,
          email,
          firstName: data.first_name ?? null,
          lastName: data.last_name ?? null,
          username: data.username ?? null,
          imageUrl: data.image_url ?? null,
        });
        console.log(`[clerk-webhook] User upserted: ${data.id}`);
        break;
      }

      case "user.deleted": {
        if (!data.id) break;
        await deleteUser(data.id);
        console.log(`[clerk-webhook] User deleted: ${data.id}`);
        break;
      }

      default:
        console.log(`[clerk-webhook] Unhandled event type: ${type}`);
    }
  } catch (err) {
    console.error(`[clerk-webhook] Error handling ${type}:`, err);
    // Return 500 so Clerk retries the event
    return new NextResponse("Internal server error", { status: 500 });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}

// Health probe for Clerk dashboard
export async function GET() {
  return NextResponse.json({ status: "ok" });
}
