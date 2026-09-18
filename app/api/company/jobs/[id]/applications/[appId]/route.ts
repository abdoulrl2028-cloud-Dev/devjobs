import { NextRequest, NextResponse } from "next/server";
import { requireCompany } from "@/lib/context";
import { assertSameOrigin } from "@/lib/auth";
import { ensureDatabaseReady } from "@/lib/db/init";
import { getJobById } from "@/lib/db/jobs";
import { getApplicationById } from "@/lib/db/activity";
import { updateApplicationStage, createNotification } from "@/lib/db/premium";
import { getConsent } from "@/lib/db/consents";
import { createMessage } from "@/lib/db/messages";
import { insertRealtimeEvent } from "@/lib/db/events";
import { APPLICATION_STAGES, STAGE_LABELS, type ApplicationStage } from "@/lib/types";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string; appId: string }> };

async function resolveOwned(request: NextRequest, params: Ctx["params"]) {
  const { id, appId } = await params;
  let rich;
  try {
    rich = await requireCompany();
  } catch {
    return { error: NextResponse.json({ error: "Acesso restrito a empresas" }, { status: 403 }) };
  }
  await ensureDatabaseReady();
  const job = await getJobById(id);
  if (!job || job.companyId !== rich.company.id) {
    return { error: NextResponse.json({ error: "Vaga não encontrada" }, { status: 404 }) };
  }
  const application = await getApplicationById(appId);
  if (!application || application.jobId !== job.id) {
    return { error: NextResponse.json({ error: "Candidatura não encontrada" }, { status: 404 }) };
  }
  return { rich, job, application };
}

// Mover o candidato no pipeline da vaga (etapa a etapa).
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const ctx = await resolveOwned(request, params);
  if ("error" in ctx) return ctx.error;
  const { rich, job, application } = ctx;
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const body = (await request.json().catch(() => ({}))) as { stage?: ApplicationStage };
  if (!body.stage || !APPLICATION_STAGES.includes(body.stage)) {
    return NextResponse.json({ error: "Etapa inválida." }, { status: 400 });
  }

  await updateApplicationStage(application.id, body.stage);

  const candidateId = application.candidateId;
  const label = STAGE_LABELS[body.stage] ?? body.stage;
  try {
    await createNotification(candidateId, {
      type: "application",
      title: "Atualização da sua candidatura",
      body: `${job.title}: sua candidatura avançou para "${label}".`,
      jobId: job.id,
    });
  } catch {
    // best-effort
  }
  await insertRealtimeEvent(candidateId, "application.updated", {
    applicationId: application.id,
    jobId: job.id,
    jobTitle: job.title,
    stage: body.stage,
    label,
    at: new Date().toISOString(),
  });
  await insertRealtimeEvent(candidateId, "notification.created", {
    title: "Atualização da sua candidatura",
    body: `${job.title}: "${label}"`,
    jobId: job.id,
  });

  return NextResponse.json({ data: { applicationId: application.id, stage: body.stage } });
}

// Enviar mensagem/proposta ao candidato (somente com consentimento do candidato).
export async function POST(request: NextRequest, { params }: Ctx) {
  const ctx = await resolveOwned(request, params);
  if ("error" in ctx) return ctx.error;
  const { rich, job, application } = ctx;
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const body = (await request.json().catch(() => ({}))) as { body?: string };
  const text = String(body.body ?? "").trim();
  if (!text) {
    return NextResponse.json({ error: "Mensagem vazia." }, { status: 400 });
  }
  if (text.length > 3000) {
    return NextResponse.json({ error: "Mensagem muito longa (máx. 3000)." }, { status: 400 });
  }

  const consent = await getConsent(application.candidateId, "share_to_company", rich.company.id);
  if (!consent?.granted) {
    return NextResponse.json(
      { error: "Este candidato ainda não autorizou o compartilhamento de dados nem o contato da empresa para esta candidatura." },
      { status: 403 }
    );
  }

  const message = await createMessage({
    applicationId: application.id,
    senderId: rich.user.id,
    recipientId: application.candidateId,
    body: text,
    channel: "inapp",
  });

  const candidateId = application.candidateId;
  try {
    await createNotification(candidateId, {
      type: "offer",
      title: "Nova mensagem da empresa",
      body: `${rich.company.name} enviou uma mensagem sobre "${job.title}".`,
      jobId: job.id,
    });
  } catch {
    // best-effort
  }
  await insertRealtimeEvent(candidateId, "company.message", {
    messageId: message.id,
    applicationId: application.id,
    jobId: job.id,
    jobTitle: job.title,
    company: rich.company.name,
    senderId: rich.user.id,
    at: message.createdAt,
  });
  await insertRealtimeEvent(candidateId, "notification.created", {
    title: "Nova mensagem da empresa",
    body: `${rich.company.name} · ${job.title}`,
    jobId: job.id,
  });

  return NextResponse.json({ data: { message } }, { status: 201 });
}