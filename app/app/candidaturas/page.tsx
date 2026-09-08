"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { APPLICATION_STAGES, APPLICATION_STAGE_LABELS, type ApplicationStage } from "@/lib/types";

type AppItem = {
  id: string;
  jobId: string;
  stage: ApplicationStage;
  notes: string | null;
  appliedAt: string;
  job?: {
    id: string;
    title: string;
    company: string;
    logoColor: string;
    location: string;
    remote: boolean;
  } | null;
};

const STAGE_ORDER = APPLICATION_STAGES;

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export default function CandidaturasPage() {
  const router = useRouter();
  const [items, setItems] = useState<AppItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<ApplicationStage | null>(null);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/me/applications", { cache: "no-store" });
    if (!res.ok) return;
    const json = await res.json();
    setItems(json.data.items ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const move = async (id: string, stage: ApplicationStage) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, stage } : it)));
    setDragId(null);
    setOverStage(null);
    await fetch("/api/me/applications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, stage }),
    });
  };

  const saveNotes = async (id: string) => {
    await fetch("/api/me/applications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, notes: notesDraft }),
    });
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, notes: notesDraft } : it)));
    setEditingNotes(null);
    setNotesDraft("");
  };

  const onDrop = (stage: ApplicationStage) => (e: React.DragEvent) => {
    e.preventDefault();
    if (dragId) move(dragId, stage);
  };

  return (
    <div className="kanban-page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Candidaturas</h1>
          <p className="page-sub">
            Arraste os cards entre as etapas do seu funil. Clique no card para abrir a vaga.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="app-loading" role="status">
          <span className="spinner" /> Carregando candidaturas…
        </div>
      ) : items.length === 0 ? (
        <div className="app-empty">
          <p>Você ainda não se candidatou a nenhuma vaga.</p>
        </div>
      ) : (
        <div className="kanban">
          {STAGE_ORDER.map((stage) => {
            const column = items.filter((it) => it.stage === stage);
            return (
              <div
                key={stage}
                className={`kanban__col ${overStage === stage ? "kanban__col--over" : ""} ${stage === "rejected" ? "kanban__col--rejected" : ""}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOverStage(stage);
                }}
                onDragLeave={() => setOverStage((s) => (s === stage ? null : s))}
                onDrop={onDrop(stage)}
              >
                <div className="kanban__head">
                  <span className={`stage-dot stage-dot--${stage}`}></span>
                  <strong>{APPLICATION_STAGE_LABELS[stage]}</strong>
                  <span className="kanban__count">{column.length}</span>
                </div>
                <div className="kanban__body">
                  {column.length === 0 && <p className="kanban__empty">Sem candidaturas</p>}
                  {column.map((it) => (
                    <article
                      key={it.id}
                      className="kanban-card"
                      draggable
                      onDragStart={() => setDragId(it.id)}
                      onDragEnd={() => {
                        setDragId(null);
                        setOverStage(null);
                      }}
                      onClick={() => it.job && router.push(`/vagas/${it.job.id}`)}
                    >
                      <div className="kanban-card__title">
                        <span className="job-logo job-logo--sm" style={{ backgroundColor: it.job?.logoColor || "#4f46e5" }}>
                          {it.job?.company.slice(0, 1).toUpperCase()}
                        </span>
                        <div>
                          <h4>{it.job?.title}</h4>
                          <p>
                            {it.job?.company} · {it.job?.location}
                            {it.job?.remote ? " · Remoto" : ""}
                          </p>
                        </div>
                      </div>

                      <div className="kanban-card__meta">
                        <span>Candidatura: {fmtDate(it.appliedAt)}</span>
                      </div>

                      <div className="kanban-card__notes">
                        {editingNotes === it.id ? (
                          <form
                            className="kanban-notes-form"
                            onClick={(e) => e.stopPropagation()}
                            onSubmit={(e) => {
                              e.preventDefault();
                              saveNotes(it.id);
                            }}
                          >
                            <textarea
                              value={notesDraft}
                              onChange={(e) => setNotesDraft(e.target.value)}
                              rows={2}
                              placeholder="Anotações sobre esta candidatura…"
                              autoFocus
                            />
                            <button type="submit" className="btn btn--primary btn--sm">
                              Salvar
                            </button>
                            <button
                              type="button"
                              className="btn btn--ghost btn--sm"
                              onClick={() => setEditingNotes(null)}
                            >
                              Cancelar
                            </button>
                          </form>
                        ) : it.notes ? (
                          <p onClick={(e) => {
                            e.stopPropagation();
                            setEditingNotes(it.id);
                            setNotesDraft(it.notes || "");
                          }}>
                            📝 {it.notes}
                          </p>
                        ) : (
                          <button
                            className="kanban-card__add-note"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingNotes(it.id);
                              setNotesDraft("");
                            }}
                          >
                            + Anotação
                          </button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}