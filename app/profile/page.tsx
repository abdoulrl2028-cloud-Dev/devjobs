"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/app-context";

const EXPERIENCE_LABELS: Record<string, string> = {
  "0-1": "Até 1 ano",
  "1-3": "1 a 3 anos",
  "3-5": "3 a 5 anos",
  "5+": "Mais de 5 anos",
};

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading, refresh } = useAuth();

  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [headline, setHeadline] = useState("");
  const [summary, setSummary] = useState("");
  const [skills, setSkills] = useState("");
  const [experience, setExperience] = useState("0-1");
  const [location, setLocation] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("");
  const [education, setEducation] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");
  const [availableRemote, setAvailableRemote] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login?next=/profile");
      return;
    }
    if (user.role !== "candidate") {
      router.replace("/");
      return;
    }
    refresh();
  }, [user, loading, router, refresh]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error("Falha ao carregar o perfil.");
        return r.json();
      })
      .then((json) => {
        if (cancelled) return;
        const p = json.data?.profile;
        if (p) {
          setHasProfile(true);
          setFullName(p.fullName ?? "");
          setHeadline(p.headline ?? "");
          setSummary(p.summary ?? "");
          setSkills((p.skills ?? []).join(", "));
          setExperience(p.experience ?? "0-1");
          setLocation(p.location ?? "");
          setCity(p.city ?? "");
          setState(p.state ?? "");
          setCountry(p.country ?? "");
          setEducation(p.education ?? "");
          setPhotoUrl(p.photoUrl ?? "");
          setGithubUrl(p.githubUrl ?? "");
          setLinkedinUrl(p.linkedinUrl ?? "");
          setResumeUrl(p.resumeUrl ?? "");
          setAvailableRemote(p.availableRemote ?? false);
        } else {
          setHasProfile(false);
          setEditing(true);
        }
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Não foi possível carregar o perfil. Tente novamente em instantes.");
          setLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
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
          city,
          state,
          country,
          education,
          photoUrl,
          githubUrl,
          linkedinUrl,
          resumeUrl,
          availableRemote,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Não foi possível salvar o perfil.");
        setSubmitting(false);
        return;
      }
      setSuccess("Perfil salvo com sucesso!");
      setHasProfile(true);
      setEditing(false);
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

  const place = [city, state, country].filter(Boolean).join(", ") || location;

  if (!editing) {
    return (
      <div className="container">
        <section className="page-hero page-hero--compact">
          <h1>Meu Perfil</h1>
          <p>Seus dados aparecem para as empresas no banco de talentos.</p>
        </section>

        {success && <div className="alert">{success}</div>}
        {error && <div className="alert alert--error">{error}</div>}

        {!loaded ? (
          <div className="results-meta">Carregando perfil…</div>
        ) : !hasProfile ? (
          <div className="app-empty">
            <p>Nenhum perfil encontrado. Clique em “Editar perfil” para criar o seu.</p>
            <button type="button" className="btn btn--primary" onClick={() => setEditing(true)}>
              Editar perfil
            </button>
          </div>
        ) : (
          <div className="profile-view">
            <div className="profile-card">
              <div className="profile-card__head">
                {photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="profile-avatar" src={photoUrl} alt={fullName || user.name || "Foto do perfil"} />
                ) : (
                  <div className="profile-avatar profile-avatar--fallback">
                    {(fullName || user.name || "?").slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div>
                  <h2 className="profile-card__name">{fullName || user.name}</h2>
                  <p className="profile-card__headline">{headline}</p>
                  <p className="profile-card__email">{user.email}</p>
                  {place && <p className="profile-card__place">📍 {place}</p>}
                </div>
              </div>

              <div className="profile-badges">
                <span className="score-badge score-badge--mid">{EXPERIENCE_LABELS[experience] ?? experience} de experiência</span>
                {availableRemote && <span className="status-chip">Disponível para remoto</span>}
              </div>

              {summary && (
                <section className="profile-card__section">
                  <h3>Bio</h3>
                  <p>{summary}</p>
                </section>
              )}

              <section className="profile-card__section">
                <h3>Skills</h3>
                {skills.split(",").filter((s) => s.trim()).length === 0 ? (
                  <p className="form-hint">Nenhuma habilidade cadastrada.</p>
                ) : (
                  <div className="skill-tags">
                    {skills.split(",").filter((s) => s.trim()).map((s, i) => (
                      <span key={i}>{s.trim()}</span>
                    ))}
                  </div>
                )}
              </section>

              {education && (
                <section className="profile-card__section">
                  <h3>Formação</h3>
                  <p>{education}</p>
                </section>
              )}

              {(githubUrl || linkedinUrl || resumeUrl) && (
                <section className="profile-card__section">
                  <h3>Links</h3>
                  <div className="profile-links">
                    {linkedinUrl && <a className="text-link" href={linkedinUrl} target="_blank" rel="noreferrer">LinkedIn ↗</a>}
                    {githubUrl && <a className="text-link" href={githubUrl} target="_blank" rel="noreferrer">GitHub ↗</a>}
                    {resumeUrl && <a className="text-link" href={resumeUrl} target="_blank" rel="noreferrer">Portfólio / Currículo ↗</a>}
                  </div>
                </section>
              )}
            </div>

            <div className="form-row" style={{ marginTop: 20 }}>
              <button type="button" className="btn btn--primary" onClick={() => setEditing(true)}>
                Editar perfil
              </button>
              <Link href="/" className="btn btn--ghost">
                ← Explorar vagas
              </Link>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="container">
      <section className="page-hero page-hero--compact">
        <h1>{hasProfile ? "Editar perfil" : "Criar perfil"}</h1>
        <p>Complete seus dados. Só você pode editar o seu próprio perfil.</p>
      </section>

      {success && <div className="alert">{success}</div>}
      {error && <div className="alert alert--error">{error}</div>}

      <form onSubmit={handleSubmit} className="publish-form">
        <fieldset className="form-section">
          <legend>Dados pessoais</legend>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="p-fullName">Nome completo</label>
              <input id="p-fullName" type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="p-email">E-mail</label>
              <input id="p-email" type="email" value={user.email} readOnly disabled />
              <p className="form-hint">O e-mail é definido pela sua conta de login.</p>
            </div>
          </div>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="p-city">Cidade</label>
              <input id="p-city" type="text" placeholder="Ex.: São Paulo" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="p-state">Estado</label>
              <input id="p-state" type="text" placeholder="Ex.: SP" value={state} onChange={(e) => setState(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="p-country">País</label>
              <input id="p-country" type="text" placeholder="Ex.: Brasil" value={country} onChange={(e) => setCountry(e.target.value)} />
            </div>
          </div>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="p-headline">Cargo / headline</label>
              <input
                id="p-headline"
                type="text"
                required
                placeholder="Ex.: Desenvolvedor(a) Frontend (React)"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="p-photo">Foto (URL)</label>
              <input id="p-photo" type="url" placeholder="https://…/foto.jpg" value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} />
            </div>
          </div>
        </fieldset>

        <fieldset className="form-section">
          <legend>Apresentação</legend>
          <div className="field">
            <label htmlFor="p-bio">Bio</label>
            <textarea
              id="p-bio"
              rows={4}
              placeholder="Conte um pouco da sua trajetória…"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
            />
          </div>
        </fieldset>

        <fieldset className="form-section">
          <legend>Experiência e formação</legend>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="p-exp">Experiência</label>
              <select id="p-exp" value={experience} onChange={(e) => setExperience(e.target.value)}>
                <option value="0-1">Até 1 ano</option>
                <option value="1-3">1 a 3 anos</option>
                <option value="3-5">3 a 5 anos</option>
                <option value="5+">Mais de 5 anos</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="p-edu">Formação</label>
              <input
                id="p-edu"
                type="text"
                placeholder="Ex.: Bacharelado em Ciência da Computação"
                value={education}
                onChange={(e) => setEducation(e.target.value)}
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="p-location">Localização (texto livre)</label>
            <input
              id="p-location"
              type="text"
              placeholder="Ex.: São Paulo - SP, Brasil"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
            <p className="form-hint">Opcional: usado quando cidade/estado/país não estão separados.</p>
          </div>
          <label className="checkbox-row">
            <input type="checkbox" checked={availableRemote} onChange={(e) => setAvailableRemote(e.target.checked)} />
            <span>Disponível para trabalho remoto</span>
          </label>
        </fieldset>

        <fieldset className="form-section">
          <legend>Habilidades</legend>
          <div className="field">
            <label htmlFor="p-skills">Tecnologias/habilidades</label>
            <input
              id="p-skills"
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
              <label htmlFor="p-github">GitHub</label>
              <input id="p-github" type="url" placeholder="https://github.com/voce" value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="p-linkedin">LinkedIn</label>
              <input id="p-linkedin" type="url" placeholder="https://linkedin.com/in/voce" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="p-resume">Portfólio / Currículo (URL)</label>
            <input id="p-resume" type="url" placeholder="https://…/curriculo.pdf" value={resumeUrl} onChange={(e) => setResumeUrl(e.target.value)} />
          </div>
        </fieldset>

        <div className="form-row form-row--center" style={{ marginTop: 20 }}>
          <button type="submit" className="btn btn--primary" disabled={submitting}>
            {submitting ? "Salvando…" : "Salvar alterações"}
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => { setEditing(false); setError(null); }}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}