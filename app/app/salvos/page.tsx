"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Job } from "@/lib/types";

export default function SalvosPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/favorites", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Não foi possível carregar as vagas salvas.");
        return;
      }
      setJobs(json.data ?? []);
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
          <h1 className="page-title">Vagas salvas</h1>
          <p className="page-sub">As vagas que você marcou como favoritas.</p>
        </div>
      </div>

      {loading ? (
        <div className="app-loading" role="status">
          <span className="spinner" /> Carregando…
        </div>
      ) : error ? (
        <div className="app-empty">
          <p>{error}</p>
          <button type="button" className="btn btn--primary" onClick={load}>
            Tentar novamente
          </button>
        </div>
      ) : jobs.length === 0 ? (
        <div className="app-card">
          <div className="app-empty">
            <p>Você ainda não salvou nenhuma vaga.</p>
            <Link href="/app/vagas" className="btn btn--primary btn--sm">
              Explorar vagas
            </Link>
          </div>
        </div>
      ) : (
        <div className="app-job-list">
          {jobs.map((job) => (
            <article key={job.id} className="app-job-row">
              <div className="app-job-row__main">
                <strong>{job.title}</strong>
                <span>
                  {job.company} · {job.location}
                  {job.remote && " · Remoto"}
                </span>
                {job.salary && (
                  <span>
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: job.salary.currency,
                      maximumFractionDigits: 0,
                    }).format(job.salary.min)}
                    {job.salary.max !== job.salary.min
                      ? ` – ${new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: job.salary.currency,
                          maximumFractionDigits: 0,
                        }).format(job.salary.max)}`
                      : ""}
                  </span>
                )}
                {job.tags.length > 0 && (
                  <small className="app-job-row__tags">
                    {job.tags.slice(0, 4).map((t) => (
                      <em key={t}>#{t}</em>
                    ))}
                  </small>
                )}
              </div>
              <div className="app-job-row__aside">
                <Link href={`/vagas/${job.id}`} className="btn btn--ghost btn--sm">
                  Ver vaga
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
