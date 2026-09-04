"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { CandidateProfile, Company, Plan } from "@/lib/types";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: "candidate" | "company" | "admin";
};

type AuthContextValue = {
  user: AuthUser | null;
  company: Company | null;
  plan: Plan | null;
  profile: CandidateProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  register: (
    type: "candidate" | "company",
    data: { name: string; email: string; password: string; companyName?: string }
  ) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

type FavoritesContextValue = {
  favorites: string[];
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const FavoritesContext = createContext<FavoritesContextValue | null>(null);

const FAVORITES_KEY = "devjobs_favorites";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const json = await res.json();
      setUser(json.data?.user ?? null);
      setCompany(json.data?.company ?? null);
      setPlan(json.data?.plan ?? null);
      setProfile(json.data?.profile ?? null);
    } catch {
      setUser(null);
      setCompany(null);
      setPlan(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json();
    if (!res.ok) return { ok: false, error: json.error };
    await refresh();
    return { ok: true };
  }, [refresh]);

  const register = useCallback(
    async (
      type: "candidate" | "company",
      data: { name: string; email: string; password: string; companyName?: string }
    ) => {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, ...data }),
      });
      const json = await res.json();
      if (!res.ok) return { ok: false, error: json.error };
      await refresh();
      return { ok: true };
    },
    [refresh]
  );

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setCompany(null);
    setPlan(null);
    setProfile(null);
  }, []);

  const value = useMemo(
    () => ({ user, company, plan, profile, loading, login, register, logout, refresh }),
    [user, company, plan, profile, loading, login, register, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const [favorites, setFavorites] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const syncingRef = useRef(false);

  const apply = useCallback((next: string[]) => {
    setFavorites(next);
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
    } catch {
      // ignore storage errors
    }
  }, []);

  // Carrega favoritos do dispositivo (convidados) ou do servidor (logados).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(FAVORITES_KEY);
      const local = raw ? (JSON.parse(raw) as string[]) : [];
      if (!user || loading) {
        setFavorites(local);
        setHydrated(true);
        return;
      }
      // Usuário logado: o servidor é a fonte da verdade.
      fetch("/api/favorites", { cache: "no-store" })
        .then((r) => r.json())
        .then((json) => {
          const jobs: { id: string }[] | undefined = json?.data;
          apply((jobs ?? []).map((j) => j.id));
        })
        .catch(() => apply(local))
        .finally(() => setHydrated(true));
    } catch {
      setFavorites([]);
      setHydrated(true);
    }
  }, [user, loading, apply]);

  const toggleFavorite = useCallback(
    (id: string) => {
      const remove = favorites.includes(id);
      const nextFavorites = remove ? favorites.filter((f) => f !== id) : [...favorites, id];
      apply(nextFavorites);
      if (user && !syncingRef.current) {
        syncingRef.current = true;
        fetch(`/api/favorites?jobId=${encodeURIComponent(id)}`, {
          method: remove ? "DELETE" : "POST",
        })
          .catch(() => apply(remove ? [...nextFavorites, id] : nextFavorites.filter((f) => f !== id)))
          .finally(() => {
            syncingRef.current = false;
          });
      }
    },
    [favorites, user, apply]
  );

  const isFavorite = useCallback((id: string) => favorites.includes(id), [favorites]);

  const value = useMemo(
    () => ({ favorites: hydrated ? favorites : [], isFavorite, toggleFavorite }),
    [favorites, hydrated, isFavorite, toggleFavorite]
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites deve ser usado dentro de FavoritesProvider");
  return ctx;
}