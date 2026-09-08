"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { CandidateProfile } from "@/lib/types";

type Data = {
  profile: CandidateProfile | null;
  plan: string;
};

const PLAN_NAMES: Record<string, string> = {
  free: "Grátis",
  premium: "Premium",
  pro: "Pro",
};

export default function ConfiguracoesPage() {
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notifState, setNotifState] = useState<"default" | "granted" | "denied">("default");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/me/dashboard", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Não foi possível carregar as configurações.");
        return;
      }
      setData(json.data);
      setNotifState((typeof window !== "undefined" && "Notification" in window && window.Notification.permission) || "default");
    } catch {
      setError("Falha de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const requestNotify = () => {
    if (!("Notification" in window)) {
      setNotifState("denied");
      return;
    }
    window.Notification.requestPermission().then((p) => setNotifState(p));
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", cache: "no-store" });
    } catch {
      // continua mesmo em falha de rede
    }
    router.push("/");
  };

  const plan = data?.plan ?? "free";

  return (
    <div className="app-page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Configurações</h1>
          <p className="page-sub">Gerencie seu plano, preferências e conta.</p>
        </div>
      </div>

      {loading ? (
        <div className="app-loading" role="status">
          <span className="spinner" /> Carregando…
        </div>
      ) : error ? (
        <div className="app-empty">
          <p>{error}</p>
          <button type="button" className="btn btn--primary" onClick={load}>
            Tentar novamente
          </button>
        </div>
      ) : (
        <>
          <section className="app-section">
            <div className="app-card">
              <h2 className="app-card__title">Plano atual</h2>
              <p className="app-sub">
                Seu plano é <strong>{PLAN_NAMES[plan] ?? "Grátis"}</strong>.
              </p>
              {plan === "free" && (
                <div className="app-note">
                  Conheça os benefícios do Premium para acelerar sua busca por vaga.{" "}
                  <Link href="/planos">Ver benefícios →</Link>
                </div>
              )}
              <div className="app-card__actions">
                <Link href="/planos" className="btn btn--primary btn--sm">
                  Ver planos
                </Link>
              </div>
            </div>
          </section>

          <section className="app-section">
            <div className="app-card">
              <h2 className="app-card__title">Preferências do candidato</h2>
              <p className="app-sub">
                Receber notificações de novas vagas no navegador.
              </p>
              {notifState === "granted" ? (
                <div className="app-note">Notificações ativadas ✓</div>
              ) : (
                <button type="button" className="btn btn--ghost btn--sm" onClick={requestNotify}>
                  {notifState === "denied" ? "Notificações bloqueadas" : "Ativar notificações"}
                </button>
              )}
            </div>
          </section>

          <section className="app-section">
            <div className="app-card">
              <h2 className="app-card__title">Sua conta</h2>
              <p className="app-sub">
                {data?.profile?.fullName ?? "Candidato"}
              </p>
              <div className="app-card__actions">
                <button type="button" className="btn btn--ghost btn--sm" onClick={logout}>
                  Sair
                </button>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
