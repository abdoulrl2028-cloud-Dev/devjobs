import Stripe from "stripe";
import { CANDIDATE_PLANS, type CandidateTier } from "./types";
import {
  createPendingCandidateSubscription,
  activateCandidateSubscription,
  findPendingCandidateSubscription,
} from "./db/premium";
import { getStripe } from "./payments";

export function candidatePlanPrice(tier: CandidateTier): number {
  return CANDIDATE_PLANS.find((p) => p.id === tier)?.price ?? 0;
}

export function candidatePlanLabel(tier: CandidateTier): string {
  return CANDIDATE_PLANS.find((p) => p.id === tier)?.name ?? tier;
}

export function mockPaymentsEnabled(): boolean {
  return (
    process.env.MOCK_PAYMENTS === "true" || !process.env.STRIPE_SECRET_KEY
  );
}

export type CandidateCheckoutResult = {
  mode: "stripe" | "mock";
  checkoutUrl: string | null;
  tier: CandidateTier;
  amount: number;
};

// Cria a sessão de checkout (Stripe ou modo mock) para o plano do candidato.
export async function createCandidateCheckout(data: {
  userId: string;
  tier: CandidateTier;
  origin: string;
}): Promise<CandidateCheckoutResult> {
  const amount = candidatePlanPrice(data.tier);
  const successUrl = `${data.origin}/app/planos/confirmacao?status=sucesso`;
  const cancelUrl = `${data.origin}/app/planos/confirmacao?status=cancelado`;

  if (mockPaymentsEnabled()) {
    return { mode: "mock", checkoutUrl: null, tier: data.tier, amount };
  }

  const stripe = getStripe()!;
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "brl",
          product_data: { name: `Plano ${candidatePlanLabel(data.tier)} — DevJobs Candidatos` },
          unit_amount: amount * 100,
        },
        quantity: 1,
      },
    ],
    metadata: { userId: data.userId, tier: data.tier },
    success_url: successUrl + "&session_id={CHECKOUT_SESSION_ID}",
    cancel_url: cancelUrl,
  });

  return { mode: "stripe", checkoutUrl: session.url, tier: data.tier, amount };
}

// Inicia o pedido: cria a pendência e devolve o fluxo de checkout.
export async function startCandidateOrder(data: {
  userId: string;
  tier: CandidateTier;
  origin: string;
}): Promise<CandidateCheckoutResult> {
  const amount = candidatePlanPrice(data.tier);
  await createPendingCandidateSubscription(data.userId, data.tier, amount);
  return createCandidateCheckout(data);
}

// Finaliza após confirmação de pagamento (webhook Stripe ou modo mock).
export async function finalizeCandidatePaidPlan(data: {
  userId: string;
  tier: CandidateTier;
  mock: boolean;
  stripePaymentId?: string | null;
}): Promise<void> {
  const pending = await findPendingCandidateSubscription(data.userId, data.tier);
  if (!pending) {
    throw new Error("PAGAMENTO_NAO_ENCONTRADO");
  }
  await activateCandidateSubscription({
    userId: data.userId,
    tier: data.tier,
    mock: data.mock,
    stripePaymentId: data.stripePaymentId,
  });
}

export type StripeSession = Stripe.Checkout.Session;