"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { INTERVIEW_COUNT_OPTIONS } from "@/lib/interviewPlans";

const TYPES = [
  { id: "ai", label: "Com IA (mista)", hint: "Perguntas técnicas, práticas e teóricas + comportamentais." },
  { id: "technical", label: "Técnica", hint: "Foco em fundamentos e conceitos da stack da vaga." },
  { id: "practical", label: "Prática", hint: "Desafios de implementação e ferramentas." },
  { id: "theoretical", label: "Teórica", hint: "Arquitetura, trade-offs e boas práticas." },
];

export default function NovoInterviewsPage() {
  const router = useRouter();
  const [jobOptions, setJobOptions] = useState<Array<{ id: string; title: string }>>([]);
  const [resumeOptions, setResumeOptions] = useState<Array<{ id: string; title: string }>>([]);
  const [jobId, setJobId] = useState("");
  const [resumeId, setResumeId] = useState("");
  const [type, setType] = useState("ai");
  const [count, setCount] = useState(10);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/jobs", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setJobOptions((j.data ?? []).slice(0, 30).map((x: { id: string; title: string }) => ({ id: x.id, title: x.title }))))
      .catch(() => undefined);
    fetch("/api/me/resumes", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setResumeOptions(j.data?.items ?? []))
      .catch(() => undefined);
  }, []);

  const start = async () => {
    if (!jobId) return;
    setStarting(true);
    setError("");
    try {
      const res = await fetch("/api/ai/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          jobId,
          resumeId: resumeId || undefined,
          type,
          count,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Não foi possível iniciar a entrevista.");
        return;
      }
      router.push(`/interviews/play/${encodeURIComponent(json.data.interviewId)}`);
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="interviews-page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Nova entrevista com IA</h1>
          <p className="page-sub">
            Escolha uma vaga e o tipo de entrevista. As perguntas são geradas a partir da vaga e do seu currículo (se incluído).
          </p>
        </div>
      </div>

      <div className="app-card">
        <div className="form-row form-row--split">
          <label>
            Vaga
            <select value={jobId} onChange={(e) => setJobId(e.target.value)}>
              <option value="">Selecione uma vaga…</option>
              {jobOptions.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            Currículo (opcional)
            <select value={resumeId} onChange={(e) => setResumeId(e.target.value)}>
              <option value="">Nenhum</option>
              {resumeOptions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="form-row">
          <label>
            Número de perguntas
            <select value={count} onChange={(e) => setCount(Number(e.target.value))}>
              {INTERVIEW_COUNT_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c} perguntas
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="form-row">
          <label>Tipo de entrevista</label>
          <div className="track-picker">
            {TYPES.map((t) => (
              <button
                key={t.id}
                className={`track-pill ${type === t.id ? "track-pill--active" : ""}`}
                onClick={() => setType(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <p className="app-hint">{TYPES.find((t) => t.id === type)?.hint}</p>
        </div>

        {error && <div className="app-empty app-empty--error"><p>{error}</p></div>}

        <button className="btn btn--primary" onClick={start} disabled={!jobId || starting}>
          {starting ? "Preparando perguntas…" : "Iniciar entrevista"}
        </button>
      </div>
    </div>
  );
}