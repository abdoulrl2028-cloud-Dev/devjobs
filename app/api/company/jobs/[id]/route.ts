import { NextRequest, NextResponse } from "next/server";
import { requireCompany } from "@/lib/context";
import { ensureDatabaseReady } from "@/lib/db/init";
import { deleteJob, getJobById, setJobStatus, updateJob } from "@/lib/db/jobs";
import { execute } from "@/lib/db/conn";
import { countApplicationsForJob } from "@/lib/db/activity";

export const dynamic = "force-dynamic";

function ownedOr403(companyId: string, jobCompanyId: string) {
  return jobCompanyId !== companyId;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let rich;
  try {
    rich = await requireCompany();
  } catch {
    return NextResponse.json({ error: "Acesso restrito a empresas" }, { status: 403 });
  }

  await ensureDatabaseReady();
  const job = await getJobById((await params).id);
  if (!job || ownedOr403(rich.company.id, job.companyId)) {
    return NextResponse.json({ error: "Vaga não encontrada" }, { status: 404 });
  }

  const applications = await countApplicationsForJob(job.id);
  const response = NextResponse.json({
    data: { ...job, applications },
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let rich;
  try {
    rich = await requireCompany();
  } catch {
    return NextResponse.json({ error: "Acesso restrito a empresas" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 });
  }

  await ensureDatabaseReady();
  const jobId = (await params).id;
  const job = await getJobById(jobId);
  if (!job || ownedOr403(rich.company.id, job.companyId)) {
    return NextResponse.json({ error: "Vaga não encontrada" }, { status: 404 });
  }

  const action = typeof body.action === "string" ? body.action : null;

  if (action === "pause") {
    await setJobStatus(jobId, "paused");
    return NextResponse.json({ data: { ok: true, message: "Vaga pausada." } });
  }

  if (action === "activate" || action === "renovar") {
    await setJobStatus(jobId, "active");
    if (action === "renovar") {
      const durationDays = job.plan === "free" ? 15 : 30;
      const expiresAt = new Date(Date.now() + durationDays * 86400000).toISOString();
      await execute("UPDATE jobs SET expires_at = ? WHERE id = ?", [expiresAt, jobId]);
    }
    return NextResponse.json({
      data: { ok: true, message: action === "renovar" ? "Vaga renovada com sucesso." : "Vaga reativada." },
    });
  }

  // Edição de campos no dashboard.
  if (action === "edit") {
    const patch: {
      title?: string;
      description?: string;
      location?: string;
      remote?: boolean;
      type?: string;
      salaryMin?: number | null;
      salaryMax?: number | null;
      tags?: string[];
      contactEmail?: string;
      applyUrl?: string;
      responsibilities?: string[];
      requirements?: string[];
      benefits?: string[];
    } = {};

    if (typeof body.title === "string" && body.title.trim().length >= 5) patch.title = body.title.trim().slice(0, 120);
    if (typeof body.description === "string") patch.description = body.description.slice(0, 4000);
    if (typeof body.location === "string") patch.location = body.location.trim().slice(0, 120);
    if (typeof body.remote === "boolean") patch.remote = body.remote;
    if (typeof body.type === "string") patch.type = body.type;
    if (typeof body.salaryMin === "number") patch.salaryMin = body.salaryMin;
    if (typeof body.salaryMax === "number") patch.salaryMax = body.salaryMax;
    if (typeof body.contactEmail === "string") patch.contactEmail = body.contactEmail.trim().slice(0, 160);
    if (typeof body.applyUrl === "string") patch.applyUrl = body.applyUrl.trim().slice(0, 300);
    if (Array.isArray(body.tags)) patch.tags = (body.tags as string[]).filter((t) => typeof t === "string").slice(0, 20);
    if (Array.isArray(body.responsibilities)) patch.responsibilities = (body.responsibilities as string[]).slice(0, 10);
    if (Array.isArray(body.requirements)) patch.requirements = (body.requirements as string[]).slice(0, 10);
    if (Array.isArray(body.benefits)) patch.benefits = (body.benefits as string[]).slice(0, 10);

    if (Object.keys(patch).length > 0) {
      await updateJob(jobId, patch);
    }
    return NextResponse.json({ data: { ok: true, message: "Vaga atualizada." } });
  }

  return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let rich;
  try {
    rich = await requireCompany();
  } catch {
    return NextResponse.json({ error: "Acesso restrito a empresas" }, { status: 403 });
  }

  await ensureDatabaseReady();
  const jobId = (await params).id;
  const job = await getJobById(jobId);
  if (!job || ownedOr403(rich.company.id, job.companyId)) {
    return NextResponse.json({ error: "Vaga não encontrada" }, { status: 404 });
  }

  await deleteJob(jobId);
  return NextResponse.json({ data: { ok: true, message: "Vaga excluída." } });
}