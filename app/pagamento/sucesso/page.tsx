"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

type Status = "checking" | "ok" | "error";

export default function PagamentoSucessoPage() {
  return (
    <Suspense fallback={null}>
      <SucessoContent />
    </Suspense>
  );
}

function SucessoContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<Status>("checking");
  const [message, setMessage] = useState("Confirmando seu pagamento…");

  useEffect(() => {
    const jobId = searchParams.get("jobId");
    const plan = searchParams.get("plan");
    const sessionId = searchParams.get("session_id");
    const mock = searchParams.get("mock") === "1";

    if (!jobId || !plan) {
      setStatus("ok");
      setMessage("Obrigado! Se o pagamento foi concluído, sua vaga será publicada em instantes.");
      return;
    }

    let cancelled = false;
    fetch("/api/checkout/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobId,
        plan,
        ...(mock ? { mock: true } : {}),
        ...(sessionId ? { session_id: sessionId } : {}),
      }),
    })
      .then(async (res) => {
        const json = await res.json();
        if (cancelled) return;
        if (res.ok) {
          setStatus("ok");
          setMessage(json.data?.message ?? "Vaga publicada com sucesso!");
        } else {
          setStatus("error");
          setMessage(json.error ?? "Não foi possível confirmar o pagamento.");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatus("error");
          setMessage("Erro de conexão ao confirmar o pagamento.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  return (
    <div className="container">
      <div className="login-card payment-result">
        <div className={`payment-result__icon payment-result__icon--${status}`}>
          {status === "checking" ? "…" : status === "ok" ? "✓" : "!"}
        </div>
        <h1>{status === "ok" ? "Tudo certo!" : status === "error" ? "Ops…" : "Aguarde"}</h1>
        <p>{message}</p>
        {status !== "checking" && (
          <div className="form-row form-row--center">
            <Link href="/dashboard" className="btn btn--primary">
              Ir para o painel
            </Link>
            <Link href="/publicar-vaga" className="btn btn--ghost">
              Publicar outra vaga
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}