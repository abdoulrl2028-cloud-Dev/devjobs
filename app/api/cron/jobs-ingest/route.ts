import { NextRequest, NextResponse } from "next/server";
import { ingestJobs } from "@/lib/jobs/ingestion";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Endpoint de agendamento (Vercel Cron) — protegido por CRON_SECRET.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET não configurado" }, { status: 503 });
  }
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  try {
    const result = await ingestJobs();
    return NextResponse.json({ data: result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha na ingestão" },
      { status: 500 }
    );
  }
}