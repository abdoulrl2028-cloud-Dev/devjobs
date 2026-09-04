import { NextRequest, NextResponse } from "next/server";
import { searchJobs } from "@/lib/jobs";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const jobs = searchJobs({
    q: params.get("q"),
    location: params.get("location"),
    type: params.get("type"),
    remote: params.get("remote"),
  });
  return NextResponse.json({ data: jobs, count: jobs.length });
}