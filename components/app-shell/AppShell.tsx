"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import AppTopbar from "./AppTopbar";

export const APP_NAV = [
  { href: "/app", label: "Dashboard", icon: "M3 12l9-9 9 9M5 10v10h5v-6h4v6h5V10" },
  { href: "/app/vagas", label: "Buscar vagas", icon: "M21 21l-4.3-4.3M17 10a7 7 0 11-14 0 7 7 0 0114 0z", badge: "search" },
  { href: "/app/recomendadas", label: "Recomendadas", icon: "M8 21h8M12 17v4M12 2l7 4v5c0 5-3.5 8-7 8s-7-3-7-8V6l7-4z" },
  { href: "/app/salvos", label: "Vagas salvas", icon: "M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z" },
  { href: "/app/candidaturas", label: "Candidaturas", icon: "M4 5h16M4 12h16M4 19h10M14 16l4 4 4-4" },
  { href: "/app/entrevistas", label: "Entrevistas", icon: "M12 6v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  { href: "/app/alertas", label: "Alertas", icon: "M15 17h5l-1.4-1.4A2 2 0 0118 14V9a6 6 0 10-12 0v5c0 .5-.2 1-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1" },
  { href: "/app/empresas", label: "Empresas", icon: "M3 21V8l7-5 7 5v13M3 21h18M9 9h.01M15 9h.01M9 21v-5h6v5" },
  { href: "/app/curriculos", label: "Meu currículo", icon: "M9 12h6M9 16h6M7 3h8l6 6v12a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2zm8 0v6h6" },
  { href: "/app/perfil", label: "Meu perfil", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
  { href: "/app/analytics", label: "Analytics", icon: "M3 3v18h18M7 14l3-3 3 3 5-6" },
  { href: "/app/configuracoes", label: "Configurações", icon: "M12 15a3 3 0 100-6 3 3 0 000 6zm8-3a8 8 0 01-.16 1.56l1.88 1.47-2 3.46-2.22-.9a8 8 0 01-2.7 1.56L14.5 21h-4l-.3-2.25a8 8 0 01-2.7-1.56l-2.22.9-2-3.46 1.88-1.47A8 8 0 014 12" },
];

export const APP_PATH_META: Record<string, string> = {
  "/app": "Dashboard",
  "/app/vagas": "Buscar vagas",
  "/app/recomendadas": "Recomendadas para você",
  "/app/salvos": "Vagas salvas",
  "/app/candidaturas": "Candidaturas",
  "/app/entrevistas": "Entrevistas",
  "/app/alertas": "Alertas de vagas",
  "/app/empresas": "Empresas",
  "/app/curriculos": "Meu currículo",
  "/app/perfil": "Meu perfil",
  "/app/analytics": "Analytics",
  "/app/configuracoes": "Configurações",
};

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <Link href="/" className="app-brand" aria-label="DevJobs">
          <span className="brand-mark" aria-hidden="true">
            {"</>"}
          </span>
          <span className="app-brand__name">
            DevJobs <small>Premium</small>
          </span>
        </Link>

        <nav className="app-nav" aria-label="Menu do app">
          {APP_NAV.map((item) => {
            const active =
              item.href === "/app"
                ? pathname === "/app"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`app-nav__link ${active ? "app-nav__link--active" : ""}`}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d={item.icon}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="app-sidebar__foot">
          <Link href="/" className="app-sidebar__link">
            ← Voltar ao site público
          </Link>
        </div>
      </aside>

      <div className="app-main">
        <AppTopbar />
        <div className="app-content">{children}</div>
      </div>
    </div>
  );
}