import { NextResponse } from "next/server";
import { getLocations } from "@/lib/jobs";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ data: getLocations() });
}