import Link from "next/link";
import { notFound } from "next/navigation";
import { getJobById, recordJobView } from "@/lib/db/jobs";
import { ensureDatabaseReady } from "@/lib/db/init";
import { formatPostedAt, formatSalary, initials, jobTypeLabels } from "@/lib/format";
import FavoriteButton from "@/components/FavoriteButton";
import ApplyButton from "@/components/ApplyButton";
import { jsonLd, siteUrl } from "@/lib/seo";
import type { Job } from "@/lib/types";

export const dynamic = "force-dynamic";

const EMPLOYMENT_TYPES = {
  "full-time": "FULL_TIME",
  "part-time": "PART_TIME",
  contract: "CONTRACTOR",
  internship: "INTERN",
} as const;

function jobMetaDescription(job: Job): string {
  const parts = [
    job.title,
    "em",
    job.company,
    "|",
    job.remote ? "Remoto" : job.location,
    job.salary ? `· ${formatSalary(job.salary)}` : "",
  ].filter(Boolean);
  return parts.join(" ").slice(0, 160);
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  await ensureDatabaseReady();
  const job = await getJobById(id);
  if (!job || job.status !== "active") return { title: "Vaga não encontrada" };

  const title = `${job.title} em ${job.company}`;
  const description = jobMetaDescription(job);
  const url = siteUrl(`/vagas/${id}`);
  return {
    title,
    description,
    alternates: { canonical: `/vagas/${id}` },
    openGraph: {
      title,
      description,
      url,
      siteName: "DevJobs",
      locale: "pt_BR",
      type: "website",
    },
    twitter: { card: "summary", title, description },
  };
}

function jobPostingLd(job: Job) {
  const validThrough = job.expiresAt ?? new Date(Date.now() + 30 * 86400000).toISOString();
  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: job.description,
    datePosted: job.postedAt,
    validThrough,
    employmentType: EMPLOYMENT_TYPES[job.type],
    jobLocation: {
      "@type": "Place",
      address: { "@type": "PostalAddress", addressLocality: job.remote ? "Remoto" : job.location },
    },
    ...(job.remote ? { jobLocationType: "TELECOMMUTE" } : {}),
    hiringOrganization: {
      "@type": "Organization",
      name: job.company,
      ...(job.companyUrl?.startsWith("http") ? { sameAs: job.companyUrl } : {}),
    },
    ...(job.salary
      ? {
          baseSalary: {
            "@type": "MonetaryAmount",
            currency: job.salary.currency,
            value: {
              "@type": "QuantitativeValue",
              minValue: job.salary.min,
              maxValue: job.salary.max,
              unitText: "MONTH",
            },
          },
        }
      : {}),
  };
}

function DetailBadges({ job }: { job: Job }) {
  return (
    <div className="detail-badges">
      <span className="badge">{jobTypeLabels[job.type]}</span>
      {job.sponsored && <span className="badge badge--sponsored">Patrocinado</span>}
      {job.featured && <span className="badge badge--featured">Destaque</span>}
      {job.remote && <span className="badge badge--remote">Remoto</span>}
    </div>
  );
}

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  await ensureDatabaseReady();
  const job = await getJobById(id);

  if (!job || job.status !== "active") {
    notFound();
  }

  // Registrar a visualização desta vaga (métricas para a empresa).
  recordJobView(id).catch(() => undefined);

  return (
    <div className="container detail-wrap">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(jobPostingLd(job))} />
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
            <DetailBadges job={job} />
          </div>
          <div className="detail-actions">
            <FavoriteButton jobId={job.id} />
            <ApplyButton jobId={job.id} />
          </div>
        </header>

        <div className="detail-body">
          <div className="detail-main">
            <section>
              <h2>Sobre a vaga</h2>
              <p>{job.description}</p>
            </section>

            {job.responsibilities.length > 0 && (
              <section>
                <h2>Responsabilidades</h2>
                <ul>
                  {job.responsibilities.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            )}

            {job.requirements.length > 0 && (
              <section>
                <h2>Requisitos</h2>
                <ul>
                  {job.requirements.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            )}

            {job.benefits.length > 0 && (
              <section>
                <h2>Benefícios</h2>
                <ul>
                  {job.benefits.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            )}
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
                {job.quantity > 1 && (
                  <>
                    <dt>Vagas disponíveis</dt>
                    <dd>{job.quantity}</dd>
                  </>
                )}
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