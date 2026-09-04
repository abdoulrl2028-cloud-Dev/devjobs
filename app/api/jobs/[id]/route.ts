import { NextRequest, NextResponse } from "next/server";
import { getJobById } from "@/lib/db/jobs";
import { ensureDatabaseReady } from "@/lib/db/init";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  if (!id) {
    return NextResponse.json({ error: "Id da vaga é obrigatório" }, { status: 400 });
  }

  await ensureDatabaseReady();
  const job = await getJobById(id);
  if (!job) {
    return NextResponse.json({ error: "Vaga não encontrada" }, { status: 404 });
  }

  // O detalhe é registrado na página (server component), a API só devolve os dados.
  const response = NextResponse.json({ data: job });
  response.headers.set("Cache-Control", "no-store");
  return response;
}