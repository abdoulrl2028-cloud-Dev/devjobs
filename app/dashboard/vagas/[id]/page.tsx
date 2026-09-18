"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/app-context";
import { APPLICATION_STAGES, STAGE_LABELS, type ApplicationStage, type Job } from "@/lib/types";

type Row = {
  id: string;
  candidateName: string;
  candidateEmail: string;
  candidateHeadline: string | null;
  candidateSkills: string[];
  stage: ApplicationStage;
  appliedVia: "manual" | "ai";
  analysisScore: number | null;
  resumeId: string | null;
  resumeTitle: string | null;
  resumeFilename: string | null;
  interviewId: string | null;
  interviewScore: number | null;
  interviewReport: {
    scores: string;
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
    feedback: string;
  } | null;
  consented: boolean;
  appliedAt: string;
};

function scoreTone(s: number): string {
  if (s >= 80) return "score-badge score-badge--high";
  if (s >= 60) return "score-badge score-badge--mid";
  return "score-badge score-badge--low";
}

export default function JobApplicationsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading } = useAuth();

  const [job, setJob] = useState<Job | null>(null);
  const [items, setItems] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [sending, setSending] = useState<string | null>(null);

  const load = useCallback(async () => {
    const jobId = params.id;
    try {
      const res = await fetch(`/api/company/jobs/${jobId}/applications`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Não foi possível carregar as candidaturas.");
        return;
      }
      setJob(json.data.job);
      setItems(json.data.items);
    } catch {
      setError("Erro de conexão.");
    }
  }, [params.id]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push(`/login?next=/dashboard/vagas/${params.id}`);
      return;
    }
    if (user.role !== "company") {
      router.push("/");
      return;
    }
    load();
  }, [user, loading, router, load, params.id]);

  async function move(id: string, stage: ApplicationStage) {
    setBusy(`${id}:stage`);
    try {
      const res = await fetch(`/api/company/jobs/${params.id}/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage }),
      });
      if (res.ok) {
        setItems((prev) => prev.map((r) => (r.id === id ? { ...r, stage } : r)));
      } else {
        const json = await res.json();
        setError(json.error ?? "Não foi possível mover o candidato.");
      }
    } catch {
      setError("Erro de conexão.");
    } finally {
      setBusy(null);
    }
  }

  async function sendMessage(id: string, body: string) {
    if (!body.trim()) return;
    setSending(id);
    setError(null);
    try {
      const res = await fetch(`/api/company/jobs/${params.id}/applications/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Não foi possível enviar a mensagem.");
        return;
      }
      setDraft((prev) => ({ ...prev, [id]: "" }));
      setOpen(null);
    } catch {
      setError("Erro de conexão.");
    } finally {
      setSending(null);
    }
  }

  if (loading) return <div className="app-loading" role="status"><span className="spinner" /></div>;
  if (error && !job) {
    return (
      <div className="page" style={{ padding: 24 }}>
        <p className="app-error">{error}</p>
        <Link href="/dashboard" className="btn btn--ghost">← Painel</Link>
      </div>
    );
  }

  const counts = APPLICATION_STAGES.reduce<Record<string, number>>((acc, s) => {
    acc[s] = items.filter((i) => i.stage === s).length;
    return acc;
  }, {});

  return (
    <div className="page" style={{ padding: 24 }}>
      <div className="page-head">
        <div>
          <h1 className="page-title">{job?.title}</h1>
          <p className="page-sub">
            Pipeline de candidaturas · {items.length} candidato(s)
            {job && (
              <Link href={`/vagas/${job.id}`} className="text-link" style={{ marginLeft: 10 }}>
                Ver vaga ↗
              </Link>
            )}
          </p>
          <Link href="/dashboard" className="btn btn--ghost btn--sm">← Painel</Link>
        </div>
      </div>

      {error && <p className="app-error">{error}</p>}

      {items.length === 0 ? (
        <div className="app-empty">
          <p>Nenhuma candidatura para esta vaga ainda.</p>
        </div>
      ) : (
        <div className="kanban">
          {APPLICATION_STAGES.map((stage) => (
            <div
              className={`kanban__col ${stage === "rejected" ? "kanban__col--rejected" : ""} ${stage === "hired" ? "kanban__col--hired" : ""}`}
              key={stage}
            >
              <div className="kanban__head">
                <strong>{STAGE_LABELS[stage]}</strong>
                <span className="kanban__count">{counts[stage]}</span>
              </div>
              <div className="kanban__body">
              {items.filter((i) => i.stage === stage).length === 0 && (
                <div className="kanban__empty">Nenhum candidato</div>
              )}
              {items
                .filter((i) => i.stage === stage)
                .map((item) => (
                  <div className="kanban-card" key={item.id}>
                    <button type="button" className="kanban-card__title" onClick={() => setOpen(open === item.id ? null : item.id)}>
                      {item.candidateName}
                    </button>
                    <div className="kanban-card__meta">
                      <span>{item.candidateHeadline ?? item.candidateEmail}</span>
                      {item.analysisScore !== null && <span className={scoreTone(item.analysisScore)} title="Análise IA">IA {item.analysisScore}</span>}
                      {item.interviewScore !== null && <span className={scoreTone(item.interviewScore)} title="Entrevista">{item.interviewScore}</span>}
                    </div>
                    <div className="kanban-card__meta">
                      <span className="status-chip status-chip--muted">
                        {item.appliedVia === "ai" ? "Candidatura com IA" : "Manual"}
                      </span>
                      <span>{new Date(item.appliedAt).toLocaleDateString("pt-BR")}</span>
                    </div>

                    <select
                      className="stage-select"
                      value={item.stage}
                      disabled={busy === `${item.id}:stage`}
                      onChange={(e) => void move(item.id, e.target.value as ApplicationStage)}
                    >
                      {APPLICATION_STAGES.map((s) => (
                        <option key={s} value={s}>{STAGE_LABELS[s]}</option>
                      ))}
                    </select>

                    {open === item.id && (
                      <div className="kanban-card__notes">
                        {!item.consented && (
                          <p className="lock-note">
                            🔒 O candidato ainda não autorizou o compartilhamento de currículo/entrevista
                            nem o contato da empresa.
                          </p>
                        )}
                        {item.candidateSkills.length > 0 && (
                          <div className="skill-tags">
                            {item.candidateSkills.slice(0, 8).map((s, i) => <span key={i}>{s}</span>)}
                          </div>
                        )}
                        {item.consented && item.resumeId && (
                          <a className="text-link" href={`/api/company/jobs/${params.id}/applications/${item.id}/resume`} target="_blank" rel="noreferrer">
                            Baixar currículo (PDF)
                          </a>
                        )}
                        {item.consented && item.interviewReport?.feedback && (
                          <div className="interview-report">
                            <strong>Entrevista ({item.interviewScore}/100)</strong>
                            <p>{item.interviewReport.feedback}</p>
                            {item.interviewReport.strengths.length > 0 && (
                              <ul className="small-list">
                                {item.interviewReport.strengths.map((s, i) => <li key={i}>{s}</li>)}
                              </ul>
                            )}
                          </div>
                        )}
                        {item.consented && (
                          <div className="kanban-notes-form">
                            <textarea
                              rows={3}
                              placeholder="Mensagem para o candidato (proposta, feedback, agendamento)..."
                              value={draft[item.id] ?? ""}
                              onChange={(e) => setDraft((prev) => ({ ...prev, [item.id]: e.target.value }))}
                            />
                            <button
                              type="button"
                              className="btn btn--primary btn--sm"
                              disabled={sending === item.id || !(draft[item.id] ?? "").trim()}
                              onClick={() => void sendMessage(item.id, draft[item.id] ?? "")}
                            >
                              {sending === item.id ? "Enviando…" : "Enviar mensagem"}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}