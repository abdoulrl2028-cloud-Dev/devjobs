"use client";

import { useCallback, useEffect, useState } from "react";
import { INTERVIEW_TRACK_LABELS, type Interview, type InterviewTrack } from "@/lib/types";
import { TRACK_QUESTIONS, analyzeAnswer, trackFeedback } from "@/lib/interview";

type InterviewItem = Interview;

const TRACKS = Object.keys(TRACK_QUESTIONS) as InterviewTrack[];

type AnswerState = Record<number, string>;

export default function EntrevistasPage() {
  const [items, setItems] = useState<InterviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [track, setTrack] = useState<InterviewTrack>("frontend");
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<AnswerState>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/me/interviews", { cache: "no-store" });
    if (!res.ok) return;
    const json = await res.json();
    setItems(json.data.items ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const questions = TRACK_QUESTIONS[track].slice(0, 4);
  const current = questions[step];

  const start = () => {
    setAnswers({});
    setStep(0);
    setActive(true);
  };

  const cancel = () => {
    setActive(false);
    setAnswers({});
    setStep(0);
  };

  const next = () => {
    if (step < questions.length - 1) setStep((s) => s + 1);
  };

  const prev = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  const finish = async () => {
    setSaving(true);
    const anws = questions.map((_, i) => answers[i] ?? "");
    const scores = questions.map((q, i) => analyzeAnswer(track, q, anws[i] ?? ""));
    const finalScore = Math.round(scores.reduce((a, b) => a + b.score, 0) / scores.length);
    const metrics = {
      technical: finalScore,
      communication: Math.round(
        (anws.reduce((a, t) => a + Math.min(100, t.split(" ").filter(Boolean).length * 2), 0) / questions.length)
      ),
      clarity: Math.round(scores.reduce((a, s) => a + s.score, 0) / scores.length),
      experience: Math.round(
        (anws.reduce((a, t) => a + (/\b(utilizei|implementei|criei|desenvolvi|projeto|resolvi)\b/i.test(t) ? 100 : 40), 0) / questions.length)
      ),
      problemSolving: Math.round(
        (anws.reduce((a, t) => a + (/\b(solucao|solução|por exemplo|etapas|passos|analyse|avaliei)\b/i.test(t) ? 100 : 45), 0) / questions.length)
      ),
    };
    const res = await fetch("/api/me/interviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        track,
        topic: INTERVIEW_TRACK_LABELS[track],
        questions,
        answers: anws,
        score: finalScore,
        metrics,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setActive(false);
      setAnswers({});
      setStep(0);
      load();
    }
  };

  return (
    <div className="interviews-page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Entrevistas simuladas</h1>
          <p className="page-sub">
            Pratique com perguntas técnicas por área. Responda por escrito e receba um score com feedback instantâneo.
          </p>
        </div>
      </div>

      {!active ? (
        <>
          <div className="app-card">
            <h3>Começar nova entrevista</h3>
            <div className="track-picker">
              {TRACKS.map((t) => (
                <button
                  key={t}
                  className={`track-pill ${track === t ? "track-pill--active" : ""}`}
                  onClick={() => setTrack(t)}
                >
                  {INTERVIEW_TRACK_LABELS[t]}
                </button>
              ))}
            </div>
            <p className="app-hint">
              {questions.length} perguntas · respostas escritas · avaliação técnica + comunicação + experiência.
            </p>
            <button className="btn btn--primary" onClick={start}>
              Iniciar simulação
            </button>
          </div>

          <div className="interviews-history">
            <h3>Histórico ({items.length})</h3>
            {items.length === 0 ? (
              <div className="app-empty">
                <p>Você ainda não fez nenhuma simulação.</p>
              </div>
            ) : (
              <div className="interviews-grid">
                {items.map((it) => (
                  <article key={it.id} className="app-card interview-card">
                    <div className="interview-card__head">
                      <h4>{INTERVIEW_TRACK_LABELS[it.track]}</h4>
                      <span className="interview-score" title={`Score: ${it.score}/100`}>
                        {it.score}
                        <small>/100</small>
                      </span>
                    </div>
                    <p className="interview-card__topic">{it.topic}</p>
                    <div className="interview-card__meta">
                      <span>{new Date(it.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}</span>
                      <span>{it.questions.length} perguntas</span>
                    </div>
                    <div className="interview-card__metrics">
                      <span title="Técnica">🧠 {it.metrics.technical}</span>
                      <span title="Comunicação">💬 {it.metrics.communication}</span>
                      <span title="Experiência">💼 {it.metrics.experience}</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="app-card interview-sim">
          <div className="interview-sim__head">
            <span className="interview-sim__track">{INTERVIEW_TRACK_LABELS[track]}</span>
            <span>
              Pergunta {step + 1} de {questions.length}
            </span>
            <button className="btn btn--ghost btn--sm" onClick={cancel}>
              Cancelar
            </button>
          </div>

          <div className="interview-sim__progress">
            {questions.map((_, i) => (
              <span
                key={i}
                className={`interview-sim__bar ${i < step || answers[i] !== undefined ? "is-done" : ""} ${i === step ? "is-current" : ""}`}
              />
            ))}
          </div>

          <h3 className="interview-sim__question">{current}</h3>
          <textarea
            className="interview-sim__answer"
            value={answers[step] ?? ""}
            onChange={(e) => setAnswers((prev) => ({ ...prev, [step]: e.target.value }))}
            rows={6}
            placeholder="Escreva sua resposta aqui. Inclua termos técnicos e, se possível, um exemplo real (contexto → solução → resultado)."
          />

          {answers[step] && (
            <div className="interview-sim__live">
              {(() => {
                const a = analyzeAnswer(track, current, answers[step] ?? "");
                const fb = trackFeedback(a.score);
                return (
                  <>
                    <span className="interview-live-score">{fb.label} · {a.score}/100</span>
                    {a.coverage.length > 0 && (
                      <span className="interview-live-terms">
                        Termos cobertos: {a.coverage.slice(0, 5).join(", ")}
                      </span>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          <div className="interview-sim__nav">
            <button className="btn btn--ghost" onClick={prev} disabled={step === 0}>
              ← Anterior
            </button>
            {step < questions.length - 1 ? (
              <button className="btn btn--primary" onClick={next} disabled={!answers[step]?.trim()}>
                Próxima →
              </button>
            ) : (
              <button className="btn btn--primary" onClick={finish} disabled={saving || Object.values(answers).some((a) => !a?.trim())}>
                {saving ? "Salvando…" : "Finalizar e ver score"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}