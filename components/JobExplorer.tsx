"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Job } from "@/lib/jobs";
import JobCard from "./JobCard";

type Query = {
  q: string;
  location: string;
  type: string;
  remote: boolean;
};

export default function JobExplorer() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [sponsored, setSponsored] = useState<Job[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState<Query>({ q: "", location: "", type: "", remote: false });

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const fetchJobs = useCallback(async (q: Query) => {
    const params = new URLSearchParams();
    if (q.q.trim()) params.set("q", q.q.trim());
    if (q.location) params.set("location", q.location);
    if (q.type) params.set("type", q.type);
    if (q.remote) params.set("remote", "true");

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobs?${params.toString()}`, { cache: "no-store" });
      const json = await res.json();
      setJobs(json.data ?? []);
    } catch {
      setError("Não foi possível carregar as vagas. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs(query);
  }, [query, fetchJobs]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/locations", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) setLocations(json.data ?? []);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/jobs/sponsored", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) setSponsored(json.data ?? []);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  function update<K extends keyof Query>(key: K, value: Query[K]) {
    setQuery((prev) => ({ ...prev, [key]: value }));
  }

  function onSearchInput(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => update("q", value), 350);
  }

  function clearFilters() {
    setQuery({ q: "", location: "", type: "", remote: false });
    if (searchRef.current) searchRef.current.value = "";
  }

  const hasFilters = useMemo(
    () => Boolean(query.q.trim() || query.location || query.type || query.remote),
    [query]
  );

  return (
    <div className="container">
      <section className="hero">
        <h1>
          Encontre sua próxima <span>vaga de tecnologia</span>
        </h1>
        <p>
          Vagas para desenvolvedores, designers e engenheiros. Pesquise por cargo, filtre por
          localização e salve suas favoritas.
        </p>
      </section>

      <section className="filter-bar" aria-label="Filtros de busca">
        <div className="filter-group filter-group--search">
          <svg className="search-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
            <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="m20 20-3.2-3.2" />
          </svg>
          <input
            ref={searchRef}
            type="search"
            placeholder="Buscar por cargo, empresa ou skill…"
            aria-label="Buscar por cargo"
            defaultValue={query.q}
            onChange={onSearchInput}
          />
        </div>

        <div className="filter-group">
          <label className="sr-only" htmlFor="filter-location">
            Localização
          </label>
          <select
            id="filter-location"
            value={query.location}
            onChange={(e) => update("location", e.target.value)}
          >
            <option value="">Todas as localizações</option>
            {locations.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label className="sr-only" htmlFor="filter-type">
            Tipo de vaga
          </label>
          <select
            id="filter-type"
            value={query.type}
            onChange={(e) => update("type", e.target.value)}
          >
            <option value="">Todos os tipos</option>
            <option value="full-time">Tempo integral</option>
            <option value="part-time">Meio período</option>
            <option value="contract">Contrato</option>
            <option value="internship">Estágio</option>
          </select>
        </div>

        <label className="filter-group filter-remote">
          <input
            type="checkbox"
            checked={query.remote}
            onChange={(e) => update("remote", e.target.checked)}
          />
          <span>Somente remoto</span>
        </label>

        {hasFilters && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={clearFilters}>
            Limpar filtros
          </button>
        )}
      </section>

      <section aria-live="polite">
        {error && <div className="alert">{error}</div>}

        {sponsored.length > 0 && (
          <div className="sponsored-strip" aria-label="Vagas patrocinadas">
            <div className="sponsored-strip__header">
              <span className="sponsored-strip__label">Patrocinadas</span>
              <span className="sponsored-strip__hint">Vagas em destaque pago por empresas</span>
            </div>
            <div className="job-grid job-grid--sponsored">
              {sponsored.slice(0, 4).map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="results-meta">Carregando vagas…</div>
        ) : jobs.length === 0 ? (
          <div className="empty">
            <p className="empty__title">Nenhuma vaga encontrada</p>
            <p>
              Tente ajustar a busca ou limpar os filtros para ver mais resultados.
            </p>
            <button type="button" className="btn btn--primary" onClick={clearFilters}>
              Limpar filtros
            </button>
          </div>
        ) : (
          <>
            <p className="results-meta">
              {jobs.length} {jobs.length === 1 ? "vaga encontrada" : "vagas encontradas"}
            </p>
            <div className="job-grid">
              {jobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}