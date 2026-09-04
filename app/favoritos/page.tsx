"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth, useFavorites } from "@/lib/app-context";
import type { Job } from "@/lib/types";
import JobCard from "@/components/JobCard";

export default function FavoritosPage() {
  const { user, loading } = useAuth();
  const { favorites } = useFavorites();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const load = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) {
        setJobs([]);
        setLoadingData(false);
        return;
      }
      try {
        if (user) {
          const res = await fetch("/api/favorites", { cache: "no-store" });
          const json = await res.json();
          setJobs(json.data ?? []);
        } else {
          const fetched = await Promise.all(
            ids.slice(0, 30).map((id) =>
              fetch(`/api/jobs/${id}`, { cache: "no-store" })
                .then((r) => (r.ok ? r.json() : null))
                .then((json) => json?.data ?? null)
                .catch(() => null)
            )
          );
          setJobs(fetched.filter((j): j is Job => Boolean(j)));
        }
      } catch {
        setJobs([]);
      } finally {
        setLoadingData(false);
      }
    },
    [user]
  );

  useEffect(() => {
    if (loading) return;
    load(favorites);
  }, [user, loading, favorites, load]);

  if (loading || loadingData) {
    return (
      <div className="container">
        <div className="results-meta">Carregando favoritos…</div>
      </div>
    );
  }

  return (
    <div className="container">
      <section className="page-hero page-hero--compact">
        <h1>Vagas favoritas</h1>
        <p>
          {favorites.length === 0
            ? "Você ainda não salvou nenhuma vaga."
            : `${favorites.length} ${favorites.length === 1 ? "vaga salva" : "vagas salvas"}`}
        </p>
      </section>

      {jobs.length === 0 ? (
        <div className="empty">
          <p className="empty__title">Nenhuma vaga salva</p>
          <p>Toque no coração em uma vaga para salvá-la aqui.</p>
          <Link href="/" className="btn btn--primary">
            Explorar vagas
          </Link>
        </div>
      ) : (
        <div className="job-grid">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}