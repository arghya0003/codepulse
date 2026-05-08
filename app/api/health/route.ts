import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "codepulse",
    timestamp: new Date().toISOString(),
  });
}
