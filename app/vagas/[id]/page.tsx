"use client";

import { useEffect, use, useState } from "react";
import Link from "next/link";
import { getJobById, type Job } from "@/lib/jobs";
import { formatPostedAt, formatSalary, initials, jobTypeLabels } from "@/lib/format";
import FavoriteButton from "@/components/FavoriteButton";

function JobDetailInner({ job }: { job: Job }) {
  return (
    <div className="container detail-wrap">
      <Link href="/" className="back-link">
        ← Voltar para vagas
      </Link>

      <article className="detail-card">
        <header className="detail-header">
          <div className="job-logo job-logo--lg" style={{ backgroundColor: job.logoColor }}>
            {initials(job.company)}
          </div>
          <div className="detail-header__main">
            <h1>{job.title}</h1>
            <p className="detail-company">
              {job.companyUrl ? (
                <a href={job.companyUrl} target="_blank" rel="noopener noreferrer">
                  {job.company}
                </a>
              ) : (
                job.company
              )}
            </p>
            <div className="detail-badges">
              <span className="badge">{jobTypeLabels[job.type]}</span>
              {job.featured && <span className="badge badge--featured">Destaque</span>}
              {job.remote && <span className="badge badge--remote">Remoto</span>}
            </div>
          </div>
          <div className="detail-actions">
            <FavoriteButton jobId={job.id} />
            <a
              href={`mailto:vagas@${job.company.toLowerCase().replace(/[^a-z0-9]/g, "")}.com?subject=Candidatura para ${encodeURIComponent(job.title)}`}
              className="btn btn--primary"
            >
              Candidatar-se
            </a>
          </div>
        </header>

        <div className="detail-body">
          <div className="detail-main">
            <section>
              <h2>Sobre a vaga</h2>
              <p>{job.description}</p>
            </section>

            <section>
              <h2>Responsabilidades</h2>
              <ul>
                {job.responsibilities.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>

            <section>
              <h2>Requisitos</h2>
              <ul>
                {job.requirements.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>

            <section>
              <h2>Benefícios</h2>
              <ul>
                {job.benefits.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          </div>

          <aside className="detail-side">
            <div className="side-card">
              <h3>Resumo</h3>
              <dl>
                <dt>Salário</dt>
                <dd>{formatSalary(job.salary)}</dd>
                <dt>Localização</dt>
                <dd>{job.location}</dd>
                <dt>Modelo</dt>
                <dd>{job.remote ? "Remoto" : "Presencial"}</dd>
                <dt>Publicada</dt>
                <dd>{formatPostedAt(job.postedAt)}</dd>
              </dl>
            </div>
            <div className="side-card">
              <h3>Habilidades</h3>
              <div className="job-card__tags">
                {job.tags.map((tag) => (
                  <span key={tag} className="tag">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </article>
    </div>
  );
}

export default function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [job, setJob] = useState<Job | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const found = getJobById(id);
    if (found) setJob(found);
    else setNotFound(true);
  }, [id]);

  if (notFound) {
    return (
      <div className="container">
        <div className="empty">
          <p className="empty__title">Vaga não encontrada</p>
          <p>A vaga que você procura não existe ou foi removida.</p>
          <Link href="/" className="btn btn--primary">
            Ver todas as vagas
          </Link>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="container">
        <div className="results-meta">Carregando vaga…</div>
      </div>
    );
  }

  return <JobDetailInner job={job} />;
}