"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/app-context";
import type { Job, Plan } from "@/lib/types";

type Tab = "overview" | "jobs" | "users" | "companies";

type Summary = {
  revenue: { total: number; monthly: number; paymentsCount: number };
  counts: {
    companies: number;
    candidates: number;
    candidatesWithProfile: number;
    subscriptionsActive: number;
    jobsActive: number;
    jobsPending: number;
    jobsPaused: number;
    featured: number;
    sponsored: number;
    plans: Record<Plan, number>;
    views30d: number;
  };
};

type AdminJob = Job & { applications: number; planLabel: string };

type AdminUser = { id: string; name: string; email: string; role: string; createdAt: string };

type AdminCompany = { id: string; name: string; logoColor: string; website: string | null; createdAt: string };

const PLAN_NAMES: Record<string, string> = { free: "Grátis", destaque: "Destaque", pro: "Pro", empresa: "Empresa" };
const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  active: "Ativa",
  paused: "Pausada",
  rejected: "Recusada",
  expired: "Expirada",
};

export default function AdminPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [tab, setTab] = useState<Tab>("overview");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [companies, setCompanies] = useState<AdminCompany[]>([]);
  const [filters, setFilters] = useState({ status: "", q: "" });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    const res = await fetch("/api/admin/summary", { cache: "no-store" });
    const json = await res.json();
    if (res.ok) setSummary(json.data);
  }, []);

  const loadJobs = useCallback(async () => {
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.q) params.set("q", filters.q);
    const res = await fetch(`/api/admin/jobs?${params.toString()}`, { cache: "no-store" });
    const json = await res.json();
    if (res.ok) setJobs(json.data ?? []);
  }, [filters]);

  const loadUsers = useCallback(async () => {
    const res = await fetch("/api/admin/users", { cache: "no-store" });
    const json = await res.json();
    if (res.ok) setUsers(json.data ?? []);
  }, []);

  const loadCompanies = useCallback(async () => {
    const res = await fetch("/api/admin/companies", { cache: "no-store" });
    const json = await res.json();
    if (res.ok) setCompanies(json.data ?? []);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/login?next=/admin");
      return;
    }
    if (user.role !== "admin") {
      router.push("/");
      return;
    }
    loadSummary();
    loadJobs();
    loadUsers();
    loadCompanies();
  }, [user, loading, router, loadSummary, loadJobs, loadUsers, loadCompanies]);

  const actJob = useCallback(
    async (jobId: string, action: string) => {
      setBusy(`${jobId}:${action}`);
      setNotice(null);
      setError(null);
      try {
        const res = await fetch(`/api/admin/jobs/${jobId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
        const json = await res.json();
        if (!res.ok) {
          setError(json.error ?? "Falha na ação.");
          return;
        }
        setNotice(json.data?.message ?? "Ação concluída.");
        await loadJobs();
        await loadSummary();
      } catch {
        setError("Erro de conexão.");
      } finally {
        setBusy(null);
      }
    },
    [loadJobs, loadSummary]
  );

  const removeJob = useCallback(
    async (jobId: string, title: string) => {
      if (!window.confirm(`Excluir a vaga "${title}"?`)) return;
      setBusy(`${jobId}:delete`);
      try {
        const res = await fetch(`/api/admin/jobs/${jobId}`, { method: "DELETE" });
        const json = await res.json();
        if (!res.ok) {
          setError(json.error ?? "Falha ao excluir.");
          return;
        }
        setNotice("Vaga excluída.");
        await loadJobs();
        await loadSummary();
      } finally {
        setBusy(null);
      }
    },
    [loadJobs, loadSummary]
  );

  const removeUser = useCallback(
    async (id: string, name: string) => {
      if (!window.confirm(`Excluir o usuário "${name}"?`)) return;
      try {
        const res = await fetch(`/api/admin/users?id=${id}`, { method: "DELETE" });
        const json = await res.json();
        if (!res.ok) {
          setError(json.error ?? "Falha ao excluir usuário.");
          return;
        }
        setNotice("Usuário excluído.");
        await loadUsers();
      } catch {
        setError("Erro de conexão.");
      }
    },
    [loadUsers]
  );

  const removeCompany = useCallback(
    async (id: string, name: string) => {
      if (!window.confirm(`Excluir a empresa "${name}" e todas as suas vagas?`)) return;
      try {
        const res = await fetch(`/api/admin/companies?id=${id}`, { method: "DELETE" });
        const json = await res.json();
        if (!res.ok) {
          setError(json.error ?? "Falha ao excluir empresa.");
          return;
        }
        setNotice("Empresa excluída.");
        await loadCompanies();
      } catch {
        setError("Erro de conexão.");
      }
    },
    [loadCompanies]
  );

  if (loading) {
    return (
      <div className="container">
        <div className="results-meta">Carregando…</div>
      </div>
    );
  }

  return (
    <div className="container">
      <section className="page-hero page-hero--compact">
        <h1>Administração</h1>
        <p>Receita, moderação de vagas, usuários e empresas da plataforma.</p>
      </section>

      {notice && <div className="alert">{notice}</div>}
      {error && <div className="alert alert--error">{error}</div>}

      <div className="admin-tabs" role="tablist" aria-label="Seções do admin">
        {(
          [
            ["overview", "Resumo"],
            ["jobs", "Vagas"],
            ["users", "Usuários"],
            ["companies", "Empresas"],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={`admin-tab ${tab === key ? "admin-tab--active" : ""}`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" && summary && (
        <section>
          <div className="stats-grid" aria-label="Receita">
            <div className="stat-card stat-card--highlight">
              <span className="stat-card__value">
                R$ {summary.revenue.total.toLocaleString("pt-BR")}
              </span>
              <span className="stat-card__label">Receita total</span>
            </div>
            <div className="stat-card">
              <span className="stat-card__value">
                R$ {summary.revenue.monthly.toLocaleString("pt-BR")}
              </span>
              <span className="stat-card__label">Receita nos últimos 30 dias</span>
            </div>
            <div className="stat-card">
              <span className="stat-card__value">{summary.revenue.paymentsCount}</span>
              <span className="stat-card__label">Pagamentos em dia</span>
            </div>
            <div className="stat-card">
              <span className="stat-card__value">{summary.counts.subscriptionsActive}</span>
              <span className="stat-card__label">Assinaturas ativas</span>
            </div>
          </div>

          <div className="stats-grid" aria-label="Plataforma">
            <div className="stat-card">
              <span className="stat-card__value">{summary.counts.companies}</span>
              <span className="stat-card__label">Empresas</span>
            </div>
            <div className="stat-card">
              <span className="stat-card__value">{summary.counts.candidates}</span>
              <span className="stat-card__label">Candidatos</span>
            </div>
            <div className="stat-card">
              <span className="stat-card__value">{summary.counts.candidatesWithProfile}</span>
              <span className="stat-card__label">Candidatos com perfil</span>
            </div>
            <div className="stat-card">
              <span className="stat-card__value">{summary.counts.jobsActive}</span>
              <span className="stat-card__label">Vagas ativas</span>
            </div>
            <div className="stat-card">
              <span className="stat-card__value">{summary.counts.jobsPending}</span>
              <span className="stat-card__label">Vagas pendentes</span>
            </div>
            <div className="stat-card">
              <span className="stat-card__value">{summary.counts.featured}</span>
              <span className="stat-card__label">Destaques</span>
            </div>
            <div className="stat-card">
              <span className="stat-card__value">{summary.counts.sponsored}</span>
              <span className="stat-card__label">Patrocinadas</span>
            </div>
            <div className="stat-card">
              <span className="stat-card__value">{summary.counts.views30d}</span>
              <span className="stat-card__label">Visualizações (30d)</span>
            </div>
          </div>

          <div className="section">
            <h2 className="section__title">Vagas por plano</h2>
            <div className="chart">
              {(["free", "destaque", "pro", "empresa"] as Plan[]).map((plan) => {
                const count = summary.counts.plans[plan] ?? 0;
                return (
                  <div className="chart__row" key={plan}>
                    <span className="chart__label">{PLAN_NAMES[plan]}</span>
                    <div className="chart__bar-track">
                      <div className="chart__bar" style={{ width: `${Math.min(100, (count / 40) * 100)}%` }} />
                    </div>
                    <span className="chart__value">{count} ativas</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {tab === "jobs" && (
        <section>
          <div className="admin-filters">
            <div className="field">
              <label className="sr-only" htmlFor="job-status">Status</label>
              <select
                id="job-status"
                value={filters.status}
                onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
              >
                <option value="">Todos os status</option>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="sr-only" htmlFor="job-q">Buscar</label>
              <input
                id="job-q"
                type="search"
                placeholder="Buscar por título ou empresa…"
                defaultValue={filters.q}
                onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value }))}
              />
            </div>
          </div>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Vaga</th>
                  <th>Plano</th>
                  <th>Status</th>
                  <th>Candidaturas</th>
                  <th>Views</th>
                  <th>Links</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id}>
                    <td>
                      <Link href={`/vagas/${job.id}`} className="table-link">
                        {job.title}
                      </Link>
                      <div className="table-sub">{job.company}</div>
                    </td>
                    <td className="table-plan">{job.planLabel}</td>
                    <td>
                      <span className={`status-chip status-chip--${job.status}`}>
                        {STATUS_LABELS[job.status] ?? job.status}
                      </span>
                    </td>
                    <td>{job.applications}</td>
                    <td>{job.views}</td>
                    <td>
                      {job.featured && <span className="tag">Destaque</span>}
                      {job.sponsored && <span className="tag tag--sponsored">Patrocinada</span>}
                    </td>
                    <td>
                      <div className="table-actions">
                        {job.status === "pending" && (
                          <button
                            type="button"
                            className="btn btn--primary btn--xs"
                            disabled={busy === `${job.id}:approve`}
                            onClick={() => actJob(job.id, "approve")}
                          >
                            Aprovar
                          </button>
                        )}
                        {job.status === "pending" && (
                          <button
                            type="button"
                            className="btn btn--ghost btn--xs"
                            disabled={busy === `${job.id}:reject`}
                            onClick={() => actJob(job.id, "reject")}
                          >
                            Recusar
                          </button>
                        )}
                        {job.status === "active" && !job.featured && (
                          <button type="button" className="btn btn--ghost btn--xs" onClick={() => actJob(job.id, "feature")}>
                            Destacar
                          </button>
                        )}
                        {job.featured && (
                          <button type="button" className="btn btn--ghost btn--xs" onClick={() => actJob(job.id, "unfeature")}>
                            Remover destaque
                          </button>
                        )}
                        {job.status === "active" && !job.sponsored && (
                          <button type="button" className="btn btn--ghost btn--xs" onClick={() => actJob(job.id, "sponsor")}>
                            Patrocinar
                          </button>
                        )}
                        {job.sponsored && (
                          <button type="button" className="btn btn--ghost btn--xs" onClick={() => actJob(job.id, "unsponsor")}>
                            Remover patrocínio
                          </button>
                        )}
                        {job.status === "active" && (
                          <button type="button" className="btn btn--ghost btn--xs" onClick={() => actJob(job.id, "pause")}>
                            Pausar
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn--danger btn--xs"
                          disabled={busy === `${job.id}:delete`}
                          onClick={() => removeJob(job.id, job.title)}
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
      )}

      {tab === "users" && (
        <section>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Papel</th>
                  <th>Conta criada em</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`status-chip status-chip--${u.role}`}>{u.role}</span>
                    </td>
                    <td>{u.createdAt ? new Date(u.createdAt).toLocaleDateString("pt-BR") : "—"}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn--danger btn--xs"
                        onClick={() => removeUser(u.id, u.name)}
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === "companies" && (
        <section>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th>Website</th>
                  <th>Conta criada em</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((c) => (
                  <tr key={c.id}>
                    <td className="company-row">
                      <span className="talent-avatar" style={{ backgroundColor: c.logoColor }}>
                        {c.name.slice(0, 2).toUpperCase()}
                      </span>
                      <span>{c.name}</span>
                    </td>
                    <td>
                      {c.website ? (
                        <a href={c.website} target="_blank" rel="noopener noreferrer" className="link">
                          {c.website}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>{new Date(c.createdAt).toLocaleDateString("pt-BR")}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn--danger btn--xs"
                        onClick={() => removeCompany(c.id, c.name)}
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}