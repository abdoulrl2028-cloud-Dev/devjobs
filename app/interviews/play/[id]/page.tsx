"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Question = { id: string; question: string; questionType: string; orderIndex: number };
type Detail = {
  item: {
    id: string;
    type: string;
    title: string | null;
    status: string;
  };
  questions: Question[];
  answers: Array<{ questionId: string | null; score: number | null }>;
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

type Feedback = {
  score: number;
  feedback: string;
  strengths: string[];
  missing_topics: string[];
  next_question: string | null;
};

const TYPE_LABEL: Record<string, string> = {
  ai: "Entrevista com IA",
  technical: "Entrevista técnica",
  practical: "Entrevista prática",
  theoretical: "Entrevista teórica",
};

export default function PlayInterviewPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/me/interviews/modern/${id}`, { cache: "no-store" });
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
    let cancelled = false;
    (async () => {
      const { id } = await params;
      if (cancelled) return;
      await load(id);
    })();
    return () => {
      cancelled = true;
    };
  }, [params, load]);

  const startedRef = useRef(false);
  useEffect(() => {
    if (loading || !detail || startedRef.current) return;
    if (detail.item.status === "completed") {
      router.replace(`/interviews/${detail.item.id}`);
      return;
    }
    if (detail.item.type === "company_online") {
      setError("Esta é uma entrevista online com a empresa. Use o link do convite na página da entrevista.");
      return;
    }
    const needStart = detail.questions.length === 0;
    if (needStart) {
      startedRef.current = true;
      (async () => {
        const res = await fetch("/api/ai/interview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "start", interviewId: detail.item.id }),
        });
        const json = await res.json();
        if (!res.ok) {
          setError(json.error ?? "Não foi possível preparar a entrevista.");
          return;
        }
        await load(detail.item.id);
      })();
    }
  }, [loading, detail, router, load]);

  if (loading) {
    return (
      <div className="app-loading">
        <span className="app-loading__spinner" />
        <p>Carregando entrevista…</p>
      </div>
    );
  }

  if (error || !detail || detail.questions.length === 0) {
    return (
      <div className="interviews-page">
        <div className="app-card">
          <div className="app-empty app-empty--error">
            <p>{error || "Nenhuma pergunta disponível para esta entrevista."}</p>
          </div>
          <button className="btn btn--ghost" onClick={() => router.push("/interviews")}>
            ← Voltar às entrevistas
          </button>
        </div>
      </div>
    );
  }

  return <Player key={detail.item.id} detail={detail} />;
}

function Player({ detail }: { detail: Detail }) {
  const router = useRouter();
  const questions = detail.questions;
  const answeredCount = detail.answers.filter((a) => a.questionId).length;
  const [idx, setIdx] = useState(() => Math.min(Math.max(answeredCount, 0), questions.length - 1));
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [result, setResult] = useState<Detail["result"]>(() =>
    detail.item.status === "completed" ? detail.result : null
  );
  const [seconds, setSeconds] = useState(120);

  const question = questions[idx];
  const isLast = idx === questions.length - 1;
  const finished = result !== null;

  const submit = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const answer = text.trim() || "Sem resposta";
      const res = await fetch("/api/ai/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "answer", interviewId: detail.item.id, questionId: question.id, answer }),
      });
      const json = await res.json();
      if (!res.ok) {
        window.alert(json.error ?? "Não foi possível enviar a resposta.");
        return;
      }
      setFeedback(json.data satisfies Feedback);
      setSeconds(120);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (finished || saving || feedback) return;
    if (seconds <= 0) {
      void submit();
      return;
    }
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds, finished, saving, feedback]);

  const advance = () => {
    if (idx < questions.length - 1) {
      setIdx((i) => i + 1);
      setText("");
      setFeedback(null);
      setSeconds(120);
    }
  };

  const finish = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/ai/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "finish", interviewId: detail.item.id }),
      });
      const json = await res.json();
      if (!res.ok) {
        window.alert(json.error ?? "Não foi possível finalizar.");
        return;
      }
      setResult(json.data);
      setFeedback(null);
    } finally {
      setSaving(false);
    }
  };

  if (finished && result) {
    return (
      <div className="interviews-page">
        <div className="app-card interview-result">
          <div className="interview-result__head">
            <span className="interview-sim__track">{TYPE_LABEL[detail.item.type] ?? "Entrevista"}</span>
            <h2>Entrevista concluída</h2>
            <p className="app-hint">Confira seu desempenho e dicas de estudo abaixo. A empresa pode ter acesso ao relatório se você consentir.</p>
          </div>
          <div className="interview-result__score">{result.overallScore}<small>/100</small></div>
          <div className="interview-result__grid">
            <div><span className="label">Técnica</span><strong>{result.technicalScore ?? "—"}</strong></div>
            <div><span className="label">Prática</span><strong>{result.practicalScore ?? "—"}</strong></div>
            <div><span className="label">Teórica</span><strong>{result.theoreticalScore ?? "—"}</strong></div>
            <div><span className="label">Comunicação</span><strong>{result.communicationScore ?? "—"}</strong></div>
          </div>
          <h4>Pontos fortes</h4>
          <ul className="interview-result__list">
            {result.strengths.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
          <h4>O que melhorar</h4>
          <ul className="interview-result__list">
            {result.improvements.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
          <h4>Dicas de estudo</h4>
          <ul className="interview-result__list">
            {result.studyTopics.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
          <div className="interview-result__actions">
            <button className="btn btn--ghost" onClick={() => router.push("/interviews")}>
              ← Voltar
            </button>
            <button className="btn btn--primary" onClick={() => router.push(`/interviews/${detail.item.id}`)}>
              Ver relatório completo
            </button>
          </div>
        </div>
      </div>
    );
  }

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div className="interviews-page">
      <div className="app-card interview-sim">
        <div className="interview-sim__head">
          <span className="interview-sim__track">{TYPE_LABEL[detail.item.type] ?? "Entrevista"}</span>
          <span>
            Pergunta {idx + 1} de {questions.length}
          </span>
          <span className={`interview-sim__timer ${seconds <= 30 ? "is-danger" : ""}`}>
            ⏱ {mm}:{ss}
          </span>
          <button className="btn btn--ghost btn--sm" onClick={() => { if (window.confirm("Cancelar a entrevista?")) router.push("/interviews"); }}>
            Cancelar
          </button>
        </div>

        <div className="interview-sim__progress">
          {questions.map((_, i) => (
            <span
              key={i}
              className={`interview-sim__bar ${i < idx ? "is-done" : ""} ${i === idx ? "is-current" : ""}`}
            />
          ))}
        </div>

        <h3 className="interview-sim__question">{question.question}</h3>

        {!feedback ? (
          <>
            <textarea
              className="interview-sim__answer"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              placeholder="Escreva sua resposta aqui. Inclua termos técnicos e, se possível, um exemplo real (contexto → solução → resultado)."
            />
            <div className="interview-sim__nav">
              <button className="btn btn--ghost" onClick={() => router.push("/interviews")}>
                Cancelar
              </button>
              <button className="btn btn--primary" onClick={() => submit()} disabled={saving || text.trim().length < 3}>
                {saving ? "Analisando…" : isLast ? "Responder e finalizar" : "Responder e avançar"}
              </button>
            </div>
          </>
        ) : (
          <div className="interview-sim__live">
            <span className="interview-live-score">
              {feedback.score}/100
            </span>
            <p className="interview-sim__feedback">{feedback.feedback}</p>
            {feedback.strengths.length > 0 && (
              <div className="interview-sim__terms">
                {feedback.strengths.map((s, i) => (
                  <span key={i} className="interview-sim__term">✓ {s}</span>
                ))}
              </div>
            )}
            {feedback.missing_topics.length > 0 && (
              <p className="app-hint">
                Tópicos não abordados: {feedback.missing_topics.join(", ")}.
              </p>
            )}
            {feedback.next_question && <p className="app-hint">💡 {feedback.next_question}</p>}
            <div className="interview-sim__nav">
              <button className="btn btn--ghost" onClick={() => router.push("/interviews")}>
                Cancelar
              </button>
              {isLast ? (
                <button className="btn btn--primary" onClick={finish} disabled={saving}>
                  {saving ? "Gerando relatório…" : "Finalizar entrevista"}
                </button>
              ) : (
                <button className="btn btn--primary" onClick={advance}>
                  Próxima pergunta →
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}