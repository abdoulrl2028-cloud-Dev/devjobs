import { NextRequest, NextResponse } from "next/server";
import { requireCompany } from "@/lib/context";
import { ensureDatabaseReady } from "@/lib/db/init";
import { getJobById } from "@/lib/db/jobs";
import {
  createScheduledInterview,
  listCompanyInterviews,
  assertIsCompanyOwner,
  getInterviewInfo,
} from "@/lib/db/interviews";
import { createNotification } from "@/lib/db/premium";
import { insertRealtimeEvent } from "@/lib/db/events";
import type { InterviewType } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VALID_TYPES: InterviewType[] = ["technical", "practical", "theoretical", "ai", "company_online"];

function parseDateTime(value: string): string | null {
  const iso = new Date(value);
  return Number.isNaN(iso.getTime()) ? null : iso.toISOString();
}

export async function POST(request: NextRequest) {
  let rich;
  try {
    rich = await requireCompany();
  } catch {
    return NextResponse.json({ error: "Acesso restrito a empresas." }, { status: 403 });
  }
  await ensureDatabaseReady();

  const body = (await request.json().catch(() => ({}))) as {
    jobId?: string;
    candidateId?: string;
    type?: string;
    title?: string;
    description?: string;
    scheduledAt?: string;
    durationMinutes?: number;
    meetingUrl?: string;
    interviewerName?: string;
  };

  if (!body.jobId || !body.candidateId) {
    return NextResponse.json({ error: "jobId e candidateId são obrigatórios." }, { status: 400 });
  }
  const job = await getJobById(body.jobId);
  if (!job) {
    return NextResponse.json({ error: "Vaga não encontrada." }, { status: 404 });
  }
  if ((await assertIsCompanyOwner(rich.company.id, job.id)) === false) {
    return NextResponse.json({ error: "Esta vaga não pertence à sua empresa." }, { status: 403 });
  }
  const type = VALID_TYPES.includes(body.type as InterviewType) ? (body.type as InterviewType) : "company_online";
  const scheduledAt = parseDateTime(body.scheduledAt ?? "");
  if (!scheduledAt) {
    return NextResponse.json({ error: "Data e hora do agendamento são obrigatórias." }, { status: 400 });
  }
  const duration = Number(body.durationMinutes);
  if (!Number.isFinite(duration) || duration <= 0) {
    return NextResponse.json({ error: "duração inválida." }, { status: 400 });
  }

  const interviewId = await createScheduledInterview({
    userId: rich.user.id,
    companyId: rich.company.id,
    jobId: job.id,
    candidateId: body.candidateId,
    type,
    title: body.title?.trim() || `Entrevista para ${job.title}`,
    description: body.description?.trim() || null,
    scheduledAt,
    durationMinutes: duration,
    meetingUrl: body.meetingUrl?.trim() || null,
    interviewerName: body.interviewerName?.trim() || null,
  });

  await createNotification(body.candidateId, {
    type: "interview",
    title: "Novo convite de entrevista",
    body: `${rich.company.name} agendou uma entrevista para a vaga ${job.title} em ${new Date(scheduledAt).toLocaleString("pt-BR")}.`,
    jobId: job.id,
  });
  await insertRealtimeEvent(body.candidateId, "interview.scheduled", {
    interviewId,
    companyName: rich.company.name,
    jobId: job.id,
    scheduledAt,
  });

  return NextResponse.json({ data: { id: interviewId } }, { status: 201 });
}

export async function GET(request: NextRequest) {
  let rich;
  try {
    rich = await requireCompany();
  } catch {
    return NextResponse.json({ error: "Acesso restrito a empresas." }, { status: 403 });
  }
  await ensureDatabaseReady();
  const items = await listCompanyInterviews(rich.company.id);
  const response = NextResponse.json({ data: { interviews: items } });
  response.headers.set("Cache-Control", "no-store");
  return response;
}