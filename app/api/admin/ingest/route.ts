import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/context";
import { assertSameOrigin } from "@/lib/auth";
import { ensureDatabaseReady } from "@/lib/db/init";
import { ingestJobs } from "@/lib/jobs/ingestion";
import type { FeedSource } from "@/lib/jobs/providers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Dispara manualmente a ingestão de vagas internacionais (apenas admin).
// Body opcional: { sources: ["remotive"] | ["jsearch"] | ["adzuna"] | [] }
export async function POST(request: NextRequest) {
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Acesso restrito a administradores" }, { status: 403 });
  }
  await ensureDatabaseReady();

  let body: { sources?: FeedSource[] } = {};
  try {
    const parsed = (await request.json()) as { sources?: unknown };
    if (Array.isArray(parsed.sources)) {
      body.sources = parsed.sources.filter(
        (s): s is FeedSource => s === "remotive" || s === "jsearch" || s === "adzuna"
      );
    }
  } catch {
    // Sem body = todas as fontes habilitadas.
  }

  const result = await ingestJobs({ sources: body.sources });
  return NextResponse.json({ data: result });
}

export async function GET() {
  // Estado de fontes habilitadas por configuração de ambiente.
  return NextResponse.json({
    data: {
      reconfiguredInstructions:
        "POST nesta rota dispara a ingestão. Fontes ativas dependem de variáveis de ambiente.",
      sources: {
        remotive: process.env.REMOTIVE_ENABLED !== "false",
        jsearch: Boolean(process.env.JSEARCH_API_KEY),
        adzuna: Boolean(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY),
      },
      cron: Boolean(process.env.CRON_SECRET),
      cronEndpoint: "/api/cron/jobs-ingest",
    },
  });
}