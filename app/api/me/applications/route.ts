import { NextRequest, NextResponse } from "next/server";
import { readSessionUserFromRequest } from "@/lib/auth";
import { ensureDatabaseReady } from "@/lib/db/init";
import { listApplicationsForCandidateFull, updateApplicationStage, updateApplicationNotes } from "@/lib/db/premium";
import { addAiApplication, hasApplied } from "@/lib/db/activity";
import { getJobById } from "@/lib/db/jobs";
import { getCompanyById } from "@/lib/db/company";
import { getResume, getInterview, createNotification } from "@/lib/db/premium";
import { insertRealtimeEvent } from "@/lib/db/events";
import { APPLICATION_STAGES, type ApplicationStage } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = readSessionUserFromRequest(request);
  if (!session || session.role !== "candidate") {
    return NextResponse.json({ error: "Acesso restrito." }, { status: 401 });
  }
  await ensureDatabaseReady();
  const items = await listApplicationsForCandidateFull(session.id);
  return NextResponse.json({ data: { items } });
}

export async function POST(request: NextRequest) {
  const session = readSessionUserFromRequest(request);
  if (!session || session.role !== "candidate") {
    return NextResponse.json({ error: "Acesso restrito." }, { status: 401 });
  }
  await ensureDatabaseReady();

  const body = (await request.json().catch(() => ({}))) as {
    jobId?: string;
    resumeId?: string;
    analysisScore?: number;
    interviewId?: string;
  };
  if (!body.jobId) {
    return NextResponse.json({ error: "jobId é obrigatório." }, { status: 400 });
  }

  const job = await getJobById(body.jobId);
  if (!job) return NextResponse.json({ error: "Vaga não encontrada." }, { status: 404 });
  if (job.status !== "active") {
    return NextResponse.json({ error: "Esta vaga não está mais ativa." }, { status: 410 });
  }

  if (body.resumeId && !(await getResume(body.resumeId, session.id))) {
    return NextResponse.json({ error: "Currículo não encontrado." }, { status: 400 });
  }
  if (body.interviewId && !(await getInterview(body.interviewId, session.id))) {
    return NextResponse.json({ error: "Entrevista não encontrada." }, { status: 400 });
  }
  const score =
    typeof body.analysisScore === "number"
      ? Math.max(0, Math.min(100, Math.round(body.analysisScore)))
      : null;

  if (await hasApplied(body.jobId, session.id)) {
    return NextResponse.json({ error: "Você já se candidatou a esta vaga." }, { status: 409 });
  }

  const application = await addAiApplication(body.jobId, session.id, {
    resumeId: body.resumeId ?? null,
    analysisScore: score,
    interviewId: body.interviewId ?? null,
  });
  if (!application) {
    return NextResponse.json({ error: "Não foi possível registrar a candidatura." }, { status: 500 });
  }

  const payload = {
    applicationId: application.id,
    jobId: application.jobId,
    jobTitle: job.title,
    company: job.company,
    score,
    via: "ai",
    at: application.appliedAt,
  };
  await insertRealtimeEvent(session.id, "application.created", payload);

  // Notifica o dono da empresa dona da vaga (notificação persistente + evento realtime).
  try {
    const company = job.companyId ? await getCompanyById(job.companyId) : undefined;
    if (company?.userId && company.userId !== session.id) {
      await createNotification(company.userId, {
        type: "application",
        title: "Nova candidatura",
        body: `${job.title} — novo candidato se candidatou com IA.`,
        jobId: job.id,
      });
      const companyPayload = {
        applicationId: application.id,
        jobId: job.id,
        jobTitle: job.title,
        candidateId: session.id,
        at: application.appliedAt,
      };
      await insertRealtimeEvent(company.userId, "application.created", companyPayload);
      await insertRealtimeEvent(company.userId, "notification.created", {
        title: "Nova candidatura",
        body: companyPayload.jobTitle,
        jobId: job.id,
      });
    }
  } catch {
    // Notificação à empresa é best-effort; a candidatura já foi registrada.
  }

  return NextResponse.json({ data: { application } }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const session = readSessionUserFromRequest(request);
  if (!session || session.role !== "candidate") {
    return NextResponse.json({ error: "Acesso restrito." }, { status: 401 });
  }
  await ensureDatabaseReady();
  const body = (await request.json().catch(() => ({}))) as {
    id?: string;
    stage?: ApplicationStage;
    notes?: string;
  };
  const { id, stage, notes } = body;
  if (!id) return NextResponse.json({ error: "ID da candidatura é obrigatório." }, { status: 400 });

  if (stage !== undefined) {
    if (!APPLICATION_STAGES.includes(stage)) {
      return NextResponse.json({ error: "Etapa inválida." }, { status: 400 });
    }
    await updateApplicationStage(id, stage);
  }
  if (notes !== undefined) {
    await updateApplicationNotes(id, notes);
  }
  return NextResponse.json({ ok: true });
}