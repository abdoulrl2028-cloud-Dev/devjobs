import { NextRequest, NextResponse } from "next/server";
import { readSessionUserFromRequest } from "@/lib/auth";
import { ensureDatabaseReady } from "@/lib/db/init";
import {
  listResumes,
  createResume,
  updateResume,
  duplicateResume,
  deleteResume,
} from "@/lib/db/premium";
import type { ResumeData } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = readSessionUserFromRequest(request);
  if (!session || session.role !== "candidate") {
    return NextResponse.json({ error: "Acesso restrito." }, { status: 401 });
  }
  await ensureDatabaseReady();
  const items = await listResumes(session.id);
  return NextResponse.json({ data: { items } });
}

export async function POST(request: NextRequest) {
  const session = readSessionUserFromRequest(request);
  if (!session || session.role !== "candidate") {
    return NextResponse.json({ error: "Acesso restrito." }, { status: 401 });
  }
  await ensureDatabaseReady();
  const body = (await request.json().catch(() => ({}))) as { action?: string; title?: string; data?: ResumeData; id?: string };
  if (body.action === "duplicate") {
    if (!body.id) return NextResponse.json({ error: "ID do currículo é obrigatório." }, { status: 400 });
    const copy = await duplicateResume(body.id, session.id);
    if (!copy) return NextResponse.json({ error: "Currículo não encontrado." }, { status: 404 });
    return NextResponse.json({ data: { item: copy } });
  }
  const title = (body.title ?? "Meu currículo").trim().slice(0, 120) || "Meu currículo";
  const data = body.data as ResumeData;
  const created = await createResume(session.id, title, data);
  return NextResponse.json({ data: { item: created } }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const session = readSessionUserFromRequest(request);
  if (!session || session.role !== "candidate") {
    return NextResponse.json({ error: "Acesso restrito." }, { status: 401 });
  }
  await ensureDatabaseReady();
  const body = (await request.json().catch(() => ({}))) as { id?: string; title?: string; data?: ResumeData };
  if (!body.id) return NextResponse.json({ error: "ID do currículo é obrigatório." }, { status: 400 });
  const title = (body.title ?? "").trim().slice(0, 120);
  if (!title && !body.data) return NextResponse.json({ error: "Nada para atualizar." }, { status: 400 });
  const current = (await listResumes(session.id)).find((r) => r.id === body.id);
  if (!current) return NextResponse.json({ error: "Currículo não encontrado." }, { status: 404 });
  await updateResume(body.id, session.id, title || current.title, body.data ?? current.data);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const session = readSessionUserFromRequest(request);
  if (!session || session.role !== "candidate") {
    return NextResponse.json({ error: "Acesso restrito." }, { status: 401 });
  }
  await ensureDatabaseReady();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID do currículo é obrigatório." }, { status: 400 });
  await deleteResume(id, session.id);
  return NextResponse.json({ ok: true });
}