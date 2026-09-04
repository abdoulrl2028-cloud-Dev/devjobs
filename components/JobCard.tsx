"use client";

import Link from "next/link";
import type { Job } from "@/lib/jobs";
import { useFavorites } from "@/lib/app-context";
import { formatPostedAt, formatSalary, initials, jobTypeLabels } from "@/lib/format";

export default function JobCard({ job }: { job: Job }) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const fav = isFavorite(job.id);

  return (
    <article className={`job-card ${job.featured ? "job-card--featured" : ""}`}>
      <div className="job-card__top">
        <div className="job-logo" style={{ backgroundColor: job.logoColor }}>
          {initials(job.company)}
        </div>
        <div className="job-card__meta">
          <span className="job-type">{jobTypeLabels[job.type]}</span>
          {job.featured && <span className="badge badge--featured">Destaque</span>}
        </div>
        <button
          type="button"
          className={`fav-btn ${fav ? "fav-btn--active" : ""}`}
          onClick={() => toggleFavorite(job.id)}
          aria-label={fav ? "Remover dos favoritos" : "Salvar nos favoritos"}
          aria-pressed={fav}
          title={fav ? "Remover dos favoritos" : "Salvar nos favoritos"}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path
              fill={fav ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21.2l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8Z"
            />
          </svg>
        </button>
      </div>

      <h3 className="job-card__title">
        <Link href={`/vagas/${job.id}`}>{job.title}</Link>
      </h3>
      <p className="job-card__company">{job.company}</p>

      <div className="job-card__info">
        <span className="pill">
          <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
            <path
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              d="M12 21s-7-5.3-7-11a7 7 0 0 1 14 0c0 5.7-7 11-7 11Z"
            />
            <circle cx="12" cy="10" r="2.5" fill="currentColor" stroke="none" />
          </svg>
          {job.location}
        </span>
        {job.remote && (
          <span className="pill pill--remote">
            <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
              <path
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                d="M4 12h16m-5.5-7c0 0-1 3-1 7s1 7 1 7M9.5 5c0 0 1 3 1 7s-1 7-1 7"
              />
            </svg>
            Remoto
          </span>
        )}
      </div>

      <div className="job-card__tags">
        {job.tags.slice(0, 4).map((tag) => (
          <span key={tag} className="tag">
            {tag}
          </span>
        ))}
      </div>

      <div className="job-card__footer">
        <span className="job-salary">{formatSalary(job.salary)}</span>
        <span className="job-date">{formatPostedAt(job.postedAt)}</span>
      </div>
    </article>
  );
}