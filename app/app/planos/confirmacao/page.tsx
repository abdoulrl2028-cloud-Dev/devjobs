"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CANDIDATE_PLANS, type CandidateTier } from "@/lib/types";

export default function PlanosConfirmacaoPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "ok" | "error" | "canceled">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const url = new URL(window.location.href);
    const queryStatus = url.searchParams.get("status");
    const sessionId = url.searchParams.get("session_id");
    const tier = (url.searchParams.get("plan") ?? "premium") as CandidateTier;

    if (queryStatus === "cancelado") {
      setStatus("canceled");
      setMessage("Pagamento cancelado. Nenhuma cobrança foi realizada.");
      return;
    }

    if (!CANDIDATE_PLANS.some((p) => p.id === tier)) {
      setStatus("error");
      setMessage("Plano inválido.");
      return;
    }

    (async () => {
      try {
        const res = await fetch("/api/me/plan/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tier, session_id: sessionId ?? null }),
        });
        const json = (await res.json()) as { error?: string; data?: { ok?: boolean; tier?: string; message?: string } };
        if (res.ok && json.data?.ok) {
          setStatus("ok");
          setMessage(
            json.data.message ??
              `Plano ${CANDIDATE_PLANS.find((p) => p.id === tier)?.name} ativado!`
          );
        } else {
          setStatus("error");
          setMessage(json.error ?? "Não foi possível confirmar o pagamento.");
        }
      } catch {
        setStatus("error");
        setMessage("Falha de conexão. Tente novamente.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === "loading") {
    return (
      <div className="app-loading">
        <span className="app-loading__spinner" />
        <p>Confirmando pagamento…</p>
      </div>
    );
  }

  return (
    <div className="app-page">
      <div className="page-head">
        <h1 className="page-title">Confirmação de plano</h1>
        <p className="page-sub">Status do seu plano DevJobs Premium</p>
      </div>

      <div className={`app-card planos-confirmacao planos-confirmacao--${status}`}>
        {status === "ok" && (
          <>
            <h2>Pagamento confirmado!</h2>
            <p>{message}</p>
            <Link href="/planos" className="btn btn--primary">
              Ver meus planos
            </Link>
          </>
        )}
        {status === "canceled" && (
          <>
            <h2>Pagamento cancelado</h2>
            <p>{message}</p>
            <Link href="/planos" className="btn btn--primary">
              Voltar aos planos
            </Link>
          </>
        )}
        {status === "error" && (
          <>
            <h2>Algo deu errado</h2>
            <p>{message}</p>
            <button
              className="btn btn--primary"
              onClick={() => router.replace("/planos")}
            >
              Voltar aos planos
            </button>
          </>
        )}
      </div>
    </div>
  );
}