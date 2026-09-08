"use client";

import { useCallback, useEffect, useState } from "react";
import type { CandidateProfile, Job } from "@/lib/types";

type Stats = {
  applications: number;
  favorites: number;
  interviewsTaken: number;
  avgInterviewScore: number;
  profileCompleteness: number;
};

type Data = {
  profile: CandidateProfile | null;
  plan: string;
  stats: Stats;
  appsLast7: Array<{ date: number; count: number }>;
  recommended: Array<{ job: Job; score: number }>;
  latestApplications: Array<{
    id: string;
    stage: string;
    appliedAt: string;
    job: Job | null;
  }>;
};

function AppStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="app-stat">
      <span className="app-stat__value">{value}</span>
      <span className="app-stat__label">{label}</span>
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/me/dashboard", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Não foi possível carregar as análises.");
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

  if (loading) {
    return (
      <div className="app-page">
        <div className="app-loading" role="status">
          <span className="spinner" /> Carregando…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-page">
        <div className="app-empty">
          <p>{error}</p>
          <button type="button" className="btn btn--primary" onClick={load}>
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  const stats = data?.stats;
  const maxWeek = Math.max(1, ...(data?.appsLast7 ?? []).map((d) => d.count));
  const avgScore = stats?.avgInterviewScore ?? 0;

  return (
    <div className="app-page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-sub">Acompanhe o desempenho da sua busca por vaga.</p>
        </div>
      </div>

      <section className="app-stats">
        <AppStat label="Candidaturas" value={stats?.applications ?? 0} />
        <AppStat label="Favoritas" value={stats?.favorites ?? 0} />
        <AppStat label="Entrevistas feitas" value={stats?.interviewsTaken ?? 0} />
        <AppStat label="Score médio de entrevista" value={avgScore ? new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(avgScore) : "—"} />
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
          <h2 className="app-card__title">Completude do perfil</h2>
          <div className="app-progress">
            <div
              className="app-progress__bar"
              style={{ width: `${stats?.profileCompleteness ?? 0}%` }}
            />
          </div>
          <p className="app-progress__label">
            {stats?.profileCompleteness ?? 0}% completo
          </p>
        </div>
      </section>
    </div>
  );
}
