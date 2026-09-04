"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/app-context";
import type { CandidateProfile } from "@/lib/types";
import { initials } from "@/lib/format";

const EXPERIENCE_LABELS: Record<string, string> = {
  "0-1": "Até 1 ano",
  "1-3": "1 a 3 anos",
  "3-5": "3 a 5 anos",
  "5+": "Mais de 5 anos",
};

export default function TalentoPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [talent, setTalent] = useState<CandidateProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push(`/login?next=/talento/${params.id}`);
      return;
    }
    if (user.role !== "company") {
      router.push("/");
      return;
    }
    let cancelled = false;
    fetch(`/api/talents/${params.id}`, { cache: "no-store" })
      .then(async (res) => {
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(json.error ?? "Erro ao carregar o perfil.");
          return;
        }
        setTalent(json.data ?? null);
        if (!json.data) setError("Perfil não encontrado.");
      })
      .catch(() => {
        if (!cancelled) setError("Erro de conexão.");
      });
    return () => {
      cancelled = true;
    };
  }, [params.id, user, loading, router]);

  if (loading) {
    return (
      <div className="container">
        <div className="results-meta">Carregando…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="empty">
          <p className="empty__title">{error}</p>
          <Link href="/talentos" className="btn btn--primary">
            Voltar ao banco de talentos
          </Link>
        </div>
      </div>
    );
  }

  if (!talent) {
    return (
      <div className="container">
        <div className="results-meta">Carregando perfil…</div>
      </div>
    );
  }

  const contact = talent.resumeUrl || talent.githubUrl || talent.linkedinUrl;

  return (
    <div className="container">
      <div className="profile-view">
        <div className="profile-view__head">
          <div className="talent-avatar talent-avatar--lg" style={{ backgroundColor: "#6d28d9" }}>
            {initials(talent.fullName)}
          </div>
          <div>
            <h1>{talent.fullName}</h1>
            <p className="profile-view__headline">{talent.headline}</p>
            <div className="profile-view__chips">
              <span className="pill">{talent.location ?? "Local não informado"}</span>
              {talent.availableRemote && <span className="pill pill--remote">Disponível para remoto</span>}
              <span className="pill">Experiência: {EXPERIENCE_LABELS[talent.experience] ?? talent.experience}</span>
            </div>
          </div>
        </div>

        <div className="profile-view__section">
          <h2>Sobre</h2>
          <p>{talent.summary ?? "Este candidato ainda não adicionou uma descrição."}</p>
        </div>

        <div className="profile-view__section">
          <h2>Habilidades</h2>
          <div className="job-card__tags">
            {talent.skills.map((skill) => (
              <span key={skill} className="tag">
                {skill}
              </span>
            ))}
          </div>
        </div>

        {contact && (
          <p className="form-hint">
            Dica: use os links do perfil ou o e-mail do candidato para iniciar o primeiro contato.
          </p>
        )}

        <div className="form-row">
          <Link href="/talentos" className="btn btn--ghost">
            ← Voltar
          </Link>
          {talent.resumeUrl && (
            <a href={talent.resumeUrl} target="_blank" rel="noopener noreferrer" className="btn btn--primary">
              Ver currículo
            </a>
          )}
          {talent.githubUrl && (
            <a href={talent.githubUrl} target="_blank" rel="noopener noreferrer" className="btn btn--ghost">
              GitHub
            </a>
          )}
          {talent.linkedinUrl && (
            <a href={talent.linkedinUrl} target="_blank" rel="noopener noreferrer" className="btn btn--ghost">
              LinkedIn
            </a>
          )}
        </div>
      </div>
    </div>
  );
}