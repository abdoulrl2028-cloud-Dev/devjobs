"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PLANS, CANDIDATE_PLANS, type Plan, type CandidateTier } from "@/lib/types";
import { useAuth } from "@/lib/app-context";

export default function PlanosPage() {
  const { user, loading } = useAuth();
  const isCandidate = user?.role === "candidate";
  const [selected, setSelected] = useState<Plan | CandidateTier>("pro");
  const [currentTier, setCurrentTier] = useState<CandidateTier | null>(null);
  const [checkingPlan, setCheckingPlan] = useState<CandidateTier | null>(null);
  const [planFormError, setPlanFormError] = useState("");

  useEffect(() => {
    const url = new URL(window.location.href);
    const plan = url.searchParams.get("plan");
    if (plan && PLANS.some((p) => p.id === plan)) {
      setSelected(plan as Plan);
    }
  }, []);

  const loadTier = useCallback(async () => {
    if (!isCandidate) return;
    try {
      const res = await fetch("/api/me/dashboard", { cache: "no-store" });
      if (!res.ok) return;
      const json = await res.json();
      setCurrentTier((json.data?.plan as CandidateTier) ?? "free");
    } catch {
      // não logado: sem plano atual
    }
  }, [isCandidate]);

  useEffect(() => {
    loadTier();
  }, [loadTier]);

  function hrefForPlan(plan: Plan): string {
    if (plan === "free") return user ? "/publicar-vaga?plan=free" : "/cadastro?role=company";
    return `/publicar-vaga?plan=${plan}`;
  }

  async function subscribe(tier: CandidateTier) {
    setPlanFormError("");
    if (!user) {
      window.location.href = `/cadastro?next=/planos`;
      return;
    }
    setCheckingPlan(tier);
    try {
      const res = await fetch("/api/me/plan/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const json = (await res.json()) as {
        error?: string;
        data?: { mode?: "stripe" | "mock"; checkoutUrl?: string | null };
      };
      if (!res.ok || !json.data) {
        setPlanFormError(json.error ?? "Não foi possível iniciar o checkout.");
        return;
      }
      if (json.data.mode === "stripe" && json.data.checkoutUrl) {
        window.location.href = json.data.checkoutUrl;
        return;
      }
      // Modo mock: confirma direto e recarrega o plano atual.
      const confirm = await fetch("/api/me/plan/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const cjson = (await confirm.json()) as {
        error?: string;
        data?: { ok?: boolean; message?: string };
      };
      if (!confirm.ok || !cjson.data?.ok) {
        setPlanFormError(cjson.error ?? "Não foi possível confirmar o pagamento.");
        return;
      }
      await loadTier();
      setPlanFormError("");
      window.alert(`✅ ${cjson.data.message ?? "Plano ativado!"}`);
    } catch {
      setPlanFormError("Falha de conexão. Tente novamente.");
    } finally {
      setCheckingPlan(null);
    }
  }

  if (isCandidate) {
    return (
      <div className="container">
        <section className="page-hero page-hero--pricing">
          <span className="page-hero__eyebrow">Planos para candidatos</span>
          <h1>
            Escolha o plano <span>ideal para você</span>
          </h1>
          <p>
            Comece grátis com análises de IA do seu perfil contra as vagas, kanban de candidaturas,
            currículos e alertas. Evolua para acelerar suas chances.
          </p>
        </section>

        <div className="candidate-current" aria-live="polite">
          {currentTier ? (
            <p>
              Plano atual: <strong>{CANDIDATE_PLANS.find((p) => p.id === currentTier)?.name ?? currentTier}</strong>
            </p>
          ) : (
            <p>Sem plano definido ainda — o plano Grátis já esta ativo para você.</p>
          )}
        </div>

        <section className="pricing-grid" aria-label="Planos para candidatos">
          {CANDIDATE_PLANS.map((plan) => {
            const isPopular = plan.popular;
            const isCurrent = currentTier === plan.id;
            const isSelected = selected === plan.id;
            return (
              <div
                className={`pricing-card ${isPopular ? "pricing-card--popular" : ""} ${
                  isSelected ? "pricing-card--selected" : ""
                } ${isCurrent ? "pricing-card--current" : ""}`}
                key={plan.id}
                onClick={() => setSelected(plan.id)}
              >
                {isPopular && <span className="pricing-card__flag">Mais popular</span>}
                <h2 className="pricing-card__name">{plan.name}</h2>
                <p className="pricing-card__tagline">{plan.tagline}</p>
                <div className="pricing-card__price">
                  {plan.price === 0 ? (
                    <strong>R$ 0</strong>
                  ) : (
                    <strong>
                      R$ {plan.price}
                    </strong>
                  )}
                  <span>{plan.period}</span>
                </div>
                <ul className="pricing-card__features">
                  {plan.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                {isCurrent ? (
                  <button className="btn btn--block btn--primary" disabled>
                    Seu plano atual ✓
                  </button>
                ) : plan.id === "free" ? (
                  <Link href="/app/configuracoes" className="btn btn--block btn--primary">
                    Manter Grátis
                  </Link>
                ) : (
                  <button
                    className="btn btn--block btn--primary"
                    disabled={checkingPlan === plan.id}
                    onClick={() => subscribe(plan.id)}
                  >
                    {checkingPlan === plan.id
                      ? "Verificando…"
                      : `Assinar ${plan.name} — R$ ${plan.price}/mês`}
                  </button>
                )}
              </div>
            );
          })}
        </section>

        {planFormError && <div className="app-error planos-error">{planFormError}</div>}

        <section className="pricing-note">
          <p>
            Pagamento seguro via <strong>Stripe</strong> ou modo de teste (mock) enquanto as chaves
            reais não são configuradas. Assinatura mensal renovável; cancele quando quiser no
            painel do candidato.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="container">
      <section className="page-hero page-hero--pricing">
        <span className="page-hero__eyebrow">Planos</span>
        <h1>
          Escolha o plano que <span>combina com o seu time</span>
        </h1>
        <p>
          O plano Grátis é para sempre e sem cartão de crédito. Evolua quando precisar de mais alcance,
          destaque e acesso a talentos.
        </p>
      </section>

      <section className="pricing-grid" aria-label="Planos">
        {PLANS.map((plan) => {
          const isPopular = plan.popular;
          const isSelected = selected === plan.id;
          return (
            <div
              className={`pricing-card ${isPopular ? "pricing-card--popular" : ""} ${
                isSelected ? "pricing-card--selected" : ""
              }`}
              key={plan.id}
              onClick={() => setSelected(plan.id)}
            >
              {isPopular && <span className="pricing-card__flag">Mais popular</span>}
              <h2 className="pricing-card__name">{plan.name}</h2>
              <p className="pricing-card__tagline">{plan.tagline}</p>
              <div className="pricing-card__price">
                {plan.price === 0 ? (
                  <strong>R$ 0</strong>
                ) : (
                  <strong>
                    R$ {plan.price}
                  </strong>
                )}
                <span>{plan.period}</span>
              </div>
              <ul className="pricing-card__features">
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <Link href={hrefForPlan(plan.id)} className="btn btn--block btn--primary">
                {plan.price === 0 ? "Começar grátis" : "Começar agora"}
              </Link>
            </div>
          );
        })}
      </section>

      <section className="pricing-note">
        <p>
          {loading ? "Carregando…" : user ? (
            <span>
              {user.role === "company" ? (
                <>Logado como empresa. Ao escolher um plano pago, você será direcionado ao pagamento seguro.</>
              ) : (
                <>As vagas pagas são publicadas por <strong>parceiros contratantes</strong>. Crie sua conta de empresa para contratar.</>
              )}
            </span>
          ) : (
            <span>
              Você precisa de uma <Link href="/cadastro?role=company" className="link">conta de empresa</Link> para publicar vagas.
            </span>
          )}
        </p>
      </section>
    </div>
  );
}