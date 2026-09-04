import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/context";
import { ensureDatabaseReady } from "@/lib/db/init";
import { getAllJobs } from "@/lib/db/jobs";
import { countApplicationsForJob } from "@/lib/db/activity";

export const dynamic = "force-dynamic";

function planLabel(plan: string): string {
  switch (plan) {
    case "free":
      return "Grátis";
    case "destaque":
      return "Destaque";
    case "pro":
      return "Pro";
    case "empresa":
      return "Empresa";
    default:
      return plan;
  }
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Acesso restrito ao admin" }, { status: 403 });
  }

  await ensureDatabaseReady();

  const params = request.nextUrl.searchParams;
  const status = params.get("status")?.slice(0, 20) ?? null;
  const plan = params.get("plan")?.slice(0, 20) ?? null;
  const search = params.get("q")?.slice(0, 80).toLowerCase() ?? null;

  let jobs = await getAllJobs();

  if (status) jobs = jobs.filter((j) => j.status === status);
  if (plan) jobs = jobs.filter((j) => j.plan === plan);
  if (search) {
    jobs = jobs.filter(
      (j) => j.title.toLowerCase().includes(search) || j.company.toLowerCase().includes(search)
    );
  }

  const withApplications = await Promise.all(
    jobs.map(async (j) => ({
      ...j,
      applications: await countApplicationsForJob(j.id),
      planLabel: planLabel(j.plan),
    }))
  );

  const response = NextResponse.json({ data: withApplications });
  response.headers.set("Cache-Control", "no-store");
  return response;
}