"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/app-context";

export default function PerfilPage() {
  const router = useRouter();
  const { user, loading, refresh } = useAuth();

  const [fullName, setFullName] = useState("");
  const [headline, setHeadline] = useState("");
  const [summary, setSummary] = useState("");
  const [skills, setSkills] = useState("");
  const [experience, setExperience] = useState("");
  const [location, setLocation] = useState("");
  const [availableRemote, setAvailableRemote] = useState(false);
  const [githubUrl, setGithubUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/login?next=/perfil");
      return;
    }
    if (user.role !== "candidate") {
      router.push("/");
      return;
    }
    refresh();
  }, [user, loading, router, refresh]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        const p = json.data?.profile;
        setFullName(p?.fullName ?? user?.name ?? "");
        setHeadline(p?.headline ?? "Profissional de tecnologia");
        setSummary(p?.summary ?? "");
        setSkills((p?.skills ?? []).join(", "));
        setExperience(p?.experience ?? "0-1");
        setLocation(p?.location ?? "");
        setAvailableRemote(p?.availableRemote ?? false);
        setGithubUrl(p?.githubUrl ?? "");
        setLinkedinUrl(p?.linkedinUrl ?? "");
        setResumeUrl(p?.resumeUrl ?? "");
        setLoaded(true);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const skillsList = skills
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 20);

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          headline,
          summary,
          skills: skillsList,
          experience,
          location,
          availableRemote,
          githubUrl,
          linkedinUrl,
          resumeUrl,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Não foi possível salvar o perfil.");
        setSubmitting(false);
        return;
      }
      setSuccess("Perfil salvo com sucesso!");
      await refresh();
    } catch {
      setError("Erro de conexão. Tente novamente.");
    }
    setSubmitting(false);
  }

  if (loading || !user) {
    return (
      <div className="container">
        <div className="results-meta">Carregando…</div>
      </div>
    );
  }

  return (
    <div className="container">
      <section className="page-hero page-hero--compact">
        <h1>Meu perfil</h1>
        <p>Complete seu perfil para se destacar no mercado e no banco de talentos.</p>
      </section>

      {success && <div className="alert">{success}</div>}
      {error && <div className="alert alert--error">{error}</div>}

      {!loaded ? (
        <div className="results-meta">Carregando perfil…</div>
      ) : (
        <form onSubmit={handleSubmit} className="publish-form">
          <fieldset className="form-section">
            <legend>Informações básicas</legend>
            <div className="field">
              <label htmlFor="pf-name">Nome completo</label>
              <input id="pf-name" type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="pf-headline">Cargo / headline</label>
              <input
                id="pf-headline"
                type="text"
                required
                placeholder="Ex.: Desenvolvedor(a) Frontend (React)"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="pf-summary">Resumo profissional</label>
              <textarea
                id="pf-summary"
                rows={4}
                placeholder="Conte um pouco da sua trajetória…"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
              />
            </div>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="pf-exp">Experiência</label>
                <select id="pf-exp" value={experience} onChange={(e) => setExperience(e.target.value)}>
                  <option value="0-1">Até 1 ano</option>
                  <option value="1-3">1 a 3 anos</option>
                  <option value="3-5">3 a 5 anos</option>
                  <option value="5+">Mais de 5 anos</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="pf-loc">Localização</label>
                <input
                  id="pf-loc"
                  type="text"
                  placeholder="Ex.: São Paulo - SP"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
            </div>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={availableRemote}
                onChange={(e) => setAvailableRemote(e.target.checked)}
              />
              <span>Disponível para trabalho remoto</span>
            </label>
          </fieldset>

          <fieldset className="form-section">
            <legend>Habilidades</legend>
            <div className="field">
              <label htmlFor="pf-skills">Tecnologias/habilidades</label>
              <input
                id="pf-skills"
                type="text"
                placeholder="React, TypeScript, Node.js"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
              />
              <p className="form-hint">Separe por vírgula. Usamos essas habilidades para o banco de talentos.</p>
            </div>
          </fieldset>

          <fieldset className="form-section">
            <legend>Links</legend>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="pf-github">GitHub</label>
                <input
                  id="pf-github"
                  type="url"
                  placeholder="https://github.com/voce"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="pf-linkedin">LinkedIn</label>
                <input
                  id="pf-linkedin"
                  type="url"
                  placeholder="https://linkedin.com/in/voce"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="pf-resume">Link do currículo</label>
              <input
                id="pf-resume"
                type="url"
                placeholder="https://…/curriculo.pdf"
                value={resumeUrl}
                onChange={(e) => setResumeUrl(e.target.value)}
              />
            </div>
          </fieldset>

          <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
            {submitting ? "Salvando…" : "Salvar perfil"}
          </button>
        </form>
      )}

      <div className="form-row form-row--center" style={{ marginTop: 16 }}>
        <Link href="/" className="link">
          ← Explorar vagas
        </Link>
      </div>
    </div>
  );
}