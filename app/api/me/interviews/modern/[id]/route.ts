import { NextRequest, NextResponse } from "next/server";
import { readSessionUserFromRequest } from "@/lib/auth";
import { ensureDatabaseReady } from "@/lib/db/init";
import { getCandidateInterview, setInterviewStatus, getInterviewInfo, getCompanyOwnerUserId } from "@/lib/db/interviews";
import { createNotification } from "@/lib/db/premium";
import { insertRealtimeEvent } from "@/lib/db/events";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Context) {
  const session = readSessionUserFromRequest(request);
  if (!session || session.role !== "candidate") {
    return NextResponse.json({ error: "Acesso restrito." }, { status: 401 });
  }
  await ensureDatabaseReady();
  const { id } = await context.params;
  const detail = await getCandidateInterview(session.id, id);
  if (!detail.item) {
    return NextResponse.json({ error: "Entrevista não encontrada." }, { status: 404 });
  }
  return NextResponse.json({ data: detail });
}

export async function PATCH(request: NextRequest, context: Context) {
  const session = readSessionUserFromRequest(request);
  if (!session || session.role !== "candidate") {
    return NextResponse.json({ error: "Acesso restrito." }, { status: 401 });
  }
  await ensureDatabaseReady();
  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { status?: string };
  const status = body.status;
  if (status !== "confirmed" && status !== "cancelled") {
    return NextResponse.json({ error: "Status inválido. Use 'confirmed' ou 'cancelled'." }, { status: 400 });
  }

  const info = await getInterviewInfo(id);
  if (!info || info.candidateUserId !== session.id) {
    return NextResponse.json({ error: "Entrevista não encontrada." }, { status: 404 });
  }
  const ok = await setInterviewStatus(id, session.id, status);
  if (!ok) {
    return NextResponse.json({ error: "Entrevista não encontrada." }, { status: 404 });
  }

  if (status === "confirmed") {
    await createNotification(session.id, {
      type: "interview",
      title: "Entrevista confirmada",
      body: "A empresa foi notificada. Guarde o link e a data combinados.",
    });
  } else {
    await createNotification(session.id, {
      type: "warning",
      title: "Entrevista cancelada",
      body: "Você cancelou esta entrevista.",
    });
  }
  if (info.companyOwnerUserId) {
    await createNotification(info.companyOwnerUserId, {
      type: status === "confirmed" ? "success" : "warning",
      title: status === "confirmed" ? "Entrevista confirmada pelo candidato" : "Entrevista cancelada pelo candidato",
      body: status === "confirmed" ? "O candidato confirmou a presença." : "O candidato cancelou a entrevista.",
      jobId: info.jobId ?? undefined,
    });
    await insertRealtimeEvent(info.companyOwnerUserId, status === "confirmed" ? "interview.updated" : "interview.cancelled", {
      interviewId: id,
      by: "candidate",
    });
  }
  await insertRealtimeEvent(session.id, status === "confirmed" ? "interview.updated" : "interview.cancelled", {
    interviewId: id,
    by: "candidate",
  });

  return NextResponse.json({ data: { id, status } });
}