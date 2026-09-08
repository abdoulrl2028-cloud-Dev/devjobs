"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Job, CandidateProfile, ApplicationStage } from "@/lib/types";
import { useFavorites } from "@/lib/app-context";

type RankedJob = {
  job: Job;
  score: number;
  match: boolean;
  why: string[];
};

type ParsedMeta = {
  terms: string[];
  locations: string[];
  remote: boolean | null;
  types: string[];
  salaryMin: number | null;
  salaryMax: number | null;
  tags: string[];
};

const STAGE_LABEL: Record<string, string> = {
  applied: "Candidatar",
  test: "Teste técnico",
  interview: "Entrevista",
  offer: "Proposta",
  hired: "Contratado",
  rejected: "Recusado",
};

function SalaryRange({ job }: { job: Job }) {
  if (!job.salary) return null;
  const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: job.salary!.currency, maximumFractionDigits: 0 }).format(v);
  return (
    <span className="app-score-why">
      {fmt(job.salary.min)}
      {job.salary.max !== job.salary.min ? ` – ${fmt(job.salary.max)}` : ""}
    </span>
  );
}

export default function JobsPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [type, setType] = useState("");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<RankedJob[]>([]);
  const [meta, setMeta] = useState<ParsedMeta | null>(null);
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [applied, setApplied] = useState<Record<string, string>>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { isFavorite, toggleFavorite } = useFavorites();

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (location) params.set("location", location);
    if (type) params.set("type", type);
    if (remoteOnly !== false) {
      params.set("remote", remoteOnly ? "true" : "");
    }
    if (!remoteOnly) params.delete("remote");
    const res = await fetch(`/api/me/jobs/search?${params.toString()}`, { cache: "no-store" });
    if (!res.ok) {
      setItems([]);
      setLoading(false);
      return;
    }
    const json = await res.json();
    setItems(json.data.items ?? []);
    setMeta(json.data.parsed ?? null);
    setProfile(json.data.profile ?? null);
    setMessage(json.data.message ?? null);
    setLoading(false);
  }, [query, location, type, remoteOnly]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(load, remoteOnly || type || location ? 80 : 450);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [load, remoteOnly, type, location]);

  const applyToJob = async (jobId: string) => {
    const res = await fetch(`/api/jobs/${jobId}/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const json = await res.json();
    if (res.ok) {
      const stage: ApplicationStage = "applied";
      setApplied((prev) => ({ ...prev, [jobId]: stage }));
    } else {
      if (json.ok) setApplied((prev) => ({ ...prev, [jobId]: "applied" }));
    }
  };

  const openJob = (jobId: string) => router.push(`/vagas/${jobId}`);

  const showApplied = (job: Job) =>
    applied[job.id] ? STAGE_LABEL[applied[job.id]] : null;

  return (
    <div className="jobs-page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Buscar vagas</h1>
          <p className="page-sub">
            Busque em linguagem natural: <em>“React remoto acima de R$ 8.000”</em>, por cidade ou tipo.
          </p>
        </div>
      </div>

      <form
        className="smart-search"
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
        aria-label="Busca inteligente de vagas"
      >
        <div className="smart-search__field">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M21 21l-4.3-4.3M17 10a7 7 0 11-14 0 7 7 0 0114 0z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Ex.: "React remoto acima de R$ 8.000", "estágio São Paulo", "Node.js presencial"'
            aria-label="Busca inteligente"
          />
        </div>
        <div className="smart-search__filters">
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Cidade"
            aria-label="Cidade"
          />
          <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Tipo de vaga">
            <option value="">Todos os tipos</option>
            <option value="full-time">Tempo integral</option>
            <option value="part-time">Meio período</option>
            <option value="contract">Contrato</option>
            <option value="internship">Estágio</option>
          </select>
          <label className="checkbox">
            <input type="checkbox" checked={remoteOnly} onChange={(e) => setRemoteOnly(e.target.checked)} />
            <span>Só remoto</span>
          </label>
        </div>
      </form>

      {message && <p className="app-note">{message}</p>}

      {meta && (meta.terms.length > 0 || meta.tags.length > 0 || meta.locations.length > 0 || meta.remote !== null || meta.salaryMin !== null) && (
        <div className="app-chips" aria-label="Filtros reconhecidos">
          {meta.tags.map((t) => (
            <span key={`tag-${t}`} className="app-chip">
              #{t}
            </span>
          ))}
          {meta.terms.map((t) => (
            <span key={`term-${t}`} className="app-chip">
              {t}
            </span>
          ))}
          {meta.remote === true && (
            <span className="app-chip app-chip--accent">Remoto</span>
          )}
          {meta.remote === false && <span className="app-chip">Presencial</span>}
          {meta.locations.map((l) => (
            <span key={`loc-${l}`} className="app-chip">
              📍 {l}
            </span>
          ))}
          {meta.salaryMin !== null && (
            <span className="app-chip app-chip--accent">
              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(meta.salaryMin)}+
            </span>
          )}
        </div>
      )}

      <div className="jobs-list">
        {loading ? (
          <div className="app-loading" role="status">
            <span className="spinner" /> Analisando vagas…
          </div>
        ) : items.length === 0 ? (
          <div className="app-empty">
            <p>Nenhuma vaga encontrada. Tente ajustar a busca.</p>
          </div>
        ) : (
          items.map(({ job, score, match, why }) => (
            <article key={job.id} className={`job-card app-job-card ${match ? "job-card--match" : ""}`} onClick={() => openJob(job.id)}>
              <div className="job-card__top">
                <div className="job-logo" style={{ backgroundColor: job.logoColor || "#4f46e5" }}>
                  <span>{job.company.slice(0, 1).toUpperCase()}</span>
                </div>
                <div className="job-card__info">
                  <h3>{job.title}</h3>
                  <p className="job-card__company">
                    {job.company} · {job.location} {job.remote && <span className="badge-remote">Remoto</span>}
                  </p>
                </div>
                <div className="score-badge" title={`Compatibilidade estimada: ${score}/100`}>
                  <span className="score-badge__num">
                    {score}
                    <small>/100</small>
                  </span>
                </div>
              </div>

              <div className="job-card__tags">
                {job.tags.slice(0, 4).map((tag) => (
                  <span key={tag} className="tag">
                    {tag}
                  </span>
                ))}
              </div>

              <div className="app-job-card__foot">
                <SalaryRange job={job} />
                {why.length > 0 && (
                  <span className="app-score-why" title={why.join(" · ")}>
                    ⭐ {why.join(" · ")}
                  </span>
                )}
                <div className="job-card__actions">
                  {showApplied(job) ? (
                    <button className="btn btn--ghost" disabled>
                      ✓ {showApplied(job)}
                    </button>
                  ) : (
                    <button
                      className="btn btn--primary btn--sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        applyToJob(job.id);
                      }}
                    >
                      Candidatar agora
                    </button>
                  )}
                  <button
                    className={`btn btn--ghost btn--sm ${isFavorite(job.id) ? "is-fav" : ""}`}
                    aria-label={isFavorite(job.id) ? "Remover dos favoritos" : "Salvar vaga"}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(job.id);
                    }}
                  >
                    {isFavorite(job.id) ? "♥" : "♡"}
                  </button>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}