"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/lib/app-context";

export default function ApplyButton({ jobId }: { jobId: string }) {
  const { user, loading } = useAuth();
  const [state, setState] = useState<"idle" | "busy" | "ok" | "error" | "already">("idle");
  const [message, setMessage] = useState<string | null>(null);

  if (loading) {
    return <span className="btn btn--primary btn--disabled">Carregando…</span>;
  }

  if (!user) {
    return (
      <Link href={`/login?next=/vagas/${jobId}`} className="btn btn--primary">
        Entrar para se candidatar
      </Link>
    );
  }

  if (user.role !== "candidate") {
    return (
      <span className="btn btn--ghost btn--disabled">
        Candidatura disponível para contas de candidato(a)
      </span>
    );
  }

  async function apply() {
    setState("busy");
    setMessage(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (res.status === 409) {
        setState("already");
        setMessage(json.error ?? "Você já se candidatou a esta vaga.");
        return;
      }
      if (!res.ok) {
        setState("error");
        setMessage(json.error ?? "Não foi possível enviar sua candidatura.");
        return;
      }
      setState("ok");
      setMessage(json.data?.message ?? "Candidatura enviada!");
    } catch {
      setState("error");
      setMessage("Erro de conexão. Tente novamente.");
    }
  }

  if (state === "ok") {
    return (
      <div className="alert">✓ {message}</div>
    );
  }

  if (state === "already") {
    return <div className="alert">Você já se candidatou a esta vaga.</div>;
  }

  return (
    <div className="apply-wrap">
      {state === "error" && message && <div className="alert alert--error">{message}</div>}
      <button type="button" className="btn btn--primary" onClick={apply} disabled={state === "busy"}>
        {state === "busy" ? "Enviando…" : "Candidatar-se"}
      </button>
    </div>
  );
}