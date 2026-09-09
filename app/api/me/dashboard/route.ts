import { NextRequest, NextResponse } from "next/server";
import { readSessionUserFromRequest } from "@/lib/auth";
import { ensureDatabaseReady } from "@/lib/db/init";
import { getProfileByUserId } from "@/lib/db/candidates";
import { getFavoriteJobs } from "@/lib/db/jobs";
import { searchJobs } from "@/lib/db/jobs";
import { listApplicationsForCandidateFull, getCandidateTier, findActiveCandidateSubscription } from "@/lib/db/premium";
import { analyzeCompatibility } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = readSessionUserFromRequest(request);
  if (!session || session.role !== "candidate") {
    return NextResponse.json({ error: "Acesso restrito." }, { status: 401 });
  }
  await ensureDatabaseReady();

  const profile = (await getProfileByUserId(session.id)) ?? null;
  const [applications, favorites, recommended, tier, subscription] = await Promise.all([
    listApplicationsForCandidateFull(session.id),
    getFavoriteJobs(session.id),
    searchJobs({ q: null, location: null, type: null, remote: null, include: ["active"] }),
    getCandidateTier(session.id),
    findActiveCandidateSubscription(session.id),
  ]);

  const byStage = (stage: string) =>
    applications.filter((a) => (a.stage ?? "applied") === stage).length;

  const appsLast7 = new Array(7).fill(0).map((_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86400000);
    const key = d.toISOString().slice(0, 10);
    const count = applications.filter((a) => a.appliedAt.slice(0, 10) === key).length;
    return { date: d.getDate(), count };
  });

  const scored = recommended
    .map((job) => {
      const analysis = analyzeCompatibility(profile, job);
      return { job, score: analysis.score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  const profileFields: Record<string, boolean> = {
    fullName: Boolean(profile?.fullName && profile?.fullName.length > 2),
    headline: Boolean(profile?.headline && profile?.headline.length > 2),
    summary: Boolean(profile?.summary?.trim()),
    skills: (profile?.skills?.length ?? 0) >= 3,
    experience: Boolean(profile?.experience),
    location: Boolean(profile?.location?.trim()),
    availableRemote: profile != null,
    githubUrl: Boolean(profile?.githubUrl),
    linkedinUrl: Boolean(profile?.linkedinUrl),
  };
  const filled = Object.values(profileFields).filter(Boolean).length;
  const completeness = Math.min(100, Math.round((filled / Object.keys(profileFields).length) * 100));

  const data = {
    profile,
    plan: tier,
    subscription:
      subscription && subscription.expiresAt && new Date(subscription.expiresAt).getTime() > Date.now()
        ? {
            tier: subscription.tier,
            cadence: subscription.cadence,
            expiresAt: subscription.expiresAt,
          }
        : null,
    stats: {
      applications: applications.length,
      favorites: favorites.length,
      interviewsTaken: 0,
      offers: byStage("offer") + byStage("hired"),
      applied: byStage("applied"),
      test: byStage("test"),
      interview: byStage("interview"),
      rejected: byStage("rejected"),
      profileCompleteness: completeness,
    },
    appsLast7,
    recommended: scored,
    latestApplications: applications.slice(0, 5),
  };

  return NextResponse.json({ data });
}