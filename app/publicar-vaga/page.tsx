"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/app-context";
import { PLANS, type Plan } from "@/lib/types";

const COLORS = ["#6d28d9", "#6366f1", "#0ea5e9", "#16a34a", "#f59e0b", "#db2777", "#dc2626", "#0d9488"];

type FormState = {
  companyName: string;
  logoColor: string;
  title: string;
  description: string;
  location: string;
  remote: boolean;
  type: string;
  salaryMin: string;
  salaryMax: string;
  currency: string;
  quantity: string;
  contactEmail: string;
  applyUrl: string;
};

export default function PublicarVagaPage() {
  return (
    <Suspense fallback={null}>
      <PublicarVagaContent />
    </Suspense>
  );
}

function PublicarVagaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, refresh } = useAuth();

  const [form, setForm] = useState<FormState>({
    companyName: "",
    logoColor: "#6d28d9",
    title: "",
    description: "",
    location: "",
    remote: true,
    type: "full-time",
    salaryMin: "",
    salaryMax: "",
    currency: "BRL",
    quantity: "1",
    contactEmail: "",
    applyUrl: "",
  });

  const [tags, setTags] = useState("");
  const [responsibilities, setResponsibilities] = useState("");
  const [requirements, setRequirements] = useState("");
  const [benefits, setBenefits] = useState("");
  const [plan, setPlan] = useState<Plan>("free");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ message: string; jobId: string } | null>(null);

  useEffect(() => {
    const urlPlan = searchParams.get("plan");
    if (urlPlan && PLANS.some((p) => p.id === urlPlan)) {
      setPlan(urlPlan as Plan);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!loading && user?.role === "company") {
      refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role, loading]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  function splitLines(text: string): string[] {
    return text
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!user) {
      router.push(`/login?next=/publicar-vaga?plan=${plan}`);
      return;
    }
    if (user.role !== "company") {
      setError("Crie uma conta de empresa para publicar vagas.");
      return;
    }

    const tagsList = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 20);
    if (tagsList.length === 0) {
      setError("Adicione pelo menos uma habilidade/tecnologia (separadas por vírgula).");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/company/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          plan,
          salaryMin: form.salaryMin ? Number(form.salaryMin) : null,
          salaryMax: form.salaryMax ? Number(form.salaryMax) : null,
          quantity: Number(form.quantity) || 1,
          tags: tagsList,
          responsibilities: splitLines(responsibilities),
          requirements: splitLines(requirements),
          benefits: splitLines(benefits),
        }),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Não foi possível publicar a vaga.");
        setSubmitting(false);
        return;
      }

      const data = json.data;
      if (data.next === "done") {
        setDone({ message: data.message, jobId: data.job.id });
        setSubmitting(false);
        return;
      }

      const jobId = data.job.id;
      const planId: Plan = data.plan;
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      // Modo mock: confirmar na página de sucesso.
      router.push(`/pagamento/sucesso?mock=1&jobId=${jobId}&plan=${planId}`);
    } catch {
      setError("Erro de conexão. Tente novamente.");
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="container">
        <div className="login-card">
          <h1>Vaga criada!</h1>
          <p>{done.message}</p>
          <div className="form-row form-row--center">
            <Link href="/dashboard" className="btn btn--primary">
              Ir para o painel
            </Link>
            <Link href={`/vagas/${done.jobId}`} className="btn btn--ghost">
              Ver vaga
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!loading && user && user.role !== "company") {
    return (
      <div className="container">
        <div className="login-card">
          <h1>Área para empresas</h1>
          <p>
            Para publicar vagas você precisa de uma conta de empresa. Sua conta atual é de candidato(a).
          </p>
          <Link href="/para-empresas" className="btn btn--primary">
            Conhecer planos para empresas
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <section className="page-hero page-hero--compact">
        <h1>Publicar vaga</h1>
        <p>Preencha os dados da vaga e escolha o plano. Revisamos rapidamente cada publicação.</p>
      </section>

      <div className="publish-layout">
        <form onSubmit={handleSubmit} className="publish-form">
          {error && <div className="alert alert--error">{error}</div>}

          <fieldset className="form-section">
            <legend>Empresa</legend>
            {!user && (
              <p className="form-hint">
                Você ainda não está logado. Ao enviar, você será direcionado ao login e a vaga será salva
                assim que você entrar com uma conta de empresa.
              </p>
            )}
            <div className="field">
              <label htmlFor="companyName">Nome da empresa</label>
              <input
                id="companyName"
                type="text"
                placeholder="Ex.: NovaTech"
                value={form.companyName}
                onChange={(e) => update("companyName", e.target.value)}
              />
            </div>
            <div className="field">
              <label>Cor do logo</label>
              <div className="color-picker">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Usar cor ${c}`}
                    className={`color-swatch ${form.logoColor === c ? "color-swatch--active" : ""}`}
                    style={{ backgroundColor: c }}
                    onClick={() => update("logoColor", c)}
                  />
                ))}
              </div>
            </div>
          </fieldset>

          <fieldset className="form-section">
            <legend>Vaga</legend>
            <div className="field">
              <label htmlFor="title">Título da vaga *</label>
              <input
                id="title"
                type="text"
                required
                minLength={5}
                placeholder="Ex.: Desenvolvedor(a) Frontend React"
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="description">Descrição *</label>
              <textarea
                id="description"
                required
                rows={6}
                placeholder="Descreva a vaga, o dia a dia e o time…"
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
              />
            </div>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="location">Localização</label>
                <input
                  id="location"
                  type="text"
                  placeholder="Ex.: São Paulo - SP ou Remoto"
                  value={form.location}
                  onChange={(e) => update("location", e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="type">Tipo de contrato</label>
                <select id="type" value={form.type} onChange={(e) => update("type", e.target.value)}>
                  <option value="full-time">Tempo integral</option>
                  <option value="part-time">Meio período</option>
                  <option value="contract">Contrato</option>
                  <option value="internship">Estágio</option>
                </select>
              </div>
            </div>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={form.remote}
                onChange={(e) => update("remote", e.target.checked)}
              />
              <span>Permite trabalho remoto</span>
            </label>
            <div className="form-grid form-grid--3">
              <div className="field">
                <label htmlFor="salaryMin">Salário mínimo</label>
                <input
                  id="salaryMin"
                  type="number"
                  min={0}
                  placeholder="9000"
                  value={form.salaryMin}
                  onChange={(e) => update("salaryMin", e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="salaryMax">Salário máximo</label>
                <input
                  id="salaryMax"
                  type="number"
                  min={0}
                  placeholder="13000"
                  value={form.salaryMax}
                  onChange={(e) => update("salaryMax", e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="currency">Moeda</label>
                <select id="currency" value={form.currency} onChange={(e) => update("currency", e.target.value)}>
                  <option value="BRL">BRL</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="tags">Tecnologias/habilidades *</label>
                <input
                  id="tags"
                  type="text"
                  required
                  placeholder="React, TypeScript, Next.js"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="quantity">Quantidade de vagas</label>
                <input
                  id="quantity"
                  type="number"
                  min={1}
                  value={form.quantity}
                  onChange={(e) => update("quantity", e.target.value)}
                />
              </div>
            </div>
          </fieldset>

          <fieldset className="form-section">
            <legend>Candidatura</legend>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="contactEmail">E-mail de contato</label>
                <input
                  id="contactEmail"
                  type="email"
                  placeholder="vagas@suaempresa.com"
                  value={form.contactEmail}
                  onChange={(e) => update("contactEmail", e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="applyUrl">Link de candidatura externo (opcional)</label>
                <input
                  id="applyUrl"
                  type="url"
                  placeholder="https://suaempresa.com/vagas"
                  value={form.applyUrl}
                  onChange={(e) => update("applyUrl", e.target.value)}
                />
              </div>
            </div>
          </fieldset>

          <fieldset className="form-section">
            <legend>Sobre a vaga (opcional)</legend>
            <div className="field">
              <label htmlFor="responsibilities">Principais responsabilidades</label>
              <textarea
                id="responsibilities"
                rows={4}
                placeholder={"Uma responsabilidade por linha"}
                value={responsibilities}
                onChange={(e) => setResponsibilities(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="requirements">Requisitos</label>
              <textarea
                id="requirements"
                rows={4}
                placeholder={"Um requisito por linha"}
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="benefits">Benefícios</label>
              <textarea
                id="benefits"
                rows={3}
                placeholder={"Um benefício por linha"}
                value={benefits}
                onChange={(e) => setBenefits(e.target.value)}
              />
            </div>
          </fieldset>

          <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
            {submitting ? "Publicando…" : plan === "free" ? "Publicar vaga grátis" : `Publicar com plano ${plan === "destaque" ? "Destaque" : plan === "pro" ? "Pro" : "Empresa"}`}
          </button>
        </form>

        <aside className="plan-selector">
          <h2>Escolha o plano</h2>
          <p className="form-hint">A vaga entra no ar após o pagamento (planos pagos) ou após aprovação (grátis). Pré-selecionamos o plano informado na URL.</p>
          <div className="plan-options">
            {PLANS.map((p) => (
              <label key={p.id} className={`plan-option ${plan === p.id ? "plan-option--active" : ""}`}>
                <input
                  type="radio"
                  name="plan"
                  value={p.id}
                  checked={plan === p.id}
                  onChange={() => setPlan(p.id)}
                />
                <div className="plan-option__head">
                  <strong>{p.name}</strong>
                  <span>{p.price === 0 ? "Grátis" : `R$ ${p.price}`}</span>
                </div>
                <small>{p.period}</small>
                <ul>
                  {p.features.slice(0, 3).map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </label>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}