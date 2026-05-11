import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { clearUserPlatformCache } from "@/actions/platforms";

export async function POST() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await clearUserPlatformCache(clerkId);
  return NextResponse.json({ cleared: true });
}
