"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { jobs, type Job } from "@/lib/jobs";
import { useFavorites } from "@/lib/app-context";
import JobCard from "@/components/JobCard";

export default function FavoritesPage() {
  const { favorites } = useFavorites();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  const favJobs: Job[] = jobs.filter((job) => favorites.includes(job.id));

  return (
    <div className="container">
      <section className="hero hero--sm">
        <h1>Vagas Favoritas</h1>
        <p>Suas vagas salvas ficam armazenadas neste dispositivo.</p>
      </section>

      {!ready ? (
        <div className="results-meta">Carregando…</div>
      ) : favJobs.length === 0 ? (
        <div className="empty">
          <p className="empty__title">Nenhuma vaga favorita ainda</p>
          <p>Toque no coração em uma vaga para salvá-la aqui.</p>
          <Link href="/" className="btn btn--primary">
            Explorar vagas
          </Link>
        </div>
      ) : (
        <>
          <p className="results-meta">
            {favJobs.length} {favJobs.length === 1 ? "vaga salva" : "vagas salvas"}
          </p>
          <div className="job-grid">
            {favJobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}