import { NextRequest, NextResponse } from "next/server";
import { readSessionUserFromRequest } from "@/lib/auth";
import { ensureDatabaseReady } from "@/lib/db/init";
import { addFavorite, removeFavorite } from "@/lib/db/activity";
import { getFavoriteJobs } from "@/lib/db/jobs";

export const dynamic = "force-dynamic";

function sessionUserOr401(request: NextRequest) {
  const session = readSessionUserFromRequest(request);
  if (!session) {
    return { error: NextResponse.json({ error: "Faça login" }, { status: 401 }) };
  }
  return { session };
}

export async function GET(request: NextRequest) {
  const { error, session } = sessionUserOr401(request);
  if (error || !session) return error;

  await ensureDatabaseReady();
  const jobs = await getFavoriteJobs(session.id);
  const response = NextResponse.json({ data: jobs });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function POST(request: NextRequest) {
  const { error, session } = sessionUserOr401(request);
  if (error || !session) return error;

  let jobId: unknown = request.nextUrl.searchParams.get("jobId");
  if (!jobId) {
    try {
      const body: unknown = await request.json();
      jobId = typeof body === "object" && body !== null ? (body as { jobId?: unknown }).jobId : undefined;
    } catch {
      jobId = undefined;
    }
  }
  if (typeof jobId !== "string" || !jobId) {
    return NextResponse.json({ error: "Id da vaga é obrigatório" }, { status: 400 });
  }

  await ensureDatabaseReady();
  await addFavorite(session!.id, jobId);
  return NextResponse.json({ data: { ok: true } });
}

export async function DELETE(request: NextRequest) {
  const { error, session } = sessionUserOr401(request);
  if (error || !session) return error;

  const jobId = request.nextUrl.searchParams.get("jobId");
  if (!jobId) {
    return NextResponse.json({ error: "Id da vaga é obrigatório" }, { status: 400 });
  }

  await ensureDatabaseReady();
  await removeFavorite(session!.id, jobId);
  return NextResponse.json({ data: { ok: true } });
}