"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/app-context";
import type { Job, Plan } from "@/lib/types";
import { formatSalary } from "@/lib/format";

type Stats = {
  totalJobs: number;
  activeJobs: number;
  pausedJobs: number;
  pendingJobs: number;
  totalApplications: number;
  views: number;
  clicks: number;
  hasActiveSubscription: boolean;
  totalPaid: number;
  payments: Array<{ id: string; plan: string; amount: number; status: string; createdAt: string }>;
  applicationsByJob: Array<{ id: string; title: string; applications: number }>;
};

type DashboardData = {
  company: { id: string; name: string; logoColor: string };
  plan: Plan;
  stats: Stats;
  jobs: Array<Job & { statusLabel: string }>;
};

const PLAN_NAMES: Record<string, string> = {
  free: "Grátis",
  destaque: "Destaque",
  pro: "Pro",
  empresa: "Empresa",
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/company/stats", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) {
        if (json.error) setError(json.error);
        return;
      }
      setData(json.data);
      setError(null);
    } catch {
      setError("Não foi possível carregar o painel.");
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/login?next=/dashboard");
      return;
    }
    if (user.role !== "company") {
      router.push("/");
      return;
    }
    load();
  }, [user, loading, router, load]);

  const act = useCallback(
    async (jobId: string, action: string, payload?: Record<string, unknown>) => {
      setBusy(`${jobId}:${action}`);
      setNotice(null);
      try {
        const res = await fetch(`/api/company/jobs/${jobId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, ...payload }),
        });
        const json = await res.json();
        if (!res.ok) {
          setError(json.error ?? "Não foi possível executar a ação.");
          setBusy(null);
          return;
        }
        setNotice(json.data?.message ?? "Ação concluída.");
        await load();
      } catch {
        setError("Erro de conexão.");
      }
      setBusy(null);
    },
    [load]
  );

  const remove = useCallback(
    async (jobId: string, title: string) => {
      if (!window.confirm(`Excluir a vaga "${title}"? Essa ação não pode ser desfeita.`)) return;
      setBusy(`${jobId}:delete`);
      try {
        const res = await fetch(`/api/company/jobs/${jobId}`, { method: "DELETE" });
        const json = await res.json();
        if (!res.ok) {
          setError(json.error ?? "Não foi possível excluir.");
          return;
        }
        setNotice("Vaga excluída.");
        await load();
      } catch {
        setError("Erro de conexão.");
      } finally {
        setBusy(null);
      }
    },
    [load]
  );

  if (loading || (!user && !loading)) {
    return (
      <div className="container">
        <div className="results-meta">Carregando…</div>
      </div>
    );
  }

  if (data && data.jobs.length === 0) {
    return (
      <div className="container">
        <section className="page-hero page-hero--compact">
          <h1>Painel da empresa</h1>
          <p>
            Olá, <strong>{data.company.name}</strong>! Seu plano atual é{" "}
            <strong>{PLAN_NAMES[data.plan] ?? data.plan}</strong>.
          </p>
        </section>
        <div className="empty">
          <p className="empty__title">Nenhuma vaga publicada ainda</p>
          <p>Publique sua primeira vaga e comece a receber candidaturas.</p>
          <Link href="/publicar-vaga" className="btn btn--primary">
            Publicar vaga
          </Link>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container">
        {error ? (
          <div className="empty">
            <p className="empty__title">{error}</p>
            {error.includes("Acesso restrito") && (
              <Link href="/login" className="btn btn--primary">
                Fazer login
              </Link>
            )}
          </div>
        ) : (
          <div className="results-meta">Carregando painel…</div>
        )}
      </div>
    );
  }

  const rate = data.stats.views > 0 ? Math.round((data.stats.clicks / data.stats.views) * 100) : 0;
  const maxApps = Math.max(1, ...data.stats.applicationsByJob.map((a) => a.applications));

  return (
    <div className="container">
      <section className="page-hero page-hero--compact">
        <div className="dashboard-head">
          <div>
            <h1>Painel da empresa</h1>
            <p>
              {data.company.name} · Plano{" "}
              <strong className="plan-chip">{PLAN_NAMES[data.plan] ?? data.plan}</strong>
            </p>
          </div>
          <div className="dashboard-head__actions">
            <Link href="/publicar-vaga" className="btn btn--primary">
              + Publicar vaga
            </Link>
            <Link href="/planos" className="btn btn--ghost">
              Planos
            </Link>
          </div>
        </div>
      </section>

      {notice && <div className="alert">{notice}</div>}
      {error && <div className="alert alert--error">{error}</div>}

      <section className="stats-grid" aria-label="Estatísticas">
        <div className="stat-card">
          <span className="stat-card__value">{data.stats.totalJobs}</span>
          <span className="stat-card__label">Total de vagas</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__value">{data.stats.activeJobs}</span>
          <span className="stat-card__label">Vagas ativas</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__value">{data.stats.totalApplications}</span>
          <span className="stat-card__label">Candidaturas</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__value">{data.stats.views}</span>
          <span className="stat-card__label">Visualizações</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__value">{rate}%</span>
          <span className="stat-card__label">CTR (cliques/visualizações)</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__value">{data.stats.pendingJobs}</span>
          <span className="stat-card__label">Aguardando pagamento</span>
        </div>
      </section>

      <section className="section">
        <h2 className="section__title">Candidaturas por vaga</h2>
        {data.stats.applicationsByJob.length === 0 ? (
          <p className="form-hint">Nenhuma candidatura recebida até o momento.</p>
        ) : (
          <div className="chart">
            {data.stats.applicationsByJob.map((item) => (
              <div className="chart__row" key={item.id}>
                <span className="chart__label">{item.title}</span>
                <div className="chart__bar-track">
                  <div
                    className="chart__bar"
                    style={{ width: `${(item.applications / maxApps) * 100}%` }}
                  />
                </div>
                <span className="chart__value">{item.applications}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="section">
        <h2 className="section__title">Minhas vagas</h2>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Vaga</th>
                <th>Plano</th>
                <th>Status</th>
                <th>Salário</th>
                <th>Visualizações</th>
                <th>Cliques</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {data.jobs.map((job) => (
                <tr key={job.id}>
                  <td>
                    <Link href={`/vagas/${job.id}`} className="table-link">
                      {job.title}
                    </Link>
                    <span className="table-sub">{job.company}</span>
                  </td>
                  <td className="table-plan">{PLAN_NAMES[job.plan] ?? job.plan}</td>
                  <td>
                    <span className={`status-chip status-chip--${job.status}`}>{job.statusLabel}</span>
                  </td>
                  <td>
                    {job.salary ? formatSalary(job.salary) : "Salário a combinar"}
                  </td>
                  <td>{job.views}</td>
                  <td>{job.clicks}</td>
                  <td>
                    <div className="table-actions">
                      {job.status === "active" && (
                        <button
                          type="button"
                          className="btn btn--ghost btn--xs"
                          disabled={busy === `${job.id}:pause`}
                          onClick={() => act(job.id, "pause")}
                        >
                          Pausar
                        </button>
                      )}
                      {(job.status === "paused" || job.status === "pending") && (
                        <button
                          type="button"
                          className="btn btn--ghost btn--xs"
                          disabled={busy === `${job.id}:activate`}
                          onClick={() => act(job.id, "activate")}
                        >
                          Ativar
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn--ghost btn--xs"
                        disabled={busy === `${job.id}:renovar`}
                        onClick={() => act(job.id, "renovar")}
                      >
                        Renovar
                      </button>
                      <button
                        type="button"
                        className="btn btn--danger btn--xs"
                        disabled={busy === `${job.id}:delete`}
                        onClick={() => remove(job.id, job.title)}
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="section">
        <h2 className="section__title">Pagamentos</h2>
        {data.stats.payments.length === 0 ? (
          <p className="form-hint">Nenhum pagamento registrado.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Plano</th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {data.stats.payments.map((p) => (
                  <tr key={p.id}>
                    <td>{PLAN_NAMES[p.plan] ?? p.plan}</td>
                    <td>R$ {p.amount.toLocaleString("pt-BR")}</td>
                    <td>
                      <span className={`status-chip status-chip--${p.status}`}>
                        {p.status === "paid" ? "Pago" : p.status === "pending" ? "Pendente" : p.status}
                      </span>
                    </td>
                    <td>{new Date(p.createdAt).toLocaleDateString("pt-BR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}