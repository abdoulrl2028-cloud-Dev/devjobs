"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/app-context";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const { user, login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return (
      <div className="container">
        <div className="login-card">
          <h1>Você já está conectado</h1>
          <p>
            Olá, <strong>{user.name}</strong>! Bem-vindo(a) de volta ao DevJobs.
          </p>
          <Link href="/" className="btn btn--primary">
            Explorar vagas
          </Link>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await login(email, password);
    setSubmitting(false);
    if (result.ok) {
      const me = await fetch("/api/auth/me", { cache: "no-store" }).then((r) => r.json());
      const role = me.data?.user?.role;
      const next = searchParams.get("next");
      if (next && next.startsWith("/")) {
        router.push(next);
      } else {
        router.push(role === "company" ? "/dashboard" : role === "admin" ? "/admin" : "/");
      }
      router.refresh();
    } else {
      setError(result.error ?? "Não foi possível entrar.");
    }
  }

  return (
    <div className="container">
      <div className="login-card">
        <h1>Entrar no DevJobs</h1>
        <p className="login-subtitle">Acesse sua conta para uma experiência completa.</p>

        {error && <div className="alert alert--error">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="field">
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              placeholder="voce@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="password">Senha</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
            {submitting ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <p className="login-foot">
          Ainda não tem conta?{" "}
          <Link href="/cadastro" className="link">
            Crie sua conta gratuita
          </Link>{" "}
          · Voltar para a{" "}
          <Link href="/" className="link">
            página de vagas
          </Link>
        </p>
      </div>
    </div>
  );
}