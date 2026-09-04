import { NextRequest, NextResponse } from "next/server";
import { requireCompany } from "@/lib/context";
import { ensureDatabaseReady } from "@/lib/db/init";
import { getJobById } from "@/lib/db/jobs";
import { finalizePaidPlan } from "@/lib/payments";
import { PLANS, type Plan } from "@/lib/types";
import Stripe from "stripe";
import { getStripe } from "@/lib/payments";

export const dynamic = "force-dynamic";

/*
 * Confirmação de pagamento.
 * - Modo mock: chamado pela página /pagamento/sucesso após checkout simulado.
 * - Modo Stripe: chamado pela página de sucesso com session_id; validamos o
 *   status do checkout com a Stripe antes de liberar a vaga.
 */
export async function POST(request: NextRequest) {
  let rich;
  try {
    rich = await requireCompany();
  } catch {
    return NextResponse.json({ error: "Acesso restrito a empresas" }, { status: 403 });
  }
  const { company } = rich;

  await ensureDatabaseReady();

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 });
  }

  const jobId = typeof body.jobId === "string" ? body.jobId : null;
  const plan = typeof body.plan === "string" && PLANS.some((p) => p.id === body.plan) ? (body.plan as Plan) : null;
  const sessionId = typeof body.session_id === "string" ? body.session_id : null;

  if (!jobId || !plan || plan === "free") {
    return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
  }

  const job = await getJobById(jobId);
  if (!job || job.companyId !== company.id) {
    return NextResponse.json({ error: "Vaga não encontrada" }, { status: 404 });
  }
  if (job.status === "active") {
    return NextResponse.json({ data: { ok: true, message: "Vaga já publicada!" } });
  }

  // Modo Stripe: verifica junto à Stripe que o checkout foi de fato pago.
  if (sessionId) {
    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json(
        { error: "Pagamento via Stripe não configurado. Use o modo de teste." },
        { status: 400 }
      );
    }
    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId);
    } catch {
      return NextResponse.json({ error: "Sessão de pagamento inválida" }, { status: 400 });
    }
    if (session.payment_status !== "paid") {
      return NextResponse.json({ error: "Pagamento não confirmado" }, { status: 402 });
    }
  }

  try {
    await finalizePaidPlan({
      companyId: company.id,
      plan,
      jobId,
      stripePaymentId: sessionId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ERRO";
    if (message === "PAGAMENTO_NAO_ENCONTRADO") {
      return NextResponse.json(
        { error: "Nenhuma ordem de pagamento pendente para esta vaga." },
        { status: 404 }
      );
    }
    throw error;
  }

  return NextResponse.json({ data: { ok: true, message: "Vaga publicada com sucesso!" } });
}