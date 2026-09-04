import { NextResponse } from "next/server";
import { requireCompany } from "@/lib/context";
import { ensureDatabaseReady } from "@/lib/db/init";
import { getCompanyJobs } from "@/lib/db/jobs";
import { countApplicationsForCompany, countApplicationsForJob } from "@/lib/db/activity";
import { countActiveSubscriptions, listPayments, sumPaidPaymentsForCompany } from "@/lib/db/company";

export const dynamic = "force-dynamic";

export async function GET() {
  let rich;
  try {
    rich = await requireCompany();
  } catch {
    return NextResponse.json({ error: "Acesso restrito a empresas" }, { status: 403 });
  }
  const { company, plan } = rich;

  await ensureDatabaseReady();

  const jobs = await getCompanyJobs(company.id);
  const activeJobs = jobs.filter((j) => j.status === "active").length;
  const pausedJobs = jobs.filter((j) => j.status === "paused").length;
  const pendingJobs = jobs.filter((j) => j.status === "pending").length;
  const totalApplications = await countApplicationsForCompany(company.id);
  const views = jobs.reduce((acc, j) => acc + j.views, 0);
  const clicks = jobs.reduce((acc, j) => acc + j.clicks, 0);
  const applicationsByJob = (
    await Promise.all(
      jobs.map(async (j) => ({
        id: j.id,
        title: j.title,
        applications: await countApplicationsForJob(j.id),
      }))
    )
  ).filter((j) => j.applications > 0);

  const activeSubscription = await countActiveSubscriptions(company.id);
  const payments = await listPayments(company.id);
  const totalPaid = await sumPaidPaymentsForCompany(company.id);

  const response = NextResponse.json({
    data: {
      company: { id: company.id, name: company.name, logoColor: company.logoColor },
      plan,
      stats: {
        totalJobs: jobs.length,
        activeJobs,
        pausedJobs,
        pendingJobs,
        totalApplications,
        views,
        clicks,
        applicationsByJob: applicationsByJob.slice(0, 5),
        hasActiveSubscription: activeSubscription > 0,
        totalPaid,
        payments: payments.slice(0, 10),
      },
      jobs: jobs.map((j) => ({
        ...j,
        statusLabel:
          j.status === "active" ? "Ativa" : j.status === "paused" ? "Pausada" : j.status === "pending" ? "Aguardando pagamento" : "Expirada",
      })),
    },
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}