"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { Job, Resume } from "@/lib/types";

type Step = 1 | 2 | 3 | 4 | 5;

export default function CandidatarPage() {
  const params = useSearchParams();
  const router = useRouter();
  const jobId = params.get("jobId") ?? "";

  const [job, setJob] = useState<Job | null>(null);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [step, setStep] = useState<Step>(1);
  const [error, setError] = useState<string | null>(null);

  const [resumeId, setResumeId] = useState(params.get("resumeId") ?? "");
  const [analysis, setAnalysis] = useState<{ score: number; strengths: string[]; missing: string[] } | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [interviewId, setInterviewId] = useState<string | null>(null);
  const [interviewScore, setInterviewScore] = useState<number | null>(null);
  const [includeInterview, setIncludeInterview] = useState(false);
  const [consent, setConsent] = useState(false);
  const [consentSaving, setConsentSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const companyName = job?.company ?? "a empresa";

  const load = useCallback(async () => {
    if (!jobId) return setError("Selecione uma vaga para candidatura.");
    try {
      const [jobRes, interRes, consentRes] = await Promise.all([
        fetch(`/api/jobs/${encodeURIComponent(jobId)}`, { cache: "no-store" }),
        fetch(`/api/me/interviews/job?jobId=${encodeURIComponent(jobId)}`, { cache: "no-store" }),
        fetch("/api/me/consents", { cache: "no-store" }),
      ]);
      const job = (await jobRes.json()).data ?? null;
      if (!jobRes.ok || !job) {
        setError("Vaga não encontrada.");
        return;
      }
      setJob(job);
      const inter = (await interRes.json()).data?.interview ?? null;
      if (inter && inter.status === "completed") {
        setInterviewId(inter.id);
        setInterviewScore(inter.score);
        setIncludeInterview(true);
      }
      const consents = (await consentRes.json()).data?.items ?? [];
      const share = consents.find(
        (c: { type: string; target: string | null }) => c.type === "share_to_company" && c.target === job.companyId
      );
      setConsent(Boolean(share?.granted));

      const resumes = (await (await fetch("/api/me/resumes", { cache: "no-store" })).json()).data?.items ?? [];
      setResumes(resumes);
    } catch {
      setError("Erro de conexão ao carregar a candidatura.");
    }
  }, [jobId]);

  useEffect(() => {
    load();
  }, [load]);

  async function runAnalysis() {
    setAnalysisLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Não foi possível analisar.");
        return;
      }
      const a = json.data.analysis;
      setAnalysis({
        score: a.score,
        strengths: a.strengths ?? [],
        missing: a.requirementsMissing ?? [],
      });
    } catch {
      setError("Erro de conexão ao analisar.");
    } finally {
      setAnalysisLoading(false);
    }
  }

  async function toggleConsent(granted: boolean) {
    if (!job) return;
    setConsentSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/me/consents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "share_to_company", target: job.companyId, granted }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Não foi possível registrar o consentimento.");
        return;
      }
      setConsent(granted);
    } finally {
      setConsentSaving(false);
    }
  }

  async function submit() {
    if (!job) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/me/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: job.id,
          resumeId: resumeId || undefined,
          analysisScore: analysis?.score ?? undefined,
          interviewId: includeInterview && interviewId ? interviewId : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Não foi possível concluir a candidatura.");
        return;
      }
      setDone(true);
    } catch {
      setError("Erro de conexão ao concluir a candidatura.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!job && !error) return <div className="app-loading" role="status"><span className="spinner" /></div>;

  if (done) {
    return (
      <div className="app-card">
        <h3>🎉 Candidatura enviada</h3>
        <p className="app-hint">
          Sua candidatura para <strong>{job?.title}</strong> foi registrada com IA e a empresa foi notificada.
          Acompanhe pelas etapas do pipeline em "Minhas candidaturas".
        </p>
        <div className="form-actions">
          <Link href="/app/candidaturas" className="btn btn--primary">Ver minhas candidaturas</Link>
          <Link href={`/vagas/${job?.id}`} className="btn btn--ghost">Voltar para a vaga</Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-card">
        <h3>Candidatura com IA</h3>
        <p className="app-error">{error}</p>
        <div className="form-actions">
          <Link href="/app/vagas" className="btn btn--ghost">← Buscar vagas</Link>
          {jobId && <button className="btn btn--primary" onClick={load}>Tentar novamente</button>}
        </div>
      </div>
    );
  }

  const steps: Array<{ n: Step; label: string }> = [
    { n: 1, label: "Currículo" },
    { n: 2, label: "Análise IA" },
    { n: 3, label: "Entrevista" },
    { n: 4, label: "Consentimento" },
    { n: 5, label: "Confirmar" },
  ];

  if (!job) return null;

  const scoreTone = (s: number) => (s >= 80 ? "score-badge score-badge--high" : s >= 60 ? "score-badge score-badge--mid" : "score-badge score-badge--low");

  return (
    <div className="app-card">
      <h3>Candidatura com IA</h3>
      <p className="app-hint">
        <strong>{job?.title}</strong> · {job?.company}
      </p>

      <div className="wizard-steps">
        {steps.map((s) => (
          <button
            key={s.n}
            className={`wizard-step ${step === s.n ? "is-active" : ""} ${s.n < step ? "is-done" : ""}`}
            onClick={() => s.n < step && setStep(s.n)}
            disabled={s.n >= step && s.n !== step}
          >
            <span className="wizard-step__num">{s.n < step ? "✓" : s.n}</span>
            {s.label}
          </button>
        ))}
      </div>

      {step === 1 && (
        <section>
          <h4>Qual currículo usar nesta candidatura?</h4>
          {resumes.length === 0 ? (
            <div className="app-empty">
              <p>Você ainda não tem currículos salvos. Adicione seu CV em PDF primeiro.</p>
              <Link href="/app/curriculos" className="btn btn--primary">Adicionar currículo</Link>
            </div>
          ) : (
            <div className="resume-picker">
              {resumes.map((r) => (
                <label key={r.id} className={`resume-card ${resumeId === r.id ? "is-selected" : ""}`}>
                  <input
                    type="radio"
                    name="resume"
                    value={r.id}
                    checked={resumeId === r.id}
                    onChange={() => setResumeId(r.id)}
                  />
                  <strong>{r.title}</strong>
                  <span>{r.filename ?? (r.hasFile ? "PDF salvo" : "Extraído do texto")}</span>
                </label>
              ))}
            </div>
          )}
          <div className="form-actions">
            <button className="btn btn--primary" disabled={!resumeId} onClick={() => setStep(2)}>
              Continuar
            </button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section>
          <h4>Análise de compatibilidade com IA</h4>
          <p className="app-hint">
            Compara seu perfil e currículo com os requisitos da vaga. Usa sua cota de análises do plano.
          </p>
          {!analysis ? (
            <button className="btn btn--primary" onClick={runAnalysis} disabled={analysisLoading}>
              {analysisLoading ? "Analisando…" : "Analisar compatibilidade"}
            </button>
          ) : (
            <div className="analysis-result">
              <div className="analysis-result__head">
                <span className={scoreTone(analysis.score)}>{analysis.score}/100</span>
                <span>{analysis.score >= 80 ? "Excelente compatibilidade" : analysis.score >= 60 ? "Boa compatibilidade" : "Posição competitiva"}</span>
              </div>
              <div className="analysis-result__lists">
                <div>
                  <h5>Pontos fortes</h5>
                  <ul>
                    {analysis.strengths.length === 0 && <li>Perfil geral forte.</li>}
                    {analysis.strengths.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
                <div>
                  <h5>Gaps identificados</h5>
                  <ul>
                    {analysis.missing.length === 0 && <li>Nenhum gap relevante.</li>}
                    {analysis.missing.map((m, i) => <li key={i}>{m}</li>)}
                  </ul>
                </div>
              </div>
            </div>
          )}
          <div className="form-actions">
            <button className="btn btn--ghost" onClick={() => setStep(1)}>← Voltar</button>
            <button className="btn btn--primary" disabled={!analysis} onClick={() => setStep(3)}>
              Continuar
            </button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section>
          <h4>Entrevista técnica por vaga</h4>
          {interviewId ? (
            <div className="analysis-result">
              <p className="app-hint">
                Você já concluiu a entrevista desta vaga (score <strong>{interviewScore}/100</strong>). Ela será
                incluída na candidatura para a empresa.
              </p>
              <label className="consent-row">
                <input type="checkbox" checked={includeInterview} onChange={(e) => setIncludeInterview(e.target.checked)} />
                Incluir minha entrevista completa na candidatura.
              </label>
            </div>
          ) : (
            <div className="app-empty">
              <p>Você ainda não fez a entrevista desta vaga. Recomendamos completá-la para reforçar sua candidatura.</p>
              <Link className="btn btn--primary" href={`/app/entrevistas/play?jobId=${encodeURIComponent(job.id)}${resumeId ? `&resumeId=${encodeURIComponent(resumeId)}` : ""}`}>
                Iniciar entrevista simulada
              </Link>
            </div>
          )}
          <div className="form-actions">
            <button className="btn btn--ghost" onClick={() => setStep(2)}>← Voltar</button>
            <button className="btn btn--primary" onClick={() => setStep(4)}>Continuar</button>
          </div>
        </section>
      )}

      {step === 4 && (
        <section>
          <h4>Consentimento para compartilhar seus dados</h4>
          <p className="app-hint">
            Seu currículo, a análise de compatibilidade e (se incluída) a entrevista serão compartilhadas
            com <strong>{companyName}</strong> para avaliação desta candidatura.
          </p>
          <label className="consent-row">
            <input
              type="checkbox"
              checked={consent}
              disabled={consentSaving}
              onChange={(e) => toggleConsent(e.target.checked)}
            />
            Autorizo o compartilhamento e o contato da empresa sobre esta candidatura.
          </label>
          <p className="app-hint">Você pode revogar a qualquer momento nas configurações.</p>
          <div className="form-actions">
            <button className="btn btn--ghost" onClick={() => setStep(3)}>← Voltar</button>
            <button className="btn btn--primary" disabled={!consent} onClick={() => setStep(5)}>
              Continuar
            </button>
          </div>
        </section>
      )}

      {step === 5 && (
        <section>
          <h4>Revisão</h4>
          <ul className="review-list">
            <li><span>Vaga</span><strong>{job.title}</strong></li>
            <li><span>Empresa</span><strong>{job.company}</strong></li>
            <li><span>Currículo</span><strong>{resumes.find((r) => r.id === resumeId)?.title ?? "—"}</strong></li>
            <li><span>Análise de IA</span><strong>{analysis ? `${analysis.score}/100` : "não realizada"}</strong></li>
            <li>
              <span>Entrevista</span>
              <strong>{includeInterview && interviewId ? `${interviewScore}/100` : "não incluída"}</strong>
            </li>
            <li><span>Consentimento</span><strong>{consent ? "autorizado" : "—"}</strong></li>
          </ul>
          <div className="form-actions">
            <button className="btn btn--ghost" onClick={() => setStep(4)} disabled={submitting}>← Voltar</button>
            <button className="btn btn--primary" onClick={submit} disabled={submitting}>
              {submitting ? "Enviando…" : "Confirmar candidatura"}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}