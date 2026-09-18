import { notFound } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";
import { readSessionUserFromRequest } from "@/lib/auth";
import { ensureDatabaseReady } from "@/lib/db/init";
import { getResumeFile } from "@/lib/db/premium";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Download do PDF do currículo (só o(a) dono(a) — empresas acessam via aplicação).
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = readSessionUserFromRequest(request);
  if (!session || session.role !== "candidate") {
    return NextResponse.json({ error: "Acesso restrito." }, { status: 401 });
  }
  const { id } = await params;
  await ensureDatabaseReady();

  const file = await getResumeFile(id, session.id);
  if (!file) notFound();

  const response = new NextResponse(Buffer.from(file.data, "base64"), {
    headers: {
      "Content-Type": file.mime || "application/pdf",
      "Content-Disposition": `attachment; filename="${file.filename.replace(/["\\]/g, "")}"`,
      "Content-Length": String(file.size),
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
  return response;
}