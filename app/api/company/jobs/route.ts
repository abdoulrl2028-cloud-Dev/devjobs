import { NextRequest, NextResponse } from "next/server";
import { requireCompany } from "@/lib/context";
import { ensureDatabaseReady } from "@/lib/db/init";
import { updateCompany } from "@/lib/db/company";
import { canCompanyPostMore, createJob, type NewJobInput } from "@/lib/db/jobs";
import { startOrder } from "@/lib/payments";
import { findCouponByCode } from "@/lib/db/coupons";
import { PLANS, type JobType, type Plan } from "@/lib/types";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 65536;

const ALLOWED_TYPES = new Set<JobType>(["full-time", "part-time", "contract", "internship"]);
const ALLOWED_PLANS = new Set<string>(PLANS.map((p) => p.id));
const MAX_TEXT = 4000;

function clamp(s: unknown, max: number): string {
  if (typeof s !== "string") return "";
  return s.length > max ? s.slice(0, max) : s.trim();
}

function toInt(v: unknown, fallback: number | null): number | null {
  if (v === null || v === undefined || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : fallback;
}

export async function POST(request: NextRequest) {
  let rich;
  try {
    rich = await requireCompany();
  } catch {
    return NextResponse.json({ error: "Acesso restrito a empresas" }, { status: 403 });
  }
  const { company } = rich;

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Corpo da requisição muito grande" }, { status: 413 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 });
  }

  const title = clamp(body.title, 120);
  const type = clamp(body.type, 20);
  const planId = clamp(body.plan, 20);

  if (!title || title.length < 5) {
    return NextResponse.json({ error: "Título deve ter pelo menos 5 caracteres." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(type as JobType)) {
    return NextResponse.json({ error: "Tipo de contrato inválido." }, { status: 400 });
  }
  if (!ALLOWED_PLANS.has(planId)) {
    return NextResponse.json({ error: "Plano inválido." }, { status: 400 });
  }

  await ensureDatabaseReady();

  // Atualiza dados da empresa vindos do formulário (primeira publicação).
  const companyName = clamp(body.companyName, 80);
  const companyLogo = clamp(body.companyLogo, 40);
  if (companyName || companyLogo) {
    const patches: Record<string, string> = {};
    if (companyName) patches.name = companyName;
    if (companyLogo) patches.logoColor = companyLogo;
    await updateCompany(company.id, patches);
  }

  // Valida o limite de vagas do plano escolhido.
  const availability = await canCompanyPostMore(company.id, {
    forPlan: planId as Plan,
  });
  if (!availability.allowed) {
    const renderedLimit =
      availability.limit === Infinity ? "ilimitadas no plano Empresa" : `${availability.limit} vaga(s) ativa(s)`;
    return NextResponse.json(
      { error: `Limite do plano ${planId}: ${renderedLimit}. Renove ou faça upgrade.` },
      { status: 409 }
    );
  }

  const jobData: NewJobInput = {
    companyId: company.id,
    title,
    description: clamp(body.description, MAX_TEXT),
    location: clamp(body.location, 120),
    remote: body.remote === true,
    type: type as JobType,
    salaryMin: toInt(body.salaryMin, null),
    salaryMax: toInt(body.salaryMax, null),
    currency: typeof body.currency === "string" ? body.currency.slice(0, 3) : "BRL",
    tags: Array.isArray(body.tags) ? body.tags.filter((t): t is string => typeof t === "string").slice(0, 20) : [],
    quantity: toInt(body.quantity, 1) ?? 1,
    contactEmail:
      typeof body.contactEmail === "string" && body.contactEmail.trim()
        ? body.contactEmail.trim().slice(0, 160)
        : "",
    applyUrl: typeof body.applyUrl === "string" ? body.applyUrl.trim().slice(0, 300) : "",
    plan: planId as Plan,
    status: planId === "free" ? "active" : "pending",
    responsibilities: Array.isArray(body.responsibilities)
      ? (body.responsibilities as string[]).filter((r): r is string => typeof r === "string" && r.trim() !== "").slice(0, 10)
      : [],
    requirements: Array.isArray(body.requirements)
      ? (body.requirements as string[]).filter((r): r is string => typeof r === "string" && r.trim() !== "").slice(0, 10)
      : [],
    benefits: Array.isArray(body.benefits)
      ? (body.benefits as string[]).filter((r): r is string => typeof r === "string" && r.trim() !== "").slice(0, 10)
      : [],
  };

  const job = await createJob(jobData);

  // Cupom: valida apenas no servidor, nunca confia no preço enviado pelo cliente.
  let couponCode: string | null = null;
  let couponPercent: number | undefined;
  const rawCoupon = typeof body.couponCode === "string" ? body.couponCode.trim() : "";
  if (job.plan !== "free" && rawCoupon) {
    const coupon = await findCouponByCode(rawCoupon);
    if (coupon) {
      couponCode = coupon.code;
      couponPercent = coupon.percent;
    }
  }

  // Plano gratuito: publica direto. Pagos: gera ordem de pagamento + checkout.
  const order = await startOrder({ companyId: job.companyId, plan: job.plan, jobId: job.id, origin: request.nextUrl.origin, couponCode, couponPercent });

  return NextResponse.json(
    {
      data: {
        ok: true,
        job: { id: job.id, status: job.status },
        plan: job.plan,
        amount: order.amount,
        coupon: couponCode,
        next: order.paymentPending ? "payment" : "done",
        checkoutUrl: order.checkoutUrl,
        mock: order.mode === "mock",
        message: order.paymentPending
          ? "Vaga criada! Finalize o pagamento para publicá-la."
          : "Vaga publicada com sucesso!",
      },
    },
    { status: order.paymentPending ? 200 : 201 }
  );
}