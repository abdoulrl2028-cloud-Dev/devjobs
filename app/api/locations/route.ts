import { NextResponse } from "next/server";
import { getDistinctLocations } from "@/lib/db/jobs";
import { ensureDatabaseReady } from "@/lib/db/init";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureDatabaseReady();
  const locations = await getDistinctLocations();
  const response = NextResponse.json({ data: locations });
  response.headers.set("Cache-Control", "no-store");
  return response;
}