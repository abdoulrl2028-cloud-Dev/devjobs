import { NextRequest, NextResponse } from "next/server";
import { ensureDatabaseReady } from "@/lib/db/init";
import { findCouponByCode, discountedPrice } from "@/lib/db/coupons";
import { PLANS, type Plan } from "@/lib/types";
import { planPrice } from "@/lib/payments";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 });
  }

  const code = typeof body.code === "string" ? body.code.trim().slice(0, 40) : "";
  const planId = typeof body.plan === "string" ? body.plan : "";
  if (!code) {
    return NextResponse.json({ error: "Informe um código de cupom" }, { status: 400 });
  }
  if (!PLANS.some((p) => p.id === planId)) {
    return NextResponse.json({ error: "Plano inválido" }, { status: 400 });
  }

  await ensureDatabaseReady();
  const coupon = await findCouponByCode(code);
  if (!coupon) {
    return NextResponse.json(
      { error: "Cupom inválido ou expirado", valid: false },
      { status: 404 }
    );
  }

  const price = planPrice(planId as Plan);
  const finalPrice = price === 0 ? 0 : discountedPrice(price, coupon.percent);

  return NextResponse.json({
    data: {
      valid: true,
      code: coupon.code,
      percent: coupon.percent,
      plan: planId,
      price,
      finalPrice,
    },
  });
}