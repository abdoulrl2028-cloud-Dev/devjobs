import Stripe from "stripe";
import { PLANS, type Plan } from "./types";
import {
  createPayment,
  createSubscription,
  findPendingPayment,
  setPaymentStatus,
} from "./db/company";
import { setJobStatus, updateJob } from "./db/jobs";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!stripeClient) {
    stripeClient = new Stripe(key, { apiVersion: "2026-08-26.dahlia" });
  }
  return stripeClient;
}

export function planPrice(plan: Plan): number {
  return PLANS.find((p) => p.id === plan)?.price ?? 0;
}

export function planLabel(plan: Plan): string {
  return PLANS.find((p) => p.id === plan)?.name ?? plan;
}

export function mockPaymentsEnabled(): boolean {
  return (
    process.env.MOCK_PAYMENTS === "true" || !process.env.STRIPE_SECRET_KEY
  );
}

export type CheckoutResult = {
  mode: "stripe" | "mock";
  checkoutUrl: string | null;
  plan: Plan;
  amount: number;
};

export async function createCheckoutSession(data: {
  companyId: string;
  jobId: string;
  plan: Plan;
  origin: string;
}): Promise<CheckoutResult> {
  const amount = planPrice(data.plan);
  const successUrl = `${data.origin}/pagamento/sucesso`;
  const cancelUrl = `${data.origin}/pagamento/cancelado`;

  if (mockPaymentsEnabled()) {
    return {
      mode: "mock",
      checkoutUrl: null,
      plan: data.plan,
      amount,
    };
  }

  const stripe = getStripe()!;
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "brl",
          product_data: { name: `Plano ${planLabel(data.plan)} — DevJobs` },
          unit_amount: amount * 100,
        },
        quantity: 1,
      },
    ],
    metadata: { companyId: data.companyId, jobId: data.jobId, plan: data.plan },
    success_url: successUrl + "?session_id={CHECKOUT_SESSION_ID}",
    cancel_url: cancelUrl,
  });

  return { mode: "stripe", checkoutUrl: session.url, plan: data.plan, amount };
}

// Finaliza o pedido após o pagamento ser confirmado (webhook ou modo mock).
export async function finalizePaidPlan(data: {
  companyId: string;
  plan: Plan;
  jobId: string;
  stripePaymentId?: string | null;
}): Promise<void> {
  // Valida que existe um pagamento pendente real ligado a esta vaga/empresa,
  // evitando que um cliente ative vaga sem pagar.
  const pending = await findPendingPayment(data.companyId, data.jobId, data.plan);
  if (!pending) {
    throw new Error("PAGAMENTO_NAO_ENCONTRADO");
  }

  // Vaga entra no ar e ganha o destaque conforme o plano.
  await setJobStatus(data.jobId, "active");
  const features: Record<Plan, { featured: boolean }> = {
    free: { featured: false },
    destaque: { featured: true },
    pro: { featured: true },
    empresa: { featured: true },
  };
  await updateJob(data.jobId, features[data.plan] ?? { featured: false });

  await createSubscription({
    companyId: data.companyId,
    plan: data.plan,
    durationDays: 30,
  });

  await setPaymentStatus(pending.id, "paid");
  if (data.stripePaymentId) {
    const { execute } = await import("./db/conn");
    await execute("UPDATE payments SET stripe_payment_id = ? WHERE id = ?", [
      data.stripePaymentId,
      pending.id,
    ]);
  }
}

export async function startOrder(data: {
  companyId: string;
  plan: Plan;
  jobId: string;
  origin: string;
}): Promise<CheckoutResult & { paymentPending: boolean }> {
  const { plan, companyId, jobId, origin } = data;

  // Plano gratuito: vaga publicada diretamente, sem cobrança.
  if (plan === "free") {
    await setJobStatus(jobId, "active");
    await updateJob(jobId, { featured: false, sponsored: false });
    await createPayment({
      companyId,
      jobId,
      plan: "free",
      amount: 0,
      status: "paid",
    });
    return { mode: "mock", checkoutUrl: null, plan, amount: 0, paymentPending: false };
  }

  // Planos pagos: cria pendência e segue para checkout.
  await createPayment({
    companyId,
    jobId,
    plan,
    amount: planPrice(plan),
    status: "pending",
  });

  const checkout = await createCheckoutSession({ companyId, jobId, plan, origin });
  return { ...checkout, paymentPending: true };
}