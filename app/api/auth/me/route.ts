import { NextRequest, NextResponse } from "next/server";
import { readSessionUserFromRequest } from "@/lib/auth";
import { ensureDatabaseReady } from "@/lib/db/init";
import { getCompanyByUserId, getEffectivePlan } from "@/lib/db/company";
import { getProfileByUserId } from "@/lib/db/candidates";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = readSessionUserFromRequest(request);
  if (!session) {
    const response = NextResponse.json({ data: { user: null } });
    response.headers.set("Cache-Control", "no-store");
    return response;
  }

  await ensureDatabaseReady();

  let company = null;
  let plan = null;
  let profile = null;

  if (session.role === "company") {
    company = await getCompanyByUserId(session.id);
    if (company) plan = await getEffectivePlan(company.id);
  } else if (session.role === "candidate") {
    profile = (await getProfileByUserId(session.id)) ?? null;
  }

  const response = NextResponse.json({
    data: {
      user: session,
      company,
      plan,
      profile,
    },
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}