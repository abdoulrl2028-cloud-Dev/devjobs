"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { InterviewListItem } from "@/lib/db/interviews";

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

export default function InterviewsHubPage() {
  const [items, setItems] = useState<InterviewListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/me/interviews/modern", { cache: "no-store" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? "Não foi possível carregar as entrevistas.");
        return;
      }
      const json = await res.json();
      setItems(json.data.interviews ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const scheduled = items.filter((i) => i.scheduledAt || i.status === "scheduled" || i.status === "confirmed");
  const running = items.filter((i) => i.status === "in_progress");
  const history = items.filter((i) => i.status === "completed" || i.status === "cancelled" || i.status === "no_show");

  return (
    <div className="interviews-page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Entrevistas</h1>
          <p className="page-sub">
            Pratique com entrevistas por vaga, responda perguntas técnicas, práticas e teóricas e receba relatórios com pontuação por área.
          </p>
        </div>
        <Link href="/interviews/novo" className="btn btn--primary">
          Nova entrevista com IA
        </Link>
      </div>

      {error && <div className="app-empty app-empty--error"><p>{error}</p></div>}
      {loading && (
        <div className="app-loading">
          <span className="app-loading__spinner" />
        </div>
      )}
      {!loading && !error && (
        <>
          <div className="interviews-history">
            <h3>Agendadas ({scheduled.length})</h3>
            {scheduled.length === 0 ? (
              <div className="app-empty">
                <p>Nenhuma entrevista agendada por enquanto.</p>
              </div>
            ) : (
              <div className="interviews-grid">
                {scheduled.map((it) => (
                  <article key={it.id} className="app-card interview-card">
                    <div className="interview-card__head">
                      <h4>{it.title ?? it.jobTitle ?? "Entrevista"}</h4>
                      <span className={`status-chip ${it.status === "cancelled" ? "status-chip--muted" : ""}`}>
                        {STATUS_LABEL[it.status] ?? it.status}
                      </span>
                    </div>
                    <p className="interview-card__topic">
                      {TYPE_LABEL[it.type] ?? it.type}
                      {it.jobTitle ? <> · {it.jobTitle}</> : null}
                      {it.companyName ? <> · {it.companyName}</> : null}
                    </p>
                    {it.scheduledAt && (
                      <div className="interview-card__meta">
                        <span>
                          📅 {new Date(it.scheduledAt).toLocaleString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {it.durationMinutes ? <span>⏱ {it.durationMinutes} min</span> : null}
                      </div>
                    )}
                    <div className="interview-card__actions">
                      <Link className="btn btn--ghost btn--sm" href={`/interviews/${it.id}`}>
                        Ver detalhes
                      </Link>
                      {it.type === "company_online" && it.meetingUrl && it.status !== "cancelled" ? (
                        <a className="btn btn--primary btn--sm" href={it.meetingUrl} target="_blank" rel="noreferrer">
                          Entrar na reunião
                        </a>
                      ) : it.type !== "company_online" && (it.status === "scheduled" || it.status === "confirmed" || it.status === "in_progress") ? (
                        <Link className="btn btn--primary btn--sm" href={`/interviews/play/${it.id}`}>
                          {it.status === "in_progress" ? "Continuar" : "Iniciar entrevista"}
                        </Link>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <div className="interviews-history">
            <h3>Em andamento ({running.length})</h3>
            {running.length === 0 ? (
              <div className="app-empty">
                <p>Nenhuma entrevista em andamento.</p>
              </div>
            ) : (
              <div className="interviews-grid">
                {running.map((it) => (
                  <article key={it.id} className="app-card interview-card">
                    <div className="interview-card__head">
                      <h4>{it.title ?? it.jobTitle ?? "Entrevista"}</h4>
                      <span className="status-chip">{STATUS_LABEL[it.status] ?? it.status}</span>
                    </div>
                    <p className="interview-card__topic">{TYPE_LABEL[it.type] ?? it.type}</p>
                    <div className="interview-card__actions">
                      <Link className="btn btn--primary btn--sm" href={`/interviews/play/${it.id}`}>
                        Continuar entrevista
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <div className="interviews-history">
            <h3>Histórico ({history.length})</h3>
            {history.length === 0 ? (
              <div className="app-empty">
                <p>Você ainda não concluiu nenhuma entrevista.</p>
              </div>
            ) : (
              <div className="interviews-grid">
                {history.map((it) => (
                  <article key={it.id} className="app-card interview-card">
                    <div className="interview-card__head">
                      <h4>{it.title ?? it.jobTitle ?? "Entrevista"}</h4>
                      {it.score !== null ? (
                        <span className="interview-score" title={`Score: ${it.score}/100`}>
                          {it.score}
                          <small>/100</small>
                        </span>
                      ) : (
                        <span className={`status-chip ${it.status === "cancelled" ? "status-chip--muted" : ""}`}>
                          {STATUS_LABEL[it.status] ?? it.status}
                        </span>
                      )}
                    </div>
                    <p className="interview-card__topic">{TYPE_LABEL[it.type] ?? it.type}</p>
                    <div className="interview-card__meta">
                      <span>{new Date(it.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}</span>
                    </div>
                    <div className="interview-card__actions">
                      <Link className="btn btn--ghost btn--sm" href={`/interviews/${it.id}`}>
                        Ver relatório
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}