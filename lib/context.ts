import { cookies } from "next/headers";
import { verifySessionToken, type SessionUser } from "./crypto";
import { getCompanyByUserId, getEffectivePlan } from "./db/company";
import { getProfileByUserId } from "./db/candidates";
import type { Company, Plan, CandidateProfile } from "./types";

export type RichSession = SessionUser & {
  company?: Company | null;
  plan?: Plan;
  profile?: CandidateProfile | null;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get("devjobs_session")?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function getRichSession(): Promise<RichSession | null> {
  const user = await getSessionUser();
  if (!user) return null;

  const rich: RichSession = { ...user };

  if (user.role === "candidate") {
    rich.profile = (await getProfileByUserId(user.id)) ?? null;
  }
  if (user.role === "company") {
    const company = (await getCompanyByUserId(user.id)) ?? null;
    rich.company = company;
    if (company) {
      rich.plan = await getEffectivePlan(company.id);
    }
  }
  return rich;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}

export async function requireCompany(): Promise<{ user: SessionUser; company: Company; plan: Plan }> {
  const user = await getSessionUser();
  if (!user || user.role !== "company") {
    throw new Error("UNAUTHORIZED");
  }
  const company = await getCompanyByUserId(user.id);
  if (!company) {
    throw new Error("NO_COMPANY");
  }
  const plan = await getEffectivePlan(company.id);
  return { user, company, plan };
}

export async function requireCandidate(): Promise<{ user: SessionUser; profile: CandidateProfile | null }> {
  const user = await getSessionUser();
  if (!user || user.role !== "candidate") {
    throw new Error("UNAUTHORIZED");
  }
  const profile = (await getProfileByUserId(user.id)) ?? null;
  return { user, profile };
}