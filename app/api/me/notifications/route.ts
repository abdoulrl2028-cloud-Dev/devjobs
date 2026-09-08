import { NextRequest, NextResponse } from "next/server";
import { readSessionUserFromRequest } from "@/lib/auth";
import { ensureDatabaseReady } from "@/lib/db/init";
import {
  listNotifications,
  countUnreadNotifications,
} from "@/lib/db/premium";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = readSessionUserFromRequest(request);
  if (!session || session.role !== "candidate") {
    return NextResponse.json({ error: "Acesso restrito." }, { status: 401 });
  }
  await ensureDatabaseReady();
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? 30);
  const [items, unread] = await Promise.all([
    listNotifications(session.id, Math.min(limit, 50)),
    countUnreadNotifications(session.id),
  ]);
  return NextResponse.json({ data: { items, unread } });
}