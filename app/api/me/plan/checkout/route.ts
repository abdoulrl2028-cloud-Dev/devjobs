import { NextRequest, NextResponse } from "next/server";
import { requireCandidate } from "@/lib/context";
import { ensureDatabaseReady } from "@/lib/db/init";
import { getCandidateTier } from "@/lib/db/premium";
import { startCandidateOrder, type CandidateCadence } from "@/lib/payments-candidate";
import { assertSameOrigin } from "@/lib/auth";
import { CANDIDATE_PLANS, type CandidateTier } from "@/lib/types";

export const dynamic = "force-dynamic";

// Inicia o checkout do plano do candidato (Premium/Pro).
export async function POST(request: NextRequest) {
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;

  let session;
  try {
    session = await requireCandidate();
  } catch {
    return NextResponse.json({ error: "Acesso restrito a candidatos" }, { status: 403 });
  }

  await ensureDatabaseReady();

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 });
  }

  const tier =
    typeof body.tier === "string" && CANDIDATE_PLANS.some((p) => p.id === body.tier)
      ? (body.tier as CandidateTier)
      : null;
  const cadence: CandidateCadence = body.cadence === "annual" ? "annual" : "monthly";

  if (!tier || tier === "free") {
    return NextResponse.json({ error: "Plano inválido" }, { status: 400 });
  }

  const currentTier = await getCandidateTier(session.user.id);
  if (currentTier === tier) {
    return NextResponse.json({
      error: `Você já está no plano ${CANDIDATE_PLANS.find((p) => p.id === tier)?.name}.`,
      data: { tier: currentTier },
    });
  }

  const origin = request.headers.get("origin") ?? request.nextUrl.origin;
  const checkout = await startCandidateOrder({
    userId: session.user.id,
    tier,
    cadence,
    origin,
  });

  return NextResponse.json({ data: checkout });
}