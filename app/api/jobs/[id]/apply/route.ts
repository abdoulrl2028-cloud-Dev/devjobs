import { NextRequest, NextResponse } from "next/server";
import { ensureDatabaseReady } from "@/lib/db/init";
import { getJobById } from "@/lib/db/jobs";
import { addApplication, hasApplied } from "@/lib/db/activity";
import { readSessionUserFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const jobId = (await params).id;

  const session = readSessionUserFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Faça login para se candidatar" }, { status: 401 });
  }
  if (session.role !== "candidate") {
    return NextResponse.json({ error: "Conta de candidato é necessária para se candidatar" }, { status: 403 });
  }

  await ensureDatabaseReady();
  const job = await getJobById(jobId);
  if (!job || job.status !== "active") {
    return NextResponse.json({ error: "Vaga indisponível" }, { status: 404 });
  }

  const already = await hasApplied(jobId, session.id);
  if (already) {
    return NextResponse.json({ error: "Você já se candidatou a esta vaga" }, { status: 409 });
  }

  const application = await addApplication(jobId, session.id);
  if (!application) {
    return NextResponse.json({ error: "Você já se candidatou a esta vaga" }, { status: 409 });
  }

  return NextResponse.json({ data: { message: "Candidatura enviada com sucesso!" } });
}