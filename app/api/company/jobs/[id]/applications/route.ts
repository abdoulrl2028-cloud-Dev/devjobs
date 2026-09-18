import { NextRequest, NextResponse } from "next/server";
import { requireCompany } from "@/lib/context";
import { ensureDatabaseReady } from "@/lib/db/init";
import { getJobById } from "@/lib/db/jobs";
import { listApplicationsForJobDetailed } from "@/lib/db/activity";
import { insertRealtimeEvent } from "@/lib/db/events";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
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

  const items = await listApplicationsForJobDetailed(job.id, rich.company.id);
  const response = NextResponse.json({ data: { job, items } });
  response.headers.set("Cache-Control", "no-store");
  return response;
}