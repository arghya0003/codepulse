import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { verifyQstashSignature } from "@/lib/webhooks";

export async function POST(request: NextRequest) {
  try {
    const headersList = headers();
    const signature = headersList.get("upstash-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing signature header" }, { status: 401 });
    }

    const body = await request.json();

    const isValid = await verifyQstashSignature(JSON.stringify(body), signature);
    if (!isValid) {
      console.error("[QStash] Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    switch (body.type) {
      case "SYNC_ALL_PLATFORMS":
        await handleSyncAllPlatforms();
        break;

      case "AGGREGATE_STATS":
        await handleAggregateStats();
        break;

      default:
        console.warn(`[QStash] Unknown job type: ${body.type}`);
        return NextResponse.json({ error: "Unknown job type" }, { status: 400 });
    }

    return NextResponse.json(
      { success: true, jobType: body.type, timestamp: new Date().toISOString() },
      { status: 200 }
    );
  } catch (error) {
    console.error("[QStash] Webhook error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function handleSyncAllPlatforms() {
  const start = Date.now();
  // await syncAllPlatforms();  — Phase 3
  console.log(`[Sync] SYNC_ALL_PLATFORMS completed in ${Date.now() - start}ms`);
}

async function handleAggregateStats() {
  const start = Date.now();
  // await aggregateStats();  — Phase 3
  console.log(`[Stats] AGGREGATE_STATS completed in ${Date.now() - start}ms`);
}
