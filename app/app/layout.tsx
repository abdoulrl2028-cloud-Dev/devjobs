"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/app-context";
import { ToastProvider } from "@/lib/toast-context";
import AppShell from "@/components/app-shell/AppShell";

export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login?next=/app");
      return;
    }
    if (user.role !== "candidate") {
      router.replace("/");
      return;
    }
  }, [user, loading, router]);

  if (loading || !user || user.role !== "candidate") {
    return (
      <div className="app-loading">
        <span className="app-loading__spinner" />
        <p>Carregando seu painel…</p>
      </div>
    );
  }

  return (
    <ToastProvider>
      <AppShell>{children}</AppShell>
    </ToastProvider>
  );
}