import { NextRequest, NextResponse } from "next/server";
import { readSessionUserFromRequest } from "@/lib/auth";
import { ensureDatabaseReady } from "@/lib/db/init";
import { getConsent, listConsents, upsertConsent } from "@/lib/db/consents";
import { insertRealtimeEvent } from "@/lib/db/events";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = readSessionUserFromRequest(request);
  if (!session || session.role !== "candidate") {
    return NextResponse.json({ error: "Acesso restrito." }, { status: 401 });
  }
  await ensureDatabaseReady();

  const type = request.nextUrl.searchParams.get("type");
  const target = request.nextUrl.searchParams.get("target");

  if (type) {
    const consent = await getConsent(session.id, type, target);
    return NextResponse.json({ data: { consent: consent ?? null, granted: Boolean(consent?.granted) } });
  }
  const items = await listConsents(session.id);
  return NextResponse.json({ data: { items } });
}

export async function POST(request: NextRequest) {
  const session = readSessionUserFromRequest(request);
  if (!session || session.role !== "candidate") {
    return NextResponse.json({ error: "Acesso restrito." }, { status: 401 });
  }
  await ensureDatabaseReady();

  const body = (await request.json().catch(() => ({}))) as {
    type?: string;
    target?: string | null;
    granted?: boolean;
  };
  if (!body.type || typeof body.granted !== "boolean") {
    return NextResponse.json({ error: "type e granted são obrigatórios." }, { status: 400 });
  }

  const consent = await upsertConsent({
    userId: session.id,
    type: body.type,
    target: body.target ?? null,
    granted: body.granted,
  });

  await insertRealtimeEvent(session.id, "consent.updated", {
    type: consent.type,
    target: consent.target,
    granted: consent.granted,
    at: consent.updatedAt,
  });

  return NextResponse.json({ data: { consent } }, { status: 201 });
}