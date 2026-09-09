import { NextRequest, NextResponse } from "next/server";
import { requireCandidate } from "@/lib/context";
import { ensureDatabaseReady } from "@/lib/db/init";
import { finalizeCandidatePaidPlan, type CandidateCadence } from "@/lib/payments-candidate";
import { mockPaymentsEnabled, getStripe } from "@/lib/payments";
import { assertSameOrigin } from "@/lib/auth";
import { CANDIDATE_PLANS, type CandidateTier } from "@/lib/types";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

// Confirmação de pagamento do plano do candidato.
// - Modo mock: chamado pela página /app/planos/confirmacao após checkout simulado.
// - Modo Stripe: chamado com session_id; validamos o status do checkout na Stripe.
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
  const sessionId = typeof body.session_id === "string" ? body.session_id : null;

  if (!tier || tier === "free") {
    return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
  }

  if (mockPaymentsEnabled()) {
    // Modo mock: ativa direto.
    try {
      await finalizeCandidatePaidPlan({
        userId: session.user.id,
        tier,
        cadence,
        mock: true,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "ERRO";
      if (message === "PAGAMENTO_NAO_ENCONTRADO") {
        return NextResponse.json(
          { error: "Nenhuma ordem de pagamento pendente para este plano." },
          { status: 404 }
        );
      }
      throw error;
    }
    return NextResponse.json({
      data: { ok: true, tier, message: `Plano ${CANDIDATE_PLANS.find((p) => p.id === tier)?.name} ativado!` },
    });
  }

  // Modo Stripe: exige session_id e valida o pagamento.
  if (!sessionId) {
    return NextResponse.json({ error: "session_id é obrigatório" }, { status: 400 });
  }
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "Pagamento via Stripe não configurado. Use o modo de teste." },
      { status: 400 }
    );
  }
  let checkoutSession;
  try {
    checkoutSession = (await stripe.checkout.sessions.retrieve(sessionId)) as Stripe.Checkout.Session;
  } catch {
    return NextResponse.json({ error: "Sessão de pagamento inválida" }, { status: 400 });
  }
  if (checkoutSession.payment_status !== "paid" || checkoutSession.metadata?.tier !== tier) {
    return NextResponse.json({ error: "Pagamento não confirmado" }, { status: 402 });
  }
  const sessionCadence: CandidateCadence = checkoutSession.metadata?.cadence === "annual" ? "annual" : "monthly";
  if (sessionCadence !== cadence) {
    return NextResponse.json({ error: "Cadência do pagamento não confere com o plano." }, { status: 402 });
  }

  try {
    await finalizeCandidatePaidPlan({
      userId: session.user.id,
      tier,
      cadence,
      mock: false,
      stripePaymentId: sessionId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ERRO";
    if (message === "PAGAMENTO_NAO_ENCONTRADO") {
      return NextResponse.json(
        { error: "Nenhuma ordem de pagamento pendente para este plano." },
        { status: 404 }
      );
    }
    throw error;
  }

  const period = cadence === "annual" ? "anual" : "mensal";
  return NextResponse.json({
    data: { ok: true, tier, cadence, message: `Plano ${CANDIDATE_PLANS.find((p) => p.id === tier)?.name} ${period} ativado!` },
  });
}