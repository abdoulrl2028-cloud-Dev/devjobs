"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/app-context";
import type { CandidateProfile, Job } from "@/lib/types";
import { CANDIDATE_TIER_NAMES } from "@/lib/types";
import { formatSalary } from "@/lib/format";

type DashboardData = {
  profile: CandidateProfile | null;
  plan: string;
  stats: {
    applications: number;
    favorites: number;
    offers: number;
    profileCompleteness: number;
  };
  appsLast7: Array<{ date: number; count: number }>;
  recommended: Array<{ job: Job; score: number }>;
  latestApplications: Array<{
    id: string;
    stage: string;
    appliedAt: string;
    job: Job | null;
  }>;
};

const STAGE_LABELS: Record<string, string> = {
  applied: "Candidatura enviada",
  test: "Teste técnico",
  interview: "Entrevista",
  offer: "Oferta",
  hired: "Contratado",
  rejected: "Recusada",
};

function scoreTone(score: number): string {
  if (score >= 75) return "score-badge score-badge--high";
  if (score >= 50) return "score-badge score-badge--mid";
  return "score-badge score-badge--low";
}

export default function AppDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/me/dashboard", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Não foi possível carregar o painel.");
        return;
      }
      setData(json.data);
    } catch {
      setError("Falha de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const firstName = (user?.name ?? "candidato").split(" ")[0];
  const maxWeek = Math.max(1, ...(data?.appsLast7 ?? []).map((d) => d.count));
  const maxScore = Math.max(1, ...(data?.recommended ?? []).map((r) => r.score));

  if (loading) return <AppPlaceholder text="Carregando seu painel…" />;

  if (error) return <AppError message={error} onRetry={load} />;

  return (
    <div className="app-page">
      <div className="app-page__head">
        <div>
          <h1>
            Olá, <span className="app-greeting">{firstName}</span>! 👋
          </h1>
          <p className="app-sub">Aqui está um resumo da sua busca por vaga hoje.</p>
        </div>
        <Link href="/app/vagas" className="btn btn--primary">
          Buscar vagas
        </Link>
      </div>

      <section className="app-stats">
        <AppStat label="Candidaturas" value={data?.stats.applications ?? 0} icon="M4 5h16M4 12h16M4 19h10M14 16l4 4 4-4" />
        <AppStat label="Vagas salvas" value={data?.stats.favorites ?? 0} icon="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z" />
        <AppStat label="Ofertas recebidas" value={data?.stats.offers ?? 0} icon="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        <AppStat label="Perfil completo" value={`${data?.stats.profileCompleteness ?? 0}%`} icon="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </section>

      <section className="app-grid app-grid--2">
        <div className="app-card">
          <h2 className="app-card__title">Candidaturas nos últimos 7 dias</h2>
          <div className="app-chart">
            {[...Array(7)].map((_, i) => {
              const day = data?.appsLast7?.[i];
              const h = day && day.count > 0 ? Math.max(8, (day.count / maxWeek) * 100) : 4;
              return (
                <div className="app-chart__col" key={i} title={`${day?.count ?? 0} candidatura(s)`}>
                  <div className="app-chart__bar" style={{ height: `${h}%` }} />
                  <span className="app-chart__label">{day?.date ?? ""}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="app-card">
          <h2 className="app-card__title">Seu perfil</h2>
          <p className="app-sub">
            Complete seu perfil para subir sua compatibilidade com as vagas.
          </p>
          <div className="app-progress">
            <div
              className="app-progress__bar"
              style={{ width: `${data?.stats.profileCompleteness ?? 0}%` }}
            />
          </div>
          <p className="app-progress__label">
            {data?.stats.profileCompleteness ?? 0}% completo
          </p>
          <div className="app-card__actions">
            <Link href="/app/perfil" className="btn btn--ghost btn--sm">
              Editar perfil
            </Link>
            <Link href="/app/curriculos" className="btn btn--ghost btn--sm">
              Meu currículo
            </Link>
          </div>
        </div>
      </section>

      <section className="app-section">
        <div className="app-section__head">
          <h2>Recomendadas para você</h2>
          <Link href="/app/recomendadas" className="link">
            Ver todas →
          </Link>
        </div>
        {data?.recommended?.length === 0 ? (
          <div className="app-empty">
            <p>Nenhuma vaga disponível no momento.</p>
          </div>
        ) : (
          <div className="app-job-list">
            {data?.recommended.map(({ job, score }) => (
              <div className="app-job-row" key={job.id}>
                <div className="app-job-row__main">
                  <strong>{job.title}</strong>
                  <span>
                    {job.company} · {job.location} ·{" "}
                    {job.salary ? formatSalary(job.salary) : "Salário a combinar"}
                  </span>
                  <small className="app-job-row__tags">
                    {job.tags.slice(0, 4).map((t) => (
                      <em key={t}>{t}</em>
                    ))}
                  </small>
                </div>
                <div className="app-job-row__aside">
                  <span className={`score-badge ${scoreTone(score)}`}>{score}%</span>
                  <Link href={`/vagas/${job.id}`} className="btn btn--ghost btn--sm">
                    Ver vaga
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="app-section">
        <div className="app-section__head">
          <h2>Últimas candidaturas</h2>
          <Link href="/app/candidaturas" className="link">
            Abrir pipeline →
          </Link>
        </div>
        {data?.latestApplications.length === 0 ? (
          <div className="app-empty">
            <p>Você ainda não se candidatou a nenhuma vaga.</p>
            <Link href="/app/vagas" className="btn btn--primary btn--sm">
              Explorar vagas
            </Link>
          </div>
        ) : (
          <div className="app-job-list">
            {data?.latestApplications.map((app) => (
              <div className="app-job-row" key={app.id}>
                <div className="app-job-row__main">
                  <strong>{app.job?.title ?? "Vaga removida"}</strong>
                  <span>
                    {app.job?.company} ·{" "}
                    {new Date(app.appliedAt).toLocaleDateString("pt-BR")} ·{" "}
                    <span className={`stage-chip stage-chip--${app.stage}`}>
                      {STAGE_LABELS[app.stage] ?? app.stage}
                    </span>
                  </span>
                </div>
                <div className="app-job-row__aside">
                  {app.job && (
                    <Link href={`/vagas/${app.job.id}`} className="btn btn--ghost btn--sm">
                      Ver vaga
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="app-plan-callout">
        <div>
          <strong>Plano {data ? CANDIDATE_TIER_NAMES[data.plan as "free" | "premium" | "pro"] ?? "Grátis" : "Grátis"}</strong>
          <p>Desbloqueie análises de IA ilimitadas, kanban e entrevistas simuladas.</p>
        </div>
        <Link href="/planos" className="btn btn--primary btn--sm">
          Conhecer Premium
        </Link>
      </div>
    </div>
  );
}

function AppPlaceholder({ text }: { text: string }) {
  return (
    <div className="app-page">
      <div className="app-loading">
        <span className="app-loading__spinner" />
        <p>{text}</p>
      </div>
    </div>
  );
}

function AppError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="app-page">
      <div className="app-empty">
        <p className="empty__title">{message}</p>
        <button type="button" className="btn btn--primary" onClick={onRetry}>
          Tentar novamente
        </button>
      </div>
    </div>
  );
}

function AppStat({ label, value, icon }: { label: string; value: number | string; icon: string }) {
  return (
    <div className="app-stat">
      <span className="app-stat__icon">
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path d={icon} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="app-stat__value">{value}</span>
      <span className="app-stat__label">{label}</span>
    </div>
  );
}