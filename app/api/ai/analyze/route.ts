import { NextRequest, NextResponse } from "next/server";
import { readSessionUserFromRequest } from "@/lib/auth";
import { ensureDatabaseReady } from "@/lib/db/init";
import { getJobById, getFavoriteJobs } from "@/lib/db/jobs";
import { getProfileByUserId } from "@/lib/db/candidates";
import {
  getCandidateTier,
  countAiAnalysesThisMonth,
  recordAiAnalysis,
} from "@/lib/db/premium";
import { analyzeCompatibility } from "@/lib/ai";
import { CANDIDATE_PLANS } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const session = readSessionUserFromRequest(request);
  if (!session || session.role !== "candidate") {
    return NextResponse.json({ error: "Acesso restrito." }, { status: 401 });
  }
  await ensureDatabaseReady();

  const body = (await request.json().catch(() => ({}))) as { jobId?: string };
  if (!body.jobId) {
    return NextResponse.json({ error: "jobId é obrigatório." }, { status: 400 });
  }

  const job = await getJobById(body.jobId);
  if (!job) {
    return NextResponse.json({ error: "Vaga não encontrada." }, { status: 404 });
  }

  const profile = (await getProfileByUserId(session.id)) ?? null;
  const tier = await getCandidateTier(session.id);
  const plan = CANDIDATE_PLANS.find((p) => p.id === tier);
  const limit = plan?.aiAnalysesPerMonth ?? null;

  if (limit !== null) {
    const used = await countAiAnalysesThisMonth(session.id);
    if (used >= limit) {
      return NextResponse.json(
        {
          error: `Você já usou sua cota de ${limit} análises de IA neste mês no plano ${plan?.name ?? "Grátis"}.`,
          data: { limit, used, tier },
        },
        { status: 429 }
      );
    }
  }

  const analysis = analyzeCompatibility(profile, job);
  await recordAiAnalysis(session.id, job.id, analysis.score);

  return NextResponse.json({
    data: {
      analysis,
      job,
      usage: { limit, used: (await countAiAnalysesThisMonth(session.id)) },
    },
  });
}