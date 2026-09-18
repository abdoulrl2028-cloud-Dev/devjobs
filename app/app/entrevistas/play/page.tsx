"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Interview } from "@/lib/types";

type Phase = "loading" | "setup" | "playing" | "report";
type Report = {
  score: number;
  metrics: { technical: number; communication: number; clarity: number; experience: number; problemSolving: number };
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  feedback: string;
};

const TIME_PER_QUESTION = 120;

export default function InterviewPlayPage() {
  const params = useSearchParams();
  const jobId = params.get("jobId") ?? "";
  const resumeId = params.get("resumeId") ?? "";

  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [interview, setInterview] = useState<Interview | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [current, setCurrent] = useState(0);
  const [remaining, setRemaining] = useState(TIME_PER_QUESTION);
  const [grading, setGrading] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  const setup = useCallback(async () => {
    if (!jobId) {
      setError("Selecione uma vaga para esta entrevista.");
      setPhase("setup");
      return;
    }
    setError(null);
    try {
      let it: Interview | null = null;
      const resumeRes = await fetch(`/api/me/interviews/job?jobId=${encodeURIComponent(jobId)}`, { cache: "no-store" });
      const json = await resumeRes.json();
      const existing = json.data?.interview ?? null;
      if (existing && existing.status === "in_progress") {
        it = existing;
      } else {
        const start = await fetch("/api/me/interviews/job", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "start", jobId, resumeId: resumeId || undefined }),
        });
        const sj = await start.json();
        if (!start.ok) {
          setError(sj.error ?? "Não foi possível iniciar a entrevista.");
          setPhase("setup");
          return;
        }
        it = sj.data.interview;
      }
      const interviewData = it;
      if (!interviewData) {
        setError("Não foi possível carregar a entrevista.");
        setPhase("setup");
        return;
      }
      setInterview(interviewData);
      setAnswers(new Array(interviewData.questions.length).fill(""));
      setCurrent(0);
      setRemaining(TIME_PER_QUESTION);
      setPhase("playing");
    } catch {
      setError("Erro de conexão ao iniciar a entrevista.");
      setPhase("setup");
    }
  }, [jobId, resumeId]);

  useEffect(() => {
    setup();
    return clearTimer;
  }, [setup, clearTimer]);

  useEffect(() => {
    if (phase !== "playing") return;
    timerRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearTimer();
          setCurrent((c) => c + 1);
          setRemaining(TIME_PER_QUESTION);
          return TIME_PER_QUESTION;
        }
        return prev - 1;
      });
    }, 1000);
    return clearTimer;
  }, [phase, current, clearTimer]);

  useEffect(() => {
    if (phase === "playing") inputRef.current?.focus();
  }, [current, phase]);

  const questions = interview?.questions ?? [];

  function saveAnswer(value: string) {
    setAnswers((prev) => prev.map((a, i) => (i === current ? value : a)));
  }

  function next() {
    clearTimer();
    if (current + 1 < questions.length) {
      setCurrent((c) => c + 1);
      setRemaining(TIME_PER_QUESTION);
    } else {
      void finish();
    }
  }

  async function finish() {
    setMessage(null);
    if (answers.some((a) => !a.trim())) {
      setMessage("Responda todas as perguntas antes de finalizar (acompanhe o cronômetro).");
      return;
    }
    setGrading(true);
    try {
      const res = await fetch("/api/me/interviews/job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "finish", jobId, questions, answers }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage(json.error ?? "Não foi possível gerar o relatório.");
        return;
      }
      setReport(json.data.report);
      setPhase("report");
    } catch {
      setMessage("Erro de conexão ao finalizar a entrevista.");
    } finally {
      setGrading(false);
    }
  }

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  if (phase === "loading") {
    return <div className="app-loading" role="status"><span className="spinner" /> Preparando entrevista…</div>;
  }

  if (phase === "setup") {
    return (
      <div className="app-card">
        <h3>Entrevista por vaga</h3>
        {error && <p className="app-error">{error}</p>}
        <p className="app-hint">Selecione uma vaga para a entrevista ou retorne ao histórico.</p>
        <Link href="/app/entrevistas" className="btn btn--ghost">← Voltar para entrevistas</Link>
      </div>
    );
  }

  if (phase === "report" && report) {
    const metricRows: Array<[string, string, number]> = [
      ["Técnica", "technical", report.metrics.technical],
      ["Comunicação", "communication", report.metrics.communication],
      ["Clareza", "clarity", report.metrics.clarity],
      ["Experiência", "experience", report.metrics.experience],
      ["Resolução de problemas", "problemSolving", report.metrics.problemSolving],
    ];
    return (
      <div className="app-card interview-report">
        <div className="interview-report__head">
          <div>
            <h3>Relatório da entrevista</h3>
            <p className="app-hint">{interview?.topic}</p>
          </div>
          <div className="interview-score interview-score--big" title={`Score: ${report.score}/100`}>
            {report.score}
            <small>/100</small>
          </div>
        </div>
        <p className="interview-report__feedback">{report.feedback}</p>

        <div className="interview-report__metrics">
          {metricRows.map(([label, key, value]) => (
            <div key={key} className="metric">
              <div className="metric__head">
                <span>{label}</span>
                <strong>{value}/100</strong>
              </div>
              <div className="metric__bar">
                <span className="metric__fill" style={{ width: `${value}%` }} />
              </div>
            </div>
          ))}
        </div>

        <div className="interview-report__lists">
          <div>
            <h4>Pontos fortes</h4>
            <ul>
              {report.strengths.length === 0 && <li>—</li>}
              {report.strengths.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
          <div>
            <h4>A melhorar</h4>
            <ul>
              {report.weaknesses.length === 0 && <li>—</li>}
              {report.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </div>
          <div>
            <h4>Recomendações</h4>
            <ul>
              {report.recommendations.length === 0 && <li>—</li>}
              {report.recommendations.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </div>
        </div>

        <div className="form-actions">
          <Link href="/app/entrevistas" className="btn btn--ghost">← Histórico</Link>
          <button className="btn btn--primary" onClick={() => { setReport(null); setup(); }}>
            Refazer entrevista
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-card interview-sim">
      <div className="interview-sim__head">
        <span className="interview-sim__track">Entrevista por vaga</span>
        <span>
          Pergunta {current + 1} de {questions.length}
        </span>
        <span className={`interview-timer ${remaining <= 15 ? "interview-timer--warn" : ""}`}>
          ⏱ {mm}:{ss}
        </span>
      </div>

      <div className="interview-sim__progress">
        {questions.map((_, i) => (
          <span
            key={i}
            className={`interview-sim__bar ${i < current ? "is-done" : ""} ${i === current ? "is-current" : ""}`}
          />
        ))}
      </div>

      <div className="interview-chat">
        {questions.slice(0, current).map((q, i) => (
          <div key={i} className="interview-chat__row">
            <div className="interview-chat__q">
              <strong>Pergunta {i + 1}:</strong> {q}
            </div>
            <div className="interview-chat__a">{answers[i]}</div>
          </div>
        ))}
      </div>

      <div className="interview-chat__row">
        <div className="interview-chat__q">
          <strong>Pergunta {current + 1}:</strong> {questions[current]}
        </div>
        <textarea
          ref={inputRef}
          value={answers[current] ?? ""}
          onChange={(e) => saveAnswer(e.target.value)}
          rows={5}
          placeholder="Responda por escrito com calma. Tente estruturar: contexto → solução → resultado."
          className="interview-chat__input"
        />
      </div>

      {message && <p className="app-error">{message}</p>}

      <div className="form-actions">
        <Link href="/app/entrevistas" className="btn btn--ghost">
          Cancelar
        </Link>
        <button className="btn btn--primary" onClick={next} disabled={grading || !answers[current]?.trim()}>
          {grading ? "Gerando relatório…" : current + 1 < questions.length ? "Responder e avançar" : "Finalizar e gerar relatório"}
        </button>
      </div>
    </div>
  );
}