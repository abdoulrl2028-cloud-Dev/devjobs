import { NextRequest, NextResponse } from "next/server";
import { readSessionUserFromRequest } from "@/lib/auth";
import { ensureDatabaseReady } from "@/lib/db/init";
import { markNotificationRead, markAllNotificationsRead } from "@/lib/db/premium";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest) {
  const session = readSessionUserFromRequest(request);
  if (!session || session.role !== "candidate") {
    return NextResponse.json({ error: "Acesso restrito." }, { status: 401 });
  }
  await ensureDatabaseReady();
  const segments = request.nextUrl.pathname.split("/");
  const id = segments[segments.length - 1];
  if (!id || id === "read-all") {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }
  await markNotificationRead(id, session.id);
  return NextResponse.json({ ok: true });
}