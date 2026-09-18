import { NextRequest, NextResponse } from "next/server";
import { readSessionUserFromRequest } from "@/lib/auth";
import { ensureDatabaseReady } from "@/lib/db/init";
import {
  createResume,
  createResumeAnalysis,
  setResumeFile,
} from "@/lib/db/premium";
import { extractResumeFromText } from "@/lib/cv";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const session = readSessionUserFromRequest(request);
  if (!session || session.role !== "candidate") {
    return NextResponse.json({ error: "Acesso restrito." }, { status: 401 });
  }
  await ensureDatabaseReady();

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Envie um arquivo de currículo." }, { status: 400 });
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "O currículo deve ser um arquivo PDF." }, { status: 400 });
  }
  if (file.size <= 0) {
    return NextResponse.json({ error: "O arquivo está vazio." }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "O arquivo deve ter até 5 MB." }, { status: 413 });
  }

  const filename = (file.name || "curriculo.pdf").slice(0, 120);
  const bytes = new Uint8Array(await file.arrayBuffer());

  let rawText = "";
  try {
    const { default: pdfParse } = await import("pdf-parse/lib/pdf-parse.js");
    const parsed = await pdfParse(bytes as never);
    rawText = String(parsed?.text ?? "").trim();
  } catch {
    return NextResponse.json(
      { error: "Não foi possível ler o PDF. Envie um documento válido." },
      { status: 400 }
    );
  }
  if (!rawText) {
    return NextResponse.json(
      { error: "Nenhum texto foi extraído do PDF. Verifique se o documento não é uma imagem." },
      { status: 400 }
    );
  }

  const extraction = extractResumeFromText(rawText);
  const title = extraction.data.fullName
    ? `Currículo de ${extraction.data.fullName}`
    : filename.replace(/\.pdf$/i, "");

  const created = await createResume(session.id, title, extraction.data);
  await setResumeFile(created.id, session.id, {
    filename,
    mime: file.type,
    size: file.size,
    data: Buffer.from(bytes).toString("base64"),
  });
  await createResumeAnalysis({
    userId: session.id,
    resumeId: created.id,
    filename,
    mime: file.type,
    size: file.size,
    rawText: rawText.slice(0, 12000),
    extracted: { ...extraction.data, completeness: extraction.completeness },
    score: null,
  });

  insertResumeEvent(session.id, created.id);

  return NextResponse.json({
    data: {
      item: created,
      analysis: { completeness: extraction.completeness },
      message:
        extraction.data.fullName || extraction.data.email
          ? "Currículo importado. Revise os dados extraídos antes de se candidatar."
          : "Currículo importado, mas poucos dados foram reconhecidos. Preencha as informações manualmente.",
    },
  }, { status: 201 });
}

function insertResumeEvent(userId: string, resumeId: string): void {
  void (async () => {
    try {
      const { insertRealtimeEvent } = await import("@/lib/db/events");
      await insertRealtimeEvent(
        userId,
        "resume.created",
        { count: 1, ids: [resumeId], at: new Date().toISOString() }
      );
    } catch {
      // Realtime é best-effort.
    }
  })();
}