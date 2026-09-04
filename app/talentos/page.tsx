"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/app-context";
import type { CandidateProfile } from "@/lib/types";
import { initials } from "@/lib/format";

const EXPERIENCES = [
  { value: "", label: "Qualquer experiência" },
  { value: "0-1", label: "Até 1 ano" },
  { value: "1-3", label: "1 a 3 anos" },
  { value: "3-5", label: "3 a 5 anos" },
  { value: "5+", label: "Mais de 5 anos" },
];

type Filters = {
  tech: string;
  cargo: string;
  experience: string;
  location: string;
  remote: boolean;
};

export default function TalentosPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [talents, setTalents] = useState<CandidateProfile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [upgrade, setUpgrade] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [filters, setFilters] = useState<Filters>({ tech: "", cargo: "", experience: "", location: "", remote: false });

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchTalents = useCallback(async () => {
    setLoadingData(true);
    setError(null);
    setUpgrade(false);
    try {
      const params = new URLSearchParams();
      if (filters.tech.trim()) params.set("tech", filters.tech.trim());
      if (filters.cargo.trim()) params.set("cargo", filters.cargo.trim());
      if (filters.experience) params.set("experience", filters.experience);
      if (filters.location.trim()) params.set("location", filters.location.trim());
      if (filters.remote) params.set("remote", "true");

      const res = await fetch(`/api/talents?${params.toString()}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) {
        if (json.upgradeRequired) setUpgrade(true);
        else setError(json.error ?? "Erro ao carregar talentos.");
        setTalents([]);
        setLoadingData(false);
        return;
      }
      setTalents(json.data ?? []);
    } catch {
      setError("Não foi possível carregar os talentos.");
    } finally {
      setLoadingData(false);
    }
  }, [filters]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/login?next=/talentos");
      return;
    }
    if (user.role !== "company") {
      router.push("/");
      return;
    }
    fetchTalents();
  }, [user, loading, router, fetchTalents]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchTalents(), 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [filters, fetchTalents]);

  function update<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  if (loading) {
    return (
      <div className="container">
        <div className="results-meta">Carregando…</div>
      </div>
    );
  }

  if (upgrade) {
    return (
      <div className="container">
        <div className="empty">
          <p className="empty__title">Banco de talentos exclusivo</p>
          <p>
            O acesso à busca de talentos está disponível para os planos <strong>Pro</strong> e{" "}
            <strong>Empresa</strong>. Faça um upgrade para encontrar candidatos por tecnologia, cargo,
            experiência, localização e remoto.
          </p>
          <Link href="/planos" className="btn btn--primary">
            Ver planos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <section className="page-hero page-hero--compact">
        <h1>Banco de talentos</h1>
        <p>Encontre profissionais de tecnologia para as suas vagas.</p>
      </section>

      <section className="filter-bar" aria-label="Filtros do banco de talentos">
        <div className="filter-group">
          <label className="sr-only" htmlFor="tl-tech">Tecnologia</label>
          <input
            id="tl-tech"
            type="search"
            placeholder="Tecnologia (React, Node.js…)"
            defaultValue={filters.tech}
            onChange={(e) => update("tech", e.target.value)}
          />
        </div>
        <div className="filter-group">
          <label className="sr-only" htmlFor="tl-cargo">Cargo</label>
          <input
            id="tl-cargo"
            type="search"
            placeholder="Cargo (Desenvolvedor…)"
            defaultValue={filters.cargo}
            onChange={(e) => update("cargo", e.target.value)}
          />
        </div>
        <div className="filter-group">
          <label className="sr-only" htmlFor="tl-exp">Experiência</label>
          <select id="tl-exp" value={filters.experience} onChange={(e) => update("experience", e.target.value)}>
            {EXPERIENCES.map((exp) => (
              <option key={exp.value} value={exp.value}>
                {exp.label}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label className="sr-only" htmlFor="tl-loc">Localização</label>
          <input
            id="tl-loc"
            type="search"
            placeholder="Localização"
            defaultValue={filters.location}
            onChange={(e) => update("location", e.target.value)}
          />
        </div>
        <label className="filter-group filter-remote">
          <input type="checkbox" checked={filters.remote} onChange={(e) => update("remote", e.target.checked)} />
          <span>Remoto</span>
        </label>
      </section>

      <section aria-live="polite">
        {error && <div className="alert alert--error">{error}</div>}
        {loadingData ? (
          <div className="results-meta">Carregando talentos…</div>
        ) : talents.length === 0 ? (
          <div className="empty">
            <p className="empty__title">Nenhum talento encontrado</p>
            <p>Ajuste os filtros para ampliar a busca.</p>
          </div>
        ) : (
          <>
            <p className="results-meta">
              {talents.length} {talents.length === 1 ? "talento encontrado" : "talentos encontrados"}
            </p>
            <div className="talent-grid">
              {talents.map((talent) => (
                <article className="talent-card" key={talent.id}>
                  <div className="talent-card__top">
                    <div className="talent-avatar" style={{ backgroundColor: "#6d28d9" }}>
                      {initials(talent.fullName)}
                    </div>
                    <div className="talent-card__meta">
                      <h3>{talent.fullName}</h3>
                      <p className="talent-card__headline">{talent.headline}</p>
                    </div>
                  </div>
                  <div className="talent-card__info">
                    <span className="pill">
                      {talent.location ?? "Localização não informada"}
                    </span>
                    {talent.availableRemote && (
                      <span className="pill pill--remote">Remoto</span>
                    )}
                    <span className="pill">{talent.experience} anos</span>
                  </div>
                  <div className="job-card__tags">
                    {talent.skills.slice(0, 5).map((skill) => (
                      <span key={skill} className="tag">
                        {skill}
                      </span>
                    ))}
                  </div>
                  <p className="talent-card__summary">{talent.summary}</p>
                  <Link href={`/talento/${talent.id}`} className="btn btn--primary btn--block btn--sm">
                    Ver perfil
                  </Link>
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}