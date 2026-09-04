import { NextRequest, NextResponse } from "next/server";
import { getStripe, finalizePaidPlan } from "@/lib/payments";
import { ensureDatabaseReady } from "@/lib/db/init";
import { getCompanyById } from "@/lib/db/company";
import type { Plan } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  if (!stripe || !WEBHOOK_SECRET) {
    // Sem Stripe configurada o fluxo usa modo mock; não há webhook a processar.
    return NextResponse.json({ received: true });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Assinatura ausente" }, { status: 400 });
  }

  const payload = await request.text();

  let event: ReturnType<typeof stripe.webhooks.constructEvent>;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 400 });
  }

  await ensureDatabaseReady();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const companyId = String(session.metadata?.companyId ?? "");
    const jobId = String(session.metadata?.jobId ?? "");
    const plan = String(session.metadata?.plan ?? "") as Plan;

    if (companyId && jobId && plan) {
      const company = await getCompanyById(companyId);
      if (company) {
        try {
          await finalizePaidPlan({
            companyId,
            plan,
            jobId,
            stripePaymentId: session.id,
          });
        } catch {
          // Pagamento de vaga que já foi confirmado via página de sucesso.
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}