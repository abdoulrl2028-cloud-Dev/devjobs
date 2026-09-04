"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/app-context";
import ThemeToggle from "./ThemeToggle";

export default function Header() {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.push("/");
    router.refresh();
  }

  const navLink = (href: string, label: string) => {
    const active = pathname === href || (href !== "/" && pathname.startsWith(href));
    return (
      <Link href={href} className={`nav-link ${active ? "nav-link--active" : ""}`}>
        {label}
      </Link>
    );
  };

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href="/" className="brand" aria-label="DevJobs — início">
          <span className="brand-mark" aria-hidden="true">
            {"</>"}
          </span>
          <span className="brand-name">
            Dev<span>Jobs</span>
          </span>
        </Link>

        <nav className="nav-links" aria-label="Navegação principal">
          {navLink("/", "Vagas")}
          <Link href="/favoritos" className={`nav-link ${pathname === "/favoritos" ? "nav-link--active" : ""}`}>
            Favoritos
          </Link>
        </nav>

        <div className="header-actions">
          <ThemeToggle />
          {loading ? null : user ? (
            <div className="user-menu">
              <span className="user-avatar" title={user.name}>
                {user.name
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </span>
              <button type="button" className="btn btn--ghost btn--sm" onClick={handleLogout}>
                Sair
              </button>
            </div>
          ) : (
            <Link href="/login" className="btn btn--primary btn--sm">
              Entrar
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}