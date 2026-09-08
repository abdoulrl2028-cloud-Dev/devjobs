"use client";

import { useCallback, useEffect, useState } from "react";
import type { Resume, ResumeData } from "@/lib/types";

type ResumeItem = Resume;

const EMPTY_DATA: ResumeData = {
  fullName: "",
  headline: "",
  email: "",
  phone: "",
  summary: "",
  skills: [],
  experienceItems: [],
  education: [],
  projects: [],
  languages: [],
};

const SKILL_SUGGESTIONS = [
  "React", "TypeScript", "JavaScript", "Node.js", "Next.js", "CSS", "HTML",
  "PostgreSQL", "SQL", "Docker", "Git", "AWS", "Testes", "REST APIs", "UI/UX",
];

export default function CurriculosPage() {
  const [items, setItems] = useState<ResumeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<ResumeItem | null>(null);
  const [editing, setEditing] = useState<ResumeItem | null>(null);
  const [title, setTitle] = useState("Meu currículo");
  const [data, setData] = useState<ResumeData>(JSON.parse(JSON.stringify(EMPTY_DATA)));
  const [skillText, setSkillText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/me/resumes", { cache: "no-store" });
    if (!res.ok) return;
    const json = await res.json();
    setItems(json.data.items ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setEditing(null);
    setTitle("Meu currículo");
    setData(JSON.parse(JSON.stringify(EMPTY_DATA)));
    setSkillText("");
    setError(null);
  };

  const startNew = () => {
    setViewing(null);
    resetForm();
  };

  const startEdit = (r: ResumeItem) => {
    setViewing(null);
    setEditing(r);
    setTitle(r.title);
    setData(JSON.parse(JSON.stringify(r.data)));
    setSkillText(r.data.skills?.join(", ") ?? "");
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const addSkill = (skill: string) => {
    const s = skill.trim();
    if (!s) return;
    setData((prev) => ({
      ...prev,
      skills: [...new Set([...(prev.skills ?? []), s])],
    }));
    setSkillText("");
  };

  const removeSkill = (skill: string) => {
    setData((prev) => ({ ...prev, skills: (prev.skills ?? []).filter((s) => s !== skill) }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!data.fullName.trim()) {
      setError("O nome completo é obrigatório.");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/me/resumes", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        editing
          ? { id: editing.id, title, data }
          : { title, data }
      ),
    });
    setSaving(false);
    if (res.ok) {
      resetForm();
      load();
    } else {
      const j = await res.json();
      setError(j.error ?? "Não foi possível salvar o currículo.");
    }
  };

  const duplicate = async (r: ResumeItem) => {
    await fetch("/api/me/resumes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "duplicate", id: r.id }),
    });
    load();
  };

  const remove = async (r: ResumeItem) => {
    await fetch(`/api/me/resumes?id=${r.id}`, { method: "DELETE" });
    if (viewing?.id === r.id) setViewing(null);
    if (editing?.id === r.id) resetForm();
    load();
  };

  const setExp = (i: number, field: keyof ResumeData["experienceItems"][number], value: string) => {
    setData((prev) => {
      const next = (prev.experienceItems ?? []).map((item, idx) =>
        idx === i ? { ...item, [field]: value } : item
      );
      return { ...prev, experienceItems: next };
    });
  };

  const addExp = () =>
    setData((prev) => ({
      ...prev,
      experienceItems: [...(prev.experienceItems ?? []), { role: "", company: "", period: "", description: "", skills: [] }],
    }));

  const removeExp = (i: number) =>
    setData((prev) => ({ ...prev, experienceItems: (prev.experienceItems ?? []).filter((_, idx) => idx !== i) }));

  const setEdu = (i: number, field: keyof ResumeData["education"][number], value: string) => {
    setData((prev) => {
      const next = (prev.education ?? []).map((item, idx) => (idx === i ? { ...item, [field]: value } : item));
      return { ...prev, education: next };
    });
  };

  const addEdu = () =>
    setData((prev) => ({ ...prev, education: [...(prev.education ?? []), { degree: "", school: "", period: "" }] }));

  const removeEdu = (i: number) =>
    setData((prev) => ({ ...prev, education: (prev.education ?? []).filter((_, idx) => idx !== i) }));

  const setProj = (i: number, field: keyof ResumeData["projects"][number], value: string) => {
    setData((prev) => {
      const next = (prev.projects ?? []).map((item, idx) => (idx === i ? { ...item, [field]: value } : item));
      return { ...prev, projects: next };
    });
  };

  const addProj = () =>
    setData((prev) => ({ ...prev, projects: [...(prev.projects ?? []), { name: "", description: "", tags: [], url: "" }] }));

  const removeProj = (i: number) =>
    setData((prev) => ({ ...prev, projects: (prev.projects ?? []).filter((_, idx) => idx !== i) }));

  return (
    <div className="resumes-page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Meus currículos</h1>
          <p className="page-sub">Crie, edite, duplique e imprima versões do seu currículo por vaga.</p>
        </div>
        <button className="btn btn--primary" onClick={startNew}>
          + Novo currículo
        </button>
      </div>

      {viewing && (
        <div className="app-card resume-preview">
          <div className="resume-preview__head">
            <div>
              <h2>{viewing.data.fullName || "Sem nome"}</h2>
              <p className="resume-preview__headline">{viewing.data.headline}</p>
            </div>
            <div className="resume-preview__actions">
              <button className="btn btn--ghost btn--sm" onClick={() => window.print()}>
                🖨 Imprimir
              </button>
              <button className="btn btn--ghost btn--sm" onClick={() => startEdit(viewing)}>
                Editar
              </button>
              <button className="btn btn--ghost btn--sm" onClick={() => duplicate(viewing)}>
                Duplicar
              </button>
              <button className="btn btn--ghost btn--sm btn--danger" onClick={() => remove(viewing)}>
                Excluir
              </button>
            </div>
          </div>
          <div className="resume-preview__body">
            <div className="resume-preview__side">
              <h5>Contato</h5>
              {viewing.data.email && <p>📧 {viewing.data.email}</p>}
              {viewing.data.phone && <p>📞 {viewing.data.phone}</p>}
              <h5>Skills</h5>
              <div className="tag-cloud">
                {viewing.data.skills?.map((s) => (
                  <span key={s} className="tag">{s}</span>
                ))}
              </div>
              <h5>Idiomas</h5>
              {viewing.data.languages?.map((l) => (
                <p key={l.name}>{l.name} — {l.level}</p>
              ))}
            </div>
            <div className="resume-preview__main">
              <h5>Resumo</h5>
              <p>{viewing.data.summary}</p>
              <h5>Experiência</h5>
              {viewing.data.experienceItems?.map((e, i) => (
                <div key={i} className="resume-preview__item">
                  <strong>{e.role}</strong> — {e.company}
                  <span className="resume-preview__period">{e.period}</span>
                  <p>{e.description}</p>
                </div>
              ))}
              <h5>Educação</h5>
              {viewing.data.education?.map((e, i) => (
                <div key={i} className="resume-preview__item">
                  <strong>{e.degree}</strong> — {e.school}
                  <span className="resume-preview__period">{e.period}</span>
                </div>
              ))}
              <h5>Projetos</h5>
              {viewing.data.projects?.map((p, i) => (
                <div key={i} className="resume-preview__item">
                  <strong>{p.name}</strong>
                  {p.url && <span> · {p.url}</span>}
                  <p>{p.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {editing && (
        <form className="app-card resume-form" onSubmit={submit}>
          <h3>{editing ? `Editar: ${editing.title}` : "Novo currículo"}</h3>

          <div className="form-row">
            <label>
              Título do currículo
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Currículo Frontend" />
            </label>
          </div>

          <div className="form-row form-row--split">
            <label>
              Nome completo *
              <input value={data.fullName} onChange={(e) => setData({ ...data, fullName: e.target.value })} required />
            </label>
            <label>
              Cargo/título (headline)
              <input value={data.headline} onChange={(e) => setData({ ...data, headline: e.target.value })} placeholder="Ex.: Desenvolvedora Frontend" />
            </label>
          </div>
          <div className="form-row form-row--split">
            <label>
              Email
              <input type="email" value={data.email} onChange={(e) => setData({ ...data, email: e.target.value })} />
            </label>
            <label>
              Telefone
              <input value={data.phone} onChange={(e) => setData({ ...data, phone: e.target.value })} />
            </label>
          </div>
          <div className="form-row">
            <label>
              Resumo profissional
              <textarea
                rows={3}
                value={data.summary}
                onChange={(e) => setData({ ...data, summary: e.target.value })}
                placeholder="Resuma sua trajetória e diferenciais."
              />
            </label>
          </div>

          <div className="form-row">
            <label>Skills</label>
            <div className="skill-input">
              <input
                value={skillText}
                onChange={(e) => setSkillText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addSkill(skillText);
                  }
                }}
                placeholder="Digite e pressione Enter"
              />
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => addSkill(skillText)}>
                Adicionar
              </button>
            </div>
            <div className="tag-cloud">
              {(data.skills ?? []).map((s) => (
                <span key={s} className="tag tag--removable" onClick={() => removeSkill(s)}>
                  {s} ✕
                </span>
              ))}
            </div>
          </div>

          <div className="form-row">
            <label>Experiência</label>
            {(data.experienceItems ?? []).map((exp, i) => (
              <div key={i} className="exp-editor">
                <div className="form-row form-row--split">
                  <input
                    value={exp.role}
                    onChange={(e) => setExp(i, "role", e.target.value)}
                    placeholder="Cargo"
                  />
                  <input
                    value={exp.company}
                    onChange={(e) => setExp(i, "company", e.target.value)}
                    placeholder="Empresa"
                  />
                </div>
                <div className="form-row form-row--split">
                  <input
                    value={exp.period}
                    onChange={(e) => setExp(i, "period", e.target.value)}
                    placeholder="Período (ex.: 2022 – hoje)"
                  />
                  <button type="button" className="btn btn--ghost btn--sm btn--danger" onClick={() => removeExp(i)}>
                    Remover
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={exp.description}
                  onChange={(e) => setExp(i, "description", e.target.value)}
                  placeholder="Descrição das responsabilidades e resultados"
                />
              </div>
            ))}
            <button type="button" className="btn btn--ghost btn--sm" onClick={addExp}>
              + Adicionar experiência
            </button>
          </div>

          <div className="form-row">
            <label>Educação</label>
            {(data.education ?? []).map((edu, i) => (
              <div key={i} className="exp-editor">
                <div className="form-row form-row--split">
                  <input
                    value={edu.degree}
                    onChange={(e) => setEdu(i, "degree", e.target.value)}
                    placeholder="Curso/grau"
                  />
                  <input
                    value={edu.school}
                    onChange={(e) => setEdu(i, "school", e.target.value)}
                    placeholder="Instituição"
                  />
                </div>
                <div className="form-row form-row--split">
                  <input
                    value={edu.period}
                    onChange={(e) => setEdu(i, "period", e.target.value)}
                    placeholder="Período"
                  />
                  <button type="button" className="btn btn--ghost btn--sm btn--danger" onClick={() => removeEdu(i)}>
                    Remover
                  </button>
                </div>
              </div>
            ))}
            <button type="button" className="btn btn--ghost btn--sm" onClick={addEdu}>
              + Adicionar educação
            </button>
          </div>

          <div className="form-row">
            <label>Projetos</label>
            {(data.projects ?? []).map((proj, i) => (
              <div key={i} className="exp-editor">
                <div className="form-row form-row--split">
                  <input
                    value={proj.name}
                    onChange={(e) => setProj(i, "name", e.target.value)}
                    placeholder="Nome do projeto"
                  />
                  <input
                    value={proj.url ?? ""}
                    onChange={(e) => setProj(i, "url", e.target.value)}
                    placeholder="URL (opcional)"
                  />
                </div>
                <div className="form-row form-row--split">
                  <textarea
                    rows={2}
                    value={proj.description}
                    onChange={(e) => setProj(i, "description", e.target.value)}
                    placeholder="Descrição"
                  />
                  <button type="button" className="btn btn--ghost btn--sm btn--danger" onClick={() => removeProj(i)}>
                    Remover
                  </button>
                </div>
              </div>
            ))}
            <button type="button" className="btn btn--ghost btn--sm" onClick={addProj}>
              + Adicionar projeto
            </button>
          </div>

          {error && <p className="app-error">{error}</p>}
          <div className="form-actions">
            <button type="button" className="btn btn--ghost" onClick={resetForm}>
              Cancelar
            </button>
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? "Salvando…" : editing ? "Salvar alterações" : "Criar currículo"}
            </button>
          </div>
        </form>
      )}

      <div className="resume-grid">
        {loading ? (
          <div className="app-loading" role="status">
            <span className="spinner" /> Carregando currículos…
          </div>
        ) : items.length === 0 && !editing ? (
          <div className="app-empty">
            <p>Nenhum currículo criado. Clique em “+ Novo currículo” para começar.</p>
          </div>
        ) : (
          items.map((r) => (
            <article key={r.id} className="app-card resume-card" onClick={() => setViewing(r)}>
              <h3>{r.title}</h3>
              <p className="resume-card__name">{r.data.fullName || "Sem nome"}</p>
              {r.data.headline && <p className="resume-card__headline">{r.data.headline}</p>}
              <div className="resume-card__meta">
                <span>Atualizado em {new Date(r.updatedAt).toLocaleDateString("pt-BR")}</span>
              </div>
              <div className="resume-card__actions">
                <button
                  className="btn btn--ghost btn--sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewing(r);
                  }}
                >
                  Ver
                </button>
                <button
                  className="btn btn--ghost btn--sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    startEdit(r);
                  }}
                >
                  Editar
                </button>
                <button
                  className="btn btn--ghost btn--sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    duplicate(r);
                  }}
                >
                  Duplicar
                </button>
                <button
                  className="btn btn--ghost btn--sm btn--danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(r);
                  }}
                >
                  Excluir
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}