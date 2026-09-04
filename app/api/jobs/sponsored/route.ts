import { NextResponse } from "next/server";
import { getSponsoredJobs } from "@/lib/db/jobs";
import { ensureDatabaseReady } from "@/lib/db/init";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureDatabaseReady();
  const jobs = await getSponsoredJobs();
  const response = NextResponse.json({ data: jobs });
  response.headers.set("Cache-Control", "no-store");
  return response;
}