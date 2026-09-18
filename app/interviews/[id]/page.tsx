"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Question = { id: string; question: string; questionType: string; orderIndex: number };
type Detail = {
  item: {
    id: string;
    type: string;
    title: string | null;
    companyName: string | null;
    jobTitle: string | null;
    jobId: string | null;
    scheduledAt: string | null;
    durationMinutes: number | null;
    meetingUrl: string | null;
    interviewerName: string | null;
    status: string;
    score: number | null;
    createdAt: string;
  };
  questions: Question[];
  answers: Array<{ id: string; questionId: string | null; answerText: string | null; score: number | null; feedback: string | null; createdAt: string }>;
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

const TYPE_LABEL: Record<string, string> = {
  ai: "Com IA",
  technical: "Técnica",
  practical: "Prática",
  theoretical: "Teórica",
  company_online: "Online com a empresa",
};

const STATUS_LABEL: Record<string, string> = {
  scheduled: "Agendada",
  confirmed: "Confirmada",
  in_progress: "Em andamento",
  completed: "Concluída",
  cancelled: "Cancelada",
  no_show: "Não compareceu",
};

export default function InterviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [id, setId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { id: interviewId } = await params;
      if (cancelled) return;
      setId(interviewId);
    })();
    return () => {
      cancelled = true;
    };
  }, [params]);

  const load = useCallback(async (interviewId: string) => {
    try {
      const res = await fetch(`/api/me/interviews/modern/${interviewId}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Entrevista não encontrada.");
        return;
      }
      setDetail(json.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (id) load(id);
  }, [id, load]);

  const patch = async (status: "confirmed" | "cancelled") => {
    if (!id) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/me/interviews/modern/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!res.ok) {
        window.alert(json.error ?? "Não foi possível atualizar.");
        return;
      }
      await load(id);
    } finally {
      setBusy(false);
    }
  };

  const start = async () => {
    if (!id) return;
    setBusy(true);
    try {
      const res = await fetch("/api/ai/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", interviewId: id }),
      });
      const json = await res.json();
      if (!res.ok) {
        window.alert(json.error ?? "Não foi possível iniciar.");
        return;
      }
      router.push(`/interviews/play/${id}`);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="app-loading">
        <span className="app-loading__spinner" />
        <p>Carregando entrevista…</p>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="interviews-page">
        <div className="app-card">
          <div className="app-empty app-empty--error"><p>{error || "Entrevista não encontrada."}</p></div>
          <button className="btn btn--ghost" onClick={() => router.push("/interviews")}>← Voltar</button>
        </div>
      </div>
    );
  }

  const it = detail.item;
  const isScheduled = it.status === "scheduled" || it.status === "confirmed";
  const canStartSelfServe = it.type !== "company_online" && (isScheduled || it.status === "in_progress");

  return (
    <div className="interviews-page">
      <div className="page-head">
        <div>
          <h1 className="page-title">{it.title ?? "Entrevista"}</h1>
          <p className="page-sub">
            {TYPE_LABEL[it.type] ?? it.type}
            {it.companyName ? <> · {it.companyName}</> : null}
            {it.jobTitle ? <> · {it.jobTitle}</> : null}
            {it.interviewerName ? <> · 🧑‍💼 {it.interviewerName}</> : null}
          </p>
        </div>
        <Link href="/interviews" className="btn btn--ghost">← Voltar</Link>
      </div>

      <div className="app-card">
        <div className="interview-card__head">
          <h4>Status</h4>
          <span className={`status-chip ${it.status === "cancelled" ? "status-chip--muted" : ""}`}>
            {STATUS_LABEL[it.status] ?? it.status}
          </span>
        </div>
        {it.scheduledAt && (
          <div className="interview-card__meta">
            <span>📅 {new Date(it.scheduledAt).toLocaleString("pt-BR", { dateStyle: "full", timeStyle: "short" })}</span>
            {it.durationMinutes ? <span>⏱ {it.durationMinutes} min</span> : null}
          </div>
        )}
        {it.meetingUrl && (
          <p className="app-hint">
            Link da reunião: <a className="text-link" href={it.meetingUrl} target="_blank" rel="noreferrer">{it.meetingUrl}</a>
          </p>
        )}
        <div className="interview-card__actions">
          {isScheduled && it.status !== "cancelled" && (
            <>
              <button className="btn btn--primary btn--sm" onClick={() => patch("confirmed")} disabled={busy || it.status === "confirmed"}>
                {it.status === "confirmed" ? "✓ Confirmada" : "Confirmar presença"}
              </button>
              <button className="btn btn--ghost btn--sm" onClick={() => patch("cancelled")} disabled={busy}>
                Cancelar
              </button>
            </>
          )}
          {canStartSelfServe && (
            <button className="btn btn--primary btn--sm" onClick={start} disabled={busy}>
              {it.status === "in_progress" ? "Continuar" : "Iniciar entrevista"}
            </button>
          )}
          {it.type === "company_online" && it.meetingUrl && (
            <a className="btn btn--primary btn--sm" href={it.meetingUrl} target="_blank" rel="noreferrer">
              Entrar na reunião
            </a>
          )}
        </div>
      </div>

      {it.status === "completed" && it.score !== null && (
        <div className="app-card interview-result">
          <div className="interview-result__head">
            <h2>Relatório de desempenho</h2>
            <p className="app-hint">Nota geral calculada a partir das perguntas respondidas.</p>
          </div>
          <div className="interview-result__score">{it.score}<small>/100</small></div>
          {detail.result && (
            <>
              <div className="interview-result__grid">
                <div><span className="label">Técnica</span><strong>{detail.result.technicalScore ?? "—"}</strong></div>
                <div><span className="label">Prática</span><strong>{detail.result.practicalScore ?? "—"}</strong></div>
                <div><span className="label">Teórica</span><strong>{detail.result.theoreticalScore ?? "—"}</strong></div>
                <div><span className="label">Comunicação</span><strong>{detail.result.communicationScore ?? "—"}</strong></div>
              </div>
              <h4>Pontos fortes</h4>
              <ul className="interview-result__list">
                {detail.result.strengths.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
              <h4>O que melhorar</h4>
              <ul className="interview-result__list">
                {detail.result.improvements.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
              <h4>Dicas de estudo</h4>
              <ul className="interview-result__list">
                {detail.result.studyTopics.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </>
          )}
        </div>
      )}

      {detail.questions.length > 0 && (
        <div className="app-card">
          <h3>Respostas ({detail.answers.length}/{detail.questions.length})</h3>
          {detail.answers.length === 0 ? (
            <div className="app-empty"><p>Nenhuma resposta registrada ainda.</p></div>
          ) : (
            detail.answers.map((a, i) => {
              const q = detail.questions.find((x) => x.id === a.questionId);
              return (
                <div key={a.id} className="interview-qa">
                  <div className="interview-card__head">
                    <h4>Pergunta {i + 1}{q ? <>: {q.question}</> : null}</h4>
                    {a.score !== null && (
                      <span className={`interview-score ${a.score < 60 ? "is-low" : ""}`}>
                        {a.score}<small>/100</small>
                      </span>
                    )}
                  </div>
                  <p className="interview-qa__answer">{a.answerText}</p>
                  {a.feedback && <p className="app-hint">{a.feedback}</p>}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}