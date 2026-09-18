import { NextRequest, NextResponse } from "next/server";
import { requireCompany } from "@/lib/context";
import { ensureDatabaseReady } from "@/lib/db/init";
import {
  getCompanyInterview,
  updateScheduledInterview,
  getInterviewInfo,
} from "@/lib/db/interviews";
import { createNotification } from "@/lib/db/premium";
import { insertRealtimeEvent } from "@/lib/db/events";

import type { InterviewScheduleStatus } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Context = { params: Promise<{ intervId: string }> };

function parseDateTime(value?: string): string | null {
  if (!value) return null;
  const iso = new Date(value);
  return Number.isNaN(iso.getTime()) ? null : iso.toISOString();
}

export async function GET(request: NextRequest, context: Context) {
  let rich;
  try {
    rich = await requireCompany();
  } catch {
    return NextResponse.json({ error: "Acesso restrito a empresas." }, { status: 403 });
  }
  await ensureDatabaseReady();
  const { intervId } = await context.params;
  const detail = await getCompanyInterview(rich.company.id, intervId);
  if (!detail.item) {
    return NextResponse.json({ error: "Entrevista não encontrada." }, { status: 404 });
  }
  const response = NextResponse.json({ data: detail });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function PATCH(request: NextRequest, context: Context) {
  let rich;
  try {
    rich = await requireCompany();
  } catch {
    return NextResponse.json({ error: "Acesso restrito a empresas." }, { status: 403 });
  }
  await ensureDatabaseReady();
  const { intervId } = await context.params;

  const info = await getInterviewInfo(intervId);
  if (!info || info.companyId !== rich.company.id) {
    return NextResponse.json({ error: "Entrevista não encontrada." }, { status: 404 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    scheduledAt?: string;
    durationMinutes?: number;
    meetingUrl?: string;
    interviewerName?: string;
    status?: string;
    title?: string;
    description?: string;
  };

  const status = body.status;
  if (status !== undefined && !["scheduled", "confirmed", "completed", "cancelled"].includes(status)) {
    return NextResponse.json({ error: "Status inválido." }, { status: 400 });
  }
  const duration = body.durationMinutes === undefined ? undefined : Number(body.durationMinutes);
  if (duration !== undefined && (!Number.isFinite(duration) || duration <= 0)) {
    return NextResponse.json({ error: "duração inválida." }, { status: 400 });
  }
  const scheduledAt = parseDateTime(body.scheduledAt);

  const ok = await updateScheduledInterview(intervId, rich.company.id, {
    scheduledAt: scheduledAt ?? undefined,
    durationMinutes: duration,
    meetingUrl: body.meetingUrl,
    interviewerName: body.interviewerName,
    status: status as InterviewScheduleStatus | undefined,
    title: body.title,
    description: body.description,
  });
  if (!ok) {
    return NextResponse.json({ error: "Entrevista não encontrada." }, { status: 404 });
  }

  if (info.candidateUserId) {
    if (status === "cancelled") {
      await createNotification(info.candidateUserId, {
        type: "warning",
        title: "Entrevista cancelada pela empresa",
        body: "Sua entrevista foi cancelada. Entre em contato com a empresa para reagendar.",
        jobId: info.jobId ?? undefined,
      });
      await insertRealtimeEvent(info.candidateUserId, "interview.cancelled", { interviewId: intervId, by: "company" });
    } else if (scheduledAt) {
      await createNotification(info.candidateUserId, {
        type: "interview",
        title: "Entrevista reagendada",
        body: `Nova data/hora: ${new Date(scheduledAt).toLocaleString("pt-BR")}. Confirme na plataforma.`,
        jobId: info.jobId ?? undefined,
      });
      await insertRealtimeEvent(info.candidateUserId, "interview.updated", { interviewId: intervId, scheduledAt });
    }
  }

  return NextResponse.json({ data: { id: intervId, status: status ?? "updated" } });
}