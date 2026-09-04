"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PLANS, type Plan } from "@/lib/types";
import { useAuth } from "@/lib/app-context";

export default function PlanosPage() {
  const { user, loading } = useAuth();
  const [selected, setSelected] = useState<Plan>("pro");

  function hrefForPlan(plan: Plan): string {
    if (plan === "free") return user ? "/publicar-vaga?plan=free" : "/cadastro?role=company";
    return `/publicar-vaga?plan=${plan}`;
  }

  useEffect(() => {
    const url = new URL(window.location.href);
    const plan = url.searchParams.get("plan");
    if (plan && PLANS.some((p) => p.id === plan)) {
      setSelected(plan as Plan);
    }
  }, []);

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