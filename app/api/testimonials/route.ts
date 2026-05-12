import { NextResponse } from "next/server";
import { getApprovedTestimonials } from "@/actions/contact";

export async function GET() {
  try {
    const data = await getApprovedTestimonials();
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ data: [] });
  }
}
