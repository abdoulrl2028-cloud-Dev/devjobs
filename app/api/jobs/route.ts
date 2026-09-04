import { NextRequest, NextResponse } from "next/server";
import { searchJobs, type JobFilter } from "@/lib/db/jobs";
import { ensureDatabaseReady } from "@/lib/db/init";
import type { JobType } from "@/lib/types";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = new Set<JobType>(["full-time", "part-time", "contract", "internship"]);
const MAX_Q_LENGTH = 80;

function clamp(value: string | null, max: number): string | null {
  if (value === null) return null;
  return value.length > max ? value.slice(0, max) : value;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const type = clamp(params.get("type"), 20);
  const remote = params.get("remote");
  const location = clamp(params.get("location"), 60);

  if (type && !ALLOWED_TYPES.has(type as JobType)) {
    return NextResponse.json({ error: "Tipo de vaga inválido" }, { status: 400 });
  }
  if (remote !== null && remote !== "true" && remote !== "false") {
    return NextResponse.json({ error: "Parâmetro remote inválido" }, { status: 400 });
  }

  await ensureDatabaseReady();

  const filter: JobFilter = {
    q: clamp(params.get("q"), MAX_Q_LENGTH),
    location,
    type,
    remote,
  };

  const jobs = await searchJobs(filter);

  const response = NextResponse.json({ data: jobs, count: jobs.length });
  response.headers.set("Cache-Control", "no-store");
  return response;
}