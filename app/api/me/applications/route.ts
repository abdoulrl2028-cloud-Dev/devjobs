import { NextRequest, NextResponse } from "next/server";
import { readSessionUserFromRequest } from "@/lib/auth";
import { ensureDatabaseReady } from "@/lib/db/init";
import { listApplicationsForCandidateFull, updateApplicationStage, updateApplicationNotes } from "@/lib/db/premium";
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