"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Job } from "@/lib/types";

type RankedJob = {
  job: Job;
  score: number;
  match: boolean;
  why: string[];
};

export default function EmpresasPage() {
  const [companies, setCompanies] = useState<
    Array<{ name: string; logoColor: string; jobs: Job[] }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/me/jobs/search?q=", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Não foi possível carregar as empresas.");
        return;
      }
      const items: RankedJob[] = json.data?.items ?? [];
      const map = new Map<string, { name: string; logoColor: string; jobs: Job[] }>();
      for (const { job } of items) {
        const entry = map.get(job.company);
        if (entry) {
          entry.jobs.push(job);
        } else {
          map.set(job.company, { name: job.company, logoColor: job.logoColor, jobs: [job] });
        }
      }
      setCompanies(Array.from(map.values()));
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
          <h1 className="page-title">Empresas</h1>
          <p className="page-sub">Empresas com vagas disponíveis para você.</p>
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
      ) : companies.length === 0 ? (
        <div className="app-card">
          <div className="app-empty">
            <p>Nenhuma empresa com vagas disponíveis no momento.</p>
          </div>
        </div>
      ) : (
        <div className="app-grid app-grid--2">
          {companies.map((c) => (
            <div className="app-card" key={c.name}>
              <div className="app-job-row__main">
                <div className="job-logo" style={{ backgroundColor: c.logoColor || "#4f46e5" }}>
                  <span>{c.name.slice(0, 1).toUpperCase()}</span>
                </div>
                <strong>{c.name}</strong>
                <span>{c.jobs.length} vaga(s)</span>
              </div>
              <div className="app-job-list" style={{ marginTop: 12 }}>
                {c.jobs.map((job) => (
                  <div className="app-job-row" key={job.id}>
                    <div className="app-job-row__main">
                      <strong>{job.title}</strong>
                      <span>{job.location}</span>
                    </div>
                    <div className="app-job-row__aside">
                      <Link href={`/vagas/${job.id}`} className="btn btn--ghost btn--sm">
                        Ver
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
