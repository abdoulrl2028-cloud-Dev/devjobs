"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/app-context";

export default function CadastroPage() {
  return (
    <Suspense fallback={null}>
      <CadastroContent />
    </Suspense>
  );
}

function CadastroContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, register } = useAuth();

  const initialRole = searchParams.get("role") === "company" ? "company" : "candidate";
  const [role, setRole] = useState<"candidate" | "company">(initialRole);
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
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
            Olá, <strong>{user.name}</strong>! Sua conta está ativa.
          </p>
          <div className="form-row form-row--center">
            <Link href="/" className="btn btn--primary">
              Explorar vagas
            </Link>
            {user.role === "company" && (
              <Link href="/dashboard" className="btn btn--ghost">
                Ir para o painel
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      setSubmitting(false);
      return;
    }

    const result = await register(role, {
      name,
      email,
      password,
      companyName: role === "company" ? companyName || name : undefined,
    });
    setSubmitting(false);

    if (result.ok) {
      router.push(role === "company" ? "/dashboard" : "/");
      router.refresh();
    } else {
      setError(result.error ?? "Não foi possível criar a conta.");
    }
  }

  return (
    <div className="container">
      <div className="login-card">
        <h1>Criar conta</h1>
        <p className="login-subtitle">
          Sou…
        </p>

        <div className="role-tabs" role="tablist" aria-label="Tipo de conta">
          <button
            type="button"
            role="tab"
            aria-selected={role === "candidate"}
            className={`role-tab ${role === "candidate" ? "role-tab--active" : ""}`}
            onClick={() => setRole("candidate")}
          >
            Candidato(a)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={role === "company"}
            className={`role-tab ${role === "company" ? "role-tab--active" : ""}`}
            onClick={() => setRole("company")}
          >
            Empresa
          </button>
        </div>

        {error && <div className="alert alert--error">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          {role === "company" && (
            <div className="field">
              <label htmlFor="companyName">Nome da empresa</label>
              <input
                id="companyName"
                type="text"
                required
                placeholder="Ex.: Minha Tech Ltda"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>
          )}

          <div className="field">
            <label htmlFor="name">{role === "company" ? "Nome do responsável" : "Nome completo"}</label>
            <input
              id="name"
              type="text"
              required
              placeholder="Seu nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

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
              autoComplete="new-password"
              required
              minLength={6}
              placeholder="Mínimo de 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
            {submitting ? "Criando conta…" : "Criar conta"}
          </button>
        </form>

        <p className="login-foot">
          Já tem conta?{" "}
          <Link href="/login" className="link">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}