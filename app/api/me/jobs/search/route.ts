import { NextRequest, NextResponse } from "next/server";
import { readSessionUserFromRequest } from "@/lib/auth";
import { ensureDatabaseReady } from "@/lib/db/init";
import { searchJobs, type JobFilter } from "@/lib/db/jobs";
import { getProfileByUserId } from "@/lib/db/candidates";
import { parseSmartQuery, filterJobsByParsed, analyzeCompatibility } from "@/lib/ai";
import { getCandidateTier } from "@/lib/db/premium";
import type { Job } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = readSessionUserFromRequest(request);
  if (!session || session.role !== "candidate") {
    return NextResponse.json({ error: "Acesso restrito." }, { status: 401 });
  }
  await ensureDatabaseReady();

  const q = request.nextUrl.searchParams.get("q")?.trim().slice(0, 120) ?? "";
  const location = request.nextUrl.searchParams.get("location")?.trim().slice(0, 60) ?? "";
  const type = request.nextUrl.searchParams.get("type") ?? "";
  const remote = request.nextUrl.searchParams.get("remote") ?? "";

  // 1. Consulta base no banco (somente vagas ativas).
  const filter: JobFilter = {};
  if (location) filter.location = location;
  if (type) filter.type = type;
  if (remote === "true") filter.remote = "true";
  if (remote === "false") filter.remote = "false";
  const jobs = await searchJobs(filter);

  // 2. Busca inteligente: interpreta o texto livre (remoto, salário, cidade, tags).
  let ranked: { job: Job; score: number; match: boolean; why: string[] }[] = [];
  const profile = await getProfileByUserId(session.id);
  const tier = await getCandidateTier(session.id);

  const parsed = parseSmartQuery(q);
  const base = q ? filterJobsByParsed(jobs, parsed) : jobs;

  ranked = base
    .filter((job) => job.status === "active")
    .map((job) => {
      const analysis = profile ? analyzeCompatibility(profile, job) : null;
      let score = analysis?.score ?? 50;
      if (parsed.salaryMin !== null && job.salary) {
        if (job.salary.max < parsed.salaryMin) score -= 18;
        else if (job.salary.min > parsed.salaryMin) score -= 8;
        else score += 6;
      }
      if (parsed.remote === true && !job.remote) score -= 25;
      if (parsed.remote === false && job.remote) score -= 12;
      if (parsed.locations.length > 0 && !parsed.locations.some((l) => job.location.toLowerCase().includes(l))) score -= 10;
      score = Math.max(5, Math.min(98, score));
      const why: string[] = [];
      if (analysis && analysis.score >= 60) why.push("Alta compatibilidade com seu perfil");
      else if (analysis && analysis.score >= 40) why.push("Compatibilidade média com seu perfil");
      if (parsed.salaryMin !== null && job.salary && job.salary.max >= parsed.salaryMin) why.push("Atinge o piso salarial informado");
      return { job, score, match: score >= 60, why };
    })
    .sort((a, b) => b.score - a.score);

  const msg = !q
    ? null
    : parsed.terms.length === 0 && parsed.tags.length === 0 && parsed.locations.length === 0 &&
      parsed.salaryMin === null && parsed.salaryMax === null && parsed.remote === null
      ? `Nenhum filtro reconhecido em "${q}". Mostrando vagas por compatibilidade.`
      : null;

  return NextResponse.json({
    data: {
      items: ranked,
      parsed: {
        terms: parsed.terms,
        locations: parsed.locations,
        remote: parsed.remote,
        types: parsed.types,
        salaryMin: parsed.salaryMin,
        salaryMax: parsed.salaryMax,
        tags: parsed.tags.slice(0, 8),
      },
      profile,
      plan: tier,
      message: msg,
    },
  });
}