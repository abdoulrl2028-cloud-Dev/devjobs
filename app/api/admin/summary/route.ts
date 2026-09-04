import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/context";
import { ensureDatabaseReady } from "@/lib/db/init";
import {
  countJobsByStatus,
  countFlagged,
  countJobsByPlan,
} from "@/lib/db/jobs";
import {
  countUsersByRole,
  listUsers,
} from "@/lib/db/users";
import { countActiveSubscriptions, countPaidPayments, sumPaidPayments } from "@/lib/db/company";
import { countCandidateProfiles } from "@/lib/db/candidates";
import { countViewsLastDays } from "@/lib/db/activity";
import type { Plan } from "@/lib/types";

export const dynamic = "force-dynamic";

const MONTH_MS = 30 * 86400000;

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Acesso restrito ao admin" }, { status: 403 });
  }

  await ensureDatabaseReady();

  const now = new Date();
  const monthAgo = new Date(now.getTime() - MONTH_MS).toISOString();

  const [totalRevenue, monthlyRevenue, totalPaid, companiesCount, companiesActiveSubscriptions, candidatesCount, candidatesProfiles, activeJobs, pendingJobs, pausedJobs, featured, sponsored, freeJobs, destaqueJobs, proJobs, empresasJobs, views30d] =
    await Promise.all([
      sumPaidPayments(),
      sumPaidPayments(monthAgo),
      countPaidPayments(),
      countUsersByRole("company"),
      countActiveSubscriptions(), // assinaturas ativas (todas as empresas)
      countUsersByRole("candidate"),
      countCandidateProfiles(),
      countJobsByStatus("active"),
      countJobsByStatus("pending"),
      countJobsByStatus("paused"),
      countFlagged("featured"),
      countFlagged("sponsored"),
      countJobsByPlan("free"),
      countJobsByPlan("destaque"),
      countJobsByPlan("pro"),
      countJobsByPlan("empresa"),
      countViewsLastDays(30),
    ]);

  const plans: Record<Plan, number> = {
    free: freeJobs,
    destaque: destaqueJobs,
    pro: proJobs,
    empresa: empresasJobs,
  };

  const users = (await listUsers()).slice(0, 300);

  const response = NextResponse.json({
    data: {
      revenue: {
        total: totalRevenue,
        monthly: monthlyRevenue,
        paymentsCount: totalPaid,
      },
      counts: {
        companies: companiesCount,
        candidates: candidatesCount,
        candidatesWithProfile: candidatesProfiles,
        subscriptionsActive: companiesActiveSubscriptions,
        jobsActive: activeJobs,
        jobsPending: pendingJobs,
        jobsPaused: pausedJobs,
        featured,
        sponsored,
        plans,
        views30d,
      },
      users: users.map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role })),
    },
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}