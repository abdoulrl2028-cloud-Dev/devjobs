"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type InterviewListItem = {
  id: string;
  type: string;
  companyName: string | null;
  candidateId: string | null;
  candidateName: string | null;
  jobId: string | null;
  jobTitle: string | null;
  title: string | null;
  scheduledAt: string | null;
  durationMinutes: number | null;
  meetingUrl: string | null;
  interviewerName: string | null;
  status: string;
  score: number | null;
  createdAt: string;
};

type Detail = {
  item: InterviewListItem;
  questions: Array<{ id: string; question: string; questionType: string; orderIndex: number }>;
  answers: Array<{ id: string; questionId: string | null; answerText: string | null; score: number | null; feedback: string | null }>;
  result: null | {
    technicalScore: number | null;
    practicalScore: number | null;
    theoreticalScore: number | null;
    communicationScore: number | null;
    overallScore: number;
    strengths: string[];
    improvements: string[];
    studyTopics: string[];
  };
};

type Job = { id: string; title: string; status: string };

const TYPE_OPTIONS = [
  { id: "company_online", label: "Online com a empresa" },
  { id: "technical", label: "Técnica" },
  { id: "practical", label: "Prática" },
  { id: "theoretical", label: "Teórica" },
  { id: "ai", label: "Com IA" },
];

const TYPE_LABEL: Record<string, string> = Object.fromEntries(TYPE_OPTIONS.map((t) => [t.id, t.label]));
const STATUS_LABEL: Record<string, string> = {
  scheduled: "Agendada",
  confirmed: "Confirmada",
  in_progress: "Em andamento",
  completed: "Concluída",
  cancelled: "Cancelada",
  no_show: "Não compareceu",
};

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function CompanyInterviewsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [interviews, setInterviews] = useState<InterviewListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [jobId, setJobId] = useState("");
  const [candidates, setCandidates] = useState<Array<{ id: string; name: string }>>([]);
  const [candidateId, setCandidateId] = useState("");
  const [type, setType] = useState("company_online");
  const [title, setTitle] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [duration, setDuration] = useState(45);
  const [meetingUrl, setMeetingUrl] = useState("");
  const [interviewerName, setInterviewerName] = useState("");
  const [creating, setCreating] = useState(false);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [busy, setBusy] = useState(false);
  const [rescheduleAt, setRescheduleAt] = useState("");

  const load = useCallback(async () => {
    try {
      const [statsRes, listRes] = await Promise.all([
        fetch("/api/company/stats", { cache: "no-store" }),
        fetch("/api/company/interviews", { cache: "no-store" }),
      ]);
      if (statsRes.status === 403) {
        setError("Acesso restrito a empresas. Faça login com uma conta de empresa.");
        return;
      }
      const stats = await statsRes.json();
      const list = await listRes.json();
      setJobs((stats.data?.jobs ?? []).map((j: Job) => ({ id: j.id, title: j.title, status: j.status })));
      setInterviews(list.data?.interviews ?? []);
    } catch {
      setError("Não foi possível carregar os dados.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!jobId) {
      setCandidates([]);
      return;
    }
    fetch(`/api/company/jobs/${jobId}/applications`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        const seen = new Set<string>();
        const opts: Array<{ id: string; name: string }> = [];
        for (const item of j.data?.items ?? []) {
          const cid = item.candidateId as string;
          if (cid && !seen.has(cid)) {
            seen.add(cid);
            opts.push({ id: cid, name: item.candidateName ?? cid });
          }
        }
        setCandidates(opts);
      })
      .catch(() => setCandidates([]));
  }, [jobId]);

  const openDetail = async (id: string) => {
    setActiveId(id);
    setDetail(null);
    const res = await fetch(`/api/company/interviews/${id}`, { cache: "no-store" });
    const json = await res.json();
    if (res.ok) {
      setDetail(json.data);
      setRescheduleAt(toLocalInput(json.data.item.scheduledAt));
    }
  };

  const create = async () => {
    if (!jobId || !candidateId || !scheduledAt) {
      setNotice("Selecione vaga, candidato e data/hora.");
      return;
    }
    setCreating(true);
    setNotice("");
    try {
      const res = await fetch("/api/company/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          candidateId,
          type,
          title: title || undefined,
          scheduledAt: new Date(scheduledAt).toISOString(),
          durationMinutes: duration,
          meetingUrl: meetingUrl || undefined,
          interviewerName: interviewerName || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setNotice(json.error ?? "Não foi possível agendar.");
        return;
      }
      setNotice("Convite enviado ao candidato.");
      setTitle("");
      setMeetingUrl("");
      await load();
      await openDetail(json.data.id);
    } finally {
      setCreating(false);
    }
  };

  const patch = async (payload: Record<string, unknown>) => {
    if (!activeId) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/company/interviews/${activeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        setNotice(json.error ?? "Não foi possível atualizar.");
        return;
      }
      await load();
      await openDetail(activeId);
    } finally {
      setBusy(false);
    }
  };

  const upcoming = useMemo(() => interviews.filter((i) => i.status !== "completed" && i.status !== "cancelled"), [interviews]);
  const past = useMemo(() => interviews.filter((i) => i.status === "completed" || i.status === "cancelled"), [interviews]);

  return (
    <div className="container">
      <section className="page-hero page-hero--compact">
        <div className="dashboard-head">
          <div>
            <h1>Entrevistas</h1>
            <p>Agende, reagende e acompanhe as respostas e relatórios das entrevistas.</p>
          </div>
          <Link href="/dashboard" className="btn btn--ghost">
            ← Voltar ao painel
          </Link>
        </div>
      </section>

      {error ? (
        <div className="empty">
          <p className="empty__title">{error}</p>
          <Link href="/login" className="btn btn--primary">Fazer login</Link>
        </div>
      ) : loading ? (
        <div className="results-meta">Carregando entrevistas…</div>
      ) : (
        <>
          <div className="app-card">
            <h3>Agendar entrevista</h3>
            <div className="form-row form-row--split">
              <label>
                Vaga
                <select value={jobId} onChange={(e) => { setJobId(e.target.value); setCandidateId(""); }}>
                  <option value="">Selecione uma vaga…</option>
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>{j.title}</option>
                  ))}
                </select>
              </label>
              <label>
                Candidato
                <select value={candidateId} onChange={(e) => setCandidateId(e.target.value)} disabled={!jobId}>
                  <option value="">{jobId ? "Selecione o candidato…" : "Escolha a vaga primeiro"}</option>
                  {candidates.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="form-row form-row--split">
              <label>
                Tipo
                <select value={type} onChange={(e) => setType(e.target.value)}>
                  {TYPE_OPTIONS.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </label>
              <label>
                Duração (min)
                <input type="number" min={15} max={240} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
              </label>
              <label>
                Data e hora
                <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
              </label>
            </div>
            <div className="form-row form-row--split">
              <label>
                Título (opcional)
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Entrevista técnica — etapa 2" />
              </label>
              <label>
                Entrevistador (opcional)
                <input type="text" value={interviewerName} onChange={(e) => setInterviewerName(e.target.value)} placeholder="Nome de quem conduz" />
              </label>
            </div>
            <div className="form-row">
              <label>
                Link da reunião (opcional)
                <input type="url" value={meetingUrl} onChange={(e) => setMeetingUrl(e.target.value)} placeholder="https://meet.google.com/…" />
              </label>
            </div>
            {notice && <p className="app-hint">{notice}</p>}
            <button className="btn btn--primary" onClick={create} disabled={creating}>
              {creating ? "Agendando…" : "Enviar convite"}
            </button>
          </div>

          <div className="interviews-history">
            <h3>Próximas ({upcoming.length})</h3>
            {upcoming.length === 0 ? (
              <div className="app-empty"><p>Nenhuma entrevista agendada.</p></div>
            ) : (
              <div className="interviews-grid">
                {upcoming.map((it) => (
                  <article key={it.id} className="app-card interview-card">
                    <div className="interview-card__head">
                      <h4>{it.title ?? it.jobTitle ?? "Entrevista"}</h4>
                      <span className="status-chip">{STATUS_LABEL[it.status] ?? it.status}</span>
                    </div>
                    <p className="interview-card__topic">
                      {TYPE_LABEL[it.type] ?? it.type}
                      {it.candidateName ? <> · 👤 {it.candidateName}</> : null}
                    </p>
                    {it.scheduledAt && (
                      <div className="interview-card__meta">
                        <span>📅 {new Date(it.scheduledAt).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                        {it.durationMinutes ? <span>⏱ {it.durationMinutes} min</span> : null}
                      </div>
                    )}
                    <div className="interview-card__actions">
                      <button className="btn btn--ghost btn--sm" onClick={() => openDetail(it.id)}>Ver detalhes</button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <div className="interviews-history">
            <h3>Histórico ({past.length})</h3>
            {past.length === 0 ? (
              <div className="app-empty"><p>Nenhuma entrevista concluída ou cancelada.</p></div>
            ) : (
              <div className="interviews-grid">
                {past.map((it) => (
                  <article key={it.id} className="app-card interview-card">
                    <div className="interview-card__head">
                      <h4>{it.title ?? it.jobTitle ?? "Entrevista"}</h4>
                      {it.score !== null ? (
                        <span className="interview-score">{it.score}<small>/100</small></span>
                      ) : (
                        <span className="status-chip status-chip--muted">{STATUS_LABEL[it.status] ?? it.status}</span>
                      )}
                    </div>
                    <p className="interview-card__topic">
                      {TYPE_LABEL[it.type] ?? it.type}
                      {it.candidateName ? <> · 👤 {it.candidateName}</> : null}
                    </p>
                    <div className="interview-card__actions">
                      <button className="btn btn--ghost btn--sm" onClick={() => openDetail(it.id)}>Ver detalhes</button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {activeId && (
        <div className="iv-modal" role="dialog" aria-modal="true">
          <div className="iv-modal__panel">
            <div className="iv-modal__head">
              <h3>{detail?.item.title ?? "Entrevista"}</h3>
              <button className="btn btn--ghost btn--sm" onClick={() => { setActiveId(null); setDetail(null); }}>Fechar</button>
            </div>

            {!detail ? (
              <p className="results-meta">Carregando detalhes…</p>
            ) : (
              <>
                <p className="app-hint">
                  {TYPE_LABEL[detail.item.type] ?? detail.item.type}
                  {detail.item.candidateName ? <> · 👤 {detail.item.candidateName}</> : null}
                  {detail.item.jobTitle ? <> · {detail.item.jobTitle}</> : null}
                  {" · "}<strong>{STATUS_LABEL[detail.item.status] ?? detail.item.status}</strong>
                </p>
                {detail.item.scheduledAt && (
                  <p className="app-hint">
                    📅 {new Date(detail.item.scheduledAt).toLocaleString("pt-BR", { dateStyle: "full", timeStyle: "short" })}
                    {detail.item.durationMinutes ? ` · ⏱ ${detail.item.durationMinutes} min` : ""}
                  </p>
                )}
                {detail.item.meetingUrl && (
                  <p className="app-hint">
                    Link: <a className="text-link" href={detail.item.meetingUrl} target="_blank" rel="noreferrer">{detail.item.meetingUrl}</a>
                  </p>
                )}

                <div className="form-row form-row--split">
                  <label>
                    Reagendar para
                    <input type="datetime-local" value={rescheduleAt} onChange={(e) => setRescheduleAt(e.target.value)} />
                  </label>
                  <div className="iv-modal__actions">
                    <button
                      className="btn btn--primary btn--sm"
                      disabled={busy || !rescheduleAt}
                      onClick={() => patch({ scheduledAt: new Date(rescheduleAt).toISOString() })}
                    >
                      Salvar nova data
                    </button>
                    <button className="btn btn--ghost btn--sm" disabled={busy} onClick={() => patch({ status: "completed" })}>
                      Marcar concluída
                    </button>
                    <button className="btn btn--danger btn--sm" disabled={busy} onClick={() => patch({ status: "cancelled" })}>
                      Cancelar
                    </button>
                  </div>
                </div>

                {detail.result && (
                  <div className="interview-result">
                    <div className="interview-result__score">{detail.result.overallScore}<small>/100</small></div>
                    <div className="interview-result__grid">
                      <div><span className="label">Técnica</span><strong>{detail.result.technicalScore ?? "—"}</strong></div>
                      <div><span className="label">Prática</span><strong>{detail.result.practicalScore ?? "—"}</strong></div>
                      <div><span className="label">Teórica</span><strong>{detail.result.theoreticalScore ?? "—"}</strong></div>
                      <div><span className="label">Comunicação</span><strong>{detail.result.communicationScore ?? "—"}</strong></div>
                    </div>
                  </div>
                )}

                <h4>Respostas ({detail.answers.length}/{detail.questions.length})</h4>
                {detail.answers.length === 0 ? (
                  <div className="app-empty"><p>O candidato ainda não respondeu.</p></div>
                ) : (
                  detail.answers.map((a, i) => {
                    const q = detail.questions.find((x) => x.id === a.questionId);
                    return (
                      <div key={a.id} className="interview-qa">
                        <div className="interview-card__head">
                          <h4>Pergunta {i + 1}{q ? <>: {q.question}</> : null}</h4>
                          {a.score !== null && <span className="interview-score">{a.score}<small>/100</small></span>}
                        </div>
                        <p className="interview-qa__answer">{a.answerText}</p>
                        {a.feedback && <p className="app-hint">{a.feedback}</p>}
                      </div>
                    );
                  })
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}