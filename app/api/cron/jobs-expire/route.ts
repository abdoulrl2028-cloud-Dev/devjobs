import { NextRequest, NextResponse } from "next/server";
import { ensureDatabaseReady } from "@/lib/db/init";
import { execute, queryAll } from "@/lib/db/conn";
import { insertRealtimeEvent } from "@/lib/db/events";

export const dynamic = "force-dynamic";

// Expira vagas cujo expires_at já passou. Protegida por CRON_SECRET.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET não configurado" }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  await ensureDatabaseReady();

  const now = new Date().toISOString();
  const expires = await queryAll(
    "SELECT id FROM jobs WHERE status = 'active' AND expires_at IS NOT NULL AND expires_at < ?",
    [now]
  );
  if (expires.length) {
    const ids = expires.map((r) => String(r.id));
    const placeholders = ids.map(() => "?").join(", ");
    await execute(`UPDATE jobs SET status = 'expired' WHERE id IN (${placeholders})`, ids);
    if (ids.length) {
      await insertRealtimeEvent(null, "job.expired", {
        count: ids.length,
        jobIds: ids,
        at: now,
      });
    }
  }
  return NextResponse.json({ data: { expired: expires.length } });
}