import { NextRequest, NextResponse } from "next/server";
import { requireCompany } from "@/lib/context";
import { ensureDatabaseReady } from "@/lib/db/init";
import { getJobById } from "@/lib/db/jobs";
import { getApplicationById } from "@/lib/db/activity";
import { getConsent } from "@/lib/db/consents";
import { getResume, getResumeFile } from "@/lib/db/premium";

export const dynamic = "force-dynamic";

const MIME: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
  txt: "text/plain",
};

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string; appId: string }> }) {
  const { id, appId } = await params;
  let rich;
  try {
    rich = await requireCompany();
  } catch {
    return NextResponse.json({ error: "Acesso restrito a empresas" }, { status: 403 });
  }
  await ensureDatabaseReady();

  const job = await getJobById(id);
  if (!job || job.companyId !== rich.company.id) {
    return NextResponse.json({ error: "Vaga não encontrada" }, { status: 404 });
  }
  const application = await getApplicationById(appId);
  if (!application || application.jobId !== job.id) {
    return NextResponse.json({ error: "Candidatura não encontrada" }, { status: 404 });
  }

  const consent = await getConsent(application.candidateId, "share_to_company", rich.company.id);
  if (!consent?.granted) {
    return NextResponse.json(
      { error: "O candidato ainda não autorizou o compartilhamento do currículo." },
      { status: 403 }
    );
  }
  if (!application.resumeId) {
    return NextResponse.json({ error: "Esse candidato não anexou currículo PDF." }, { status: 404 });
  }

  const resume = await getResume(application.resumeId, application.candidateId);
  const fileData = await getResumeFile(application.resumeId, application.candidateId);
  if (!resume || !fileData) {
    return NextResponse.json({ error: "Arquivo não encontrado." }, { status: 404 });
  }

  const filename = resume.filename ?? `curriculo-${application.candidateId}.pdf`;
  const ext = filename.split(".").pop()?.toLowerCase() ?? "pdf";
  const mime = MIME[ext] ?? fileData.mime;

  const buffer = Buffer.from(fileData.data, "base64");
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": mime,
      "Content-Disposition": `attachment; filename="${filename.replace(/["\\]/g, "_")}"`,
      "Content-Length": String(buffer.length),
      "Cache-Control": "private, no-store",
    },
  });
}