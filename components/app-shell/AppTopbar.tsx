"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/app-context";
import ThemeToggle from "@/components/ThemeToggle";
import { APP_NAV } from "./AppShell";
import type { Job } from "@/lib/types";

export default function AppTopbar() {
  const { user } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const [notifications, setNotifications] = useState<
    Array<{ id: string; type: string; title: string; body: string | null; jobId: string | null; read: boolean; createdAt: string }>
  >([]);
  const [showNotif, setShowNotif] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  async function loadNotifications() {
    try {
      const res = await fetch("/api/me/notifications", { cache: "no-store" });
      const json = await res.json();
      setNotifications(json.data?.items ?? []);
      setUnread(json.data?.unread ?? 0);
    } catch {
      // silencioso
    }
  }

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else setQuery("");
  }, [open]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotif(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function searchJobs(q: string) {
    setQuery(q);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      const terms = q.trim();
      if (!terms) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`/api/jobs?q=${encodeURIComponent(terms)}`, { cache: "no-store" });
        const json = await res.json();
        setResults(json.data?.slice(0, 8) ?? []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }

  function goTo(path: string) {
    setOpen(false);
    router.push(path);
  }

  async function markAllRead() {
    try {
      await fetch("/api/me/notifications/read-all", { method: "PATCH" });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnread(0);
    } catch {
      // silencioso
    }
  }

  async function openNotification(n: { id: string; jobId: string | null }) {
    if (!n.id) return;
    if (n.jobId) {
      await fetch(`/api/me/notifications/${n.id}/read`, { method: "PATCH" }).catch(() => undefined);
      router.push(`/vagas/${n.jobId}`);
    } else {
      await fetch(`/api/me/notifications/${n.id}/read`, { method: "PATCH" }).catch(() => undefined);
    }
    setShowNotif(false);
    loadNotifications();
  }

  if (!user) return null;

  return (
    <div className="app-topbar">
      <button type="button" className="app-search-trigger" onClick={() => setOpen(true)}>
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="m20 20-3.2-3.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <span>Buscar vagas…</span>
        <kbd>Ctrl K</kbd>
      </button>

      <div className="app-topbar__right">
        <div className="app-notif" ref={notifRef}>
          <button
            type="button"
            className="app-icon-btn"
            aria-label="Notificações"
            onClick={() => setShowNotif((v) => !v)}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path d="M15 17h5l-1.4-1.4A2 2 0 0118 14V9a6 6 0 10-12 0v5c0 .5-.2 1-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {unread > 0 && <span className="app-notif__badge">{unread > 9 ? "9+" : unread}</span>}
          </button>

          {showNotif && (
            <div className="app-notif__panel">
              <div className="app-notif__head">
                <strong>Notificações</strong>
                {unread > 0 && (
                  <button type="button" className="btn btn--ghost btn--xs" onClick={markAllRead}>
                    Marcar todas
                  </button>
                )}
              </div>
              {notifications.length === 0 ? (
                <p className="app-notif__empty">Você não tem notificações.</p>
              ) : (
                <ul>
                  {notifications.slice(0, 12).map((n) => (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => openNotification(n)}
                        className={`app-notif__item ${n.read ? "" : "app-notif__item--unread"}`}
                      >
                        <span className={`app-notif__dot app-notif__dot--${n.type}`} />
                        <span>
                          <strong>{n.title}</strong>
                          {n.body && <small>{n.body}</small>}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <ThemeToggle />

        <button
          type="button"
          className="app-avatar"
          title={user.name}
          onClick={() => router.push("/app/perfil")}
        >
          {user.name
            .split(" ")
            .map((n: string) => n[0])
            .slice(0, 2)
            .join("")
            .toUpperCase()}
        </button>
      </div>

      {open && (
        <div className="cmd-overlay" onClick={() => setOpen(false)}>
          <div className="cmd-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cmd-input-wrap">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
                <path d="m20 20-3.2-3.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <input
                ref={inputRef}
                type="search"
                placeholder="Buscar cargo, empresa ou skill…"
                value={query}
                onChange={(e) => searchJobs(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setOpen(false);
                }}
              />
              <kbd>esc</kbd>
            </div>

            <div className="cmd-body">
              <p className="cmd-hint">
                Ou navegue:{" "}
                {APP_NAV.slice(0, 6).map((item) => (
                  <button key={item.href} type="button" className="cmd-chip" onClick={() => goTo(item.href)}>
                    {item.label}
                  </button>
                ))}
              </p>

              {loading ? (
                <p className="cmd-status">Buscando…</p>
              ) : query.trim() ? (
                results.length === 0 ? (
                  <p className="cmd-status">Nenhuma vaga encontrada.</p>
                ) : (
                  <ul className="cmd-results">
                    {results.map((job) => (
                      <li key={job.id}>
                        <button type="button" onClick={() => goTo(`/vagas/${job.id}`)}>
                          <span className="cmd-result__company">{job.company}</span>
                          <strong>{job.title}</strong>
                          <small>
                            {job.location} · {job.remote ? "Remoto" : "Presencial"}
                          </small>
                        </button>
                      </li>
                    ))}
                  </ul>
                )
              ) : (
                <p className="cmd-status">Digite para buscar. Pressione Ctrl/Cmd + K para abrir.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}