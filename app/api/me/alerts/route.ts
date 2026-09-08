import { NextRequest, NextResponse } from "next/server";
import { readSessionUserFromRequest } from "@/lib/auth";
import { ensureDatabaseReady } from "@/lib/db/init";
import { listAlerts, createAlert, updateAlert, deleteAlert, markAlertRun } from "@/lib/db/premium";
import type { JobType } from "@/lib/types";

export const dynamic = "force-dynamic";

const FREQUENCIES = ["daily", "weekly", "monthly"];

export async function GET(request: NextRequest) {
  const session = readSessionUserFromRequest(request);
  if (!session || session.role !== "candidate") {
    return NextResponse.json({ error: "Acesso restrito." }, { status: 401 });
  }
  await ensureDatabaseReady();
  const items = await listAlerts(session.id);
  return NextResponse.json({ data: { items } });
}

export async function POST(request: NextRequest) {
  const session = readSessionUserFromRequest(request);
  if (!session || session.role !== "candidate") {
    return NextResponse.json({ error: "Acesso restrito." }, { status: 401 });
  }
  await ensureDatabaseReady();
  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    query?: string;
    location?: string | null;
    remote?: boolean | null;
    type?: JobType | null;
    salaryMin?: number | null;
    tags?: string[] | null;
    frequency?: string;
    active?: boolean;
  };
  const query = (body.query ?? "").trim().slice(0, 200);
  if (!query) return NextResponse.json({ error: "A busca do alerta é obrigatória." }, { status: 400 });
  if (!FREQUENCIES.includes(body.frequency ?? "")) {
    return NextResponse.json({ error: "Frequência inválida." }, { status: 400 });
  }
  const created = await createAlert(session.id, {
    name: (body.name ?? query).trim().slice(0, 120) || query,
    query,
    location: body.location ?? null,
    remote: Boolean(body.remote),
    type: (body.type as JobType | null) ?? null,
    salaryMin: typeof body.salaryMin === "number" ? body.salaryMin : null,
    tags: Array.isArray(body.tags) ? body.tags.map(String).slice(0, 12) : [],
    frequency: body.frequency as "daily" | "weekly" | "monthly",
    active: body.active !== false,
  });
  return NextResponse.json({ data: { item: created } }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const session = readSessionUserFromRequest(request);
  if (!session || session.role !== "candidate") {
    return NextResponse.json({ error: "Acesso restrito." }, { status: 401 });
  }
  await ensureDatabaseReady();
  const body = (await request.json().catch(() => ({}))) as {
    id?: string;
    name?: string;
    query?: string;
    location?: string | null;
    remote?: boolean | null;
    type?: JobType | null;
    salaryMin?: number | null;
    tags?: string[] | null;
    frequency?: string;
    active?: boolean;
    test?: boolean;
  };
  if (!body.id) return NextResponse.json({ error: "ID do alerta é obrigatório." }, { status: 400 });
  if (body.frequency && !FREQUENCIES.includes(body.frequency)) {
    return NextResponse.json({ error: "Frequência inválida." }, { status: 400 });
  }
  if (body.test) {
    await markAlertRun(body.id, session.id);
    return NextResponse.json({ ok: true });
  }
  await updateAlert(body.id, session.id, {
    name: body.name,
    query: body.query,
    location: body.location,
    remote: body.remote === undefined ? undefined : Boolean(body.remote),
    type: body.type,
    salaryMin: body.salaryMin,
    tags: body.tags === undefined ? undefined : body.tags?.map(String).slice(0, 12),
    frequency: body.frequency as "daily" | "weekly" | "monthly" | undefined,
    active: body.active,
  });
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
  if (!id) return NextResponse.json({ error: "ID do alerta é obrigatório." }, { status: 400 });
  await deleteAlert(id, session.id);
  return NextResponse.json({ ok: true });
}