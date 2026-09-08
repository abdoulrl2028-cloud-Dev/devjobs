"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Job, CandidateProfile } from "@/lib/types";

type RankedJob = {
  job: Job;
  score: number;
  match: boolean;
  why: string[];
};

type Data = {
  items: RankedJob[];
  profile: CandidateProfile | null;
  plan: string;
};

function scoreTone(score: number): string {
  if (score >= 80) return "score-badge score-badge--high";
  if (score >= 60) return "score-badge score-badge--mid";
  return "score-badge score-badge--low";
}

function SalaryRange({ job }: { job: Job }) {
  if (!job.salary) return null;
  const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: job.salary!.currency,
      maximumFractionDigits: 0,
    }).format(v);
  return (
    <span>
      {fmt(job.salary.min)}
      {job.salary.max !== job.salary.min ? ` – ${fmt(job.salary.max)}` : ""}
    </span>
  );
}

export default function RecomendadasPage() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/me/jobs/search?q=", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Não foi possível carregar as recomendações.");
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

  return (
    <div className="app-page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Recomendadas para você</h1>
          <p className="page-sub">
            Vagas selecionadas com base no seu perfil e compatibilidade.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="app-loading" role="status">
          <span className="spinner" /> Analisando vagas…
        </div>
      ) : error ? (
        <div className="app-empty">
          <p>{error}</p>
          <button type="button" className="btn btn--primary" onClick={load}>
            Tentar novamente
          </button>
        </div>
      ) : (
        <>
          {data?.profile == null && (
            <div className="app-note">
              Complete seu perfil para receber recomendações mais precisas.{" "}
              <Link href="/app/perfil">Editar perfil →</Link>
            </div>
          )}

          {!data || data.items.length === 0 ? (
            <div className="app-card">
              <div className="app-empty">
                <p>Nenhuma vaga recomendada no momento.</p>
              </div>
            </div>
          ) : (
            <div className="app-job-list">
              {data.items.map(({ job, score, why }) => (
                <article key={job.id} className="app-job-row">
                  <div className="app-job-row__main">
                    <strong>{job.title}</strong>
                    <span>
                      {job.company} · {job.location}
                      {job.remote && " · Remoto"}
                    </span>
                    {job.salary && <span><SalaryRange job={job} /></span>}
                    {why.length > 0 && (
                      <small className="app-job-row__tags">{why.join(" · ")}</small>
                    )}
                  </div>
                  <div className="app-job-row__aside">
                    <span className={scoreTone(score)}>{score}/100</span>
                    <Link href={`/vagas/${job.id}`} className="btn btn--ghost btn--sm">
                      Ver vaga
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
