import { NextRequest, NextResponse } from "next/server";
import { readSessionUserFromRequest } from "@/lib/auth";
import { ensureDatabaseReady } from "@/lib/db/init";
import { listCandidateInterviews } from "@/lib/db/interviews";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = readSessionUserFromRequest(request);
  if (!session || session.role !== "candidate") {
    return NextResponse.json({ error: "Acesso restrito." }, { status: 401 });
  }
  await ensureDatabaseReady();
  const items = await listCandidateInterviews(session.id);
  return NextResponse.json({ data: { interviews: items } });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}