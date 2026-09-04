import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/context";
import { ensureDatabaseReady } from "@/lib/db/init";
import { deleteJob, getJobById, setJobStatus, updateJob } from "@/lib/db/jobs";

export const dynamic = "force-dynamic";

/*
 * Ações de moderação do admin:
 * - approve/reject: aprovar ou recusar vaga.
 * - feature/unfeature, sponsor/unsponsor: destacar/patrocinar.
 * - edit: alterar campos arbitrários da vaga.
 * - delete: excluir.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Acesso restrito ao admin" }, { status: 403 });
  }

  await ensureDatabaseReady();
  const jobId = (await params).id;
  const job = await getJobById(jobId);
  if (!job) {
    return NextResponse.json({ error: "Vaga não encontrada" }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 });
  }

  const action = typeof body.action === "string" ? body.action : null;

  switch (action) {
    case "approve":
      await setJobStatus(jobId, "active");
      return NextResponse.json({ data: { ok: true, message: "Vaga aprovada e publicada." } });
    case "reject":
      await setJobStatus(jobId, "rejected");
      return NextResponse.json({ data: { ok: true, message: "Vaga recusada." } });
    case "pause":
      await setJobStatus(jobId, "paused");
      return NextResponse.json({ data: { ok: true, message: "Vaga pausada." } });
    case "feature":
      await updateJob(jobId, { featured: true });
      return NextResponse.json({ data: { ok: true, message: "Vaga destacada." } });
    case "unfeature":
      await updateJob(jobId, { featured: false });
      return NextResponse.json({ data: { ok: true, message: "Destaque removido." } });
    case "sponsor":
      await updateJob(jobId, { sponsored: true });
      return NextResponse.json({ data: { ok: true, message: "Vaga marcada como patrocinada." } });
    case "unsponsor":
      await updateJob(jobId, { sponsored: false });
      return NextResponse.json({ data: { ok: true, message: "Patrocínio removido." } });
    case "edit": {
      const patch: Record<string, unknown> = {};
      if (typeof body.title === "string") patch.title = body.title.slice(0, 120);
      if (typeof body.description === "string") patch.description = body.description.slice(0, 4000);
      if (typeof body.location === "string") patch.location = body.location.slice(0, 120);
      if (typeof body.remote === "boolean") patch.remote = body.remote;
      if (typeof body.type === "string") patch.type = body.type;
      if (typeof body.salaryMin === "number" || body.salaryMin === null) patch.salaryMin = body.salaryMin;
      if (typeof body.salaryMax === "number" || body.salaryMax === null) patch.salaryMax = body.salaryMax;
      if (Array.isArray(body.tags)) patch.tags = (body.tags as string[]).slice(0, 20);
      if (Object.keys(patch).length > 0) {
        await updateJob(jobId, patch as Parameters<typeof updateJob>[1]);
      }
      return NextResponse.json({ data: { ok: true, message: "Vaga atualizada." } });
    }
    case "delete":
      await deleteJob(jobId);
      return NextResponse.json({ data: { ok: true, message: "Vaga excluída." } });
    default:
      return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Acesso restrito ao admin" }, { status: 403 });
  }

  await ensureDatabaseReady();
  const jobId = (await params).id;
  const job = await getJobById(jobId);
  if (!job) {
    return NextResponse.json({ error: "Vaga não encontrada" }, { status: 404 });
  }

  await deleteJob(jobId);
  return NextResponse.json({ data: { ok: true, message: "Vaga excluída." } });
}