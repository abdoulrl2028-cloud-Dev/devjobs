"use client";

import { useCallback, useEffect, useState } from "react";
import type { Alert, JobType } from "@/lib/types";

type AlertItem = Alert;

const FREQ_LABEL: Record<string, string> = {
  daily: "Diário",
  weekly: "Semanal",
  monthly: "Mensal",
};

const EMPTY_FORM = {
  name: "",
  query: "",
  location: "",
  remote: false,
  type: "",
  salaryMin: "",
  frequency: "daily",
};

export default function AlertasPage() {
  const [items, setItems] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/me/alerts", { cache: "no-store" });
    if (!res.ok) return;
    const json = await res.json();
    setItems(json.data.items ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.query.trim()) {
      setError("Informe a busca do alerta (ex.: “React remoto”).");
      return;
    }
    setSaving(true);
    const payload = {
      ...(editingId ? { id: editingId } : {}),
      name: form.name || form.query,
      query: form.query,
      location: form.location || null,
      remote: form.remote,
      type: form.type || null,
      salaryMin: form.salaryMin ? Number(form.salaryMin) : null,
      frequency: form.frequency,
      active: true,
    };
    const res = await fetch("/api/me/alerts", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (res.ok) {
      setForm({ ...EMPTY_FORM });
      setEditingId(null);
      load();
    } else {
      const j = await res.json();
      setError(j.error ?? "Não foi possível salvar o alerta.");
    }
  };

  const edit = (a: AlertItem) => {
    setEditingId(a.id);
    setForm({
      name: a.name,
      query: a.query,
      location: a.location ?? "",
      remote: a.remote,
      type: a.type ?? "",
      salaryMin: a.salaryMin ? String(a.salaryMin) : "",
      frequency: a.frequency,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggle = async (a: AlertItem) => {
    await fetch("/api/me/alerts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: a.id, active: !a.active }),
    });
    load();
  };

  const remove = async (id: string) => {
    await fetch(`/api/me/alerts?id=${id}`, { method: "DELETE" });
    if (editingId === id) {
      setEditingId(null);
      setForm({ ...EMPTY_FORM });
    }
    load();
  };

  const test = async (a: AlertItem) => {
    await fetch("/api/me/alerts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: a.id, test: true }),
    });
    await fetch("/api/me/notifications/read-all", { method: "PATCH" }).catch(() => {});
    load();
  };

  return (
    <div className="alerts-page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Alertas de vagas</h1>
          <p className="page-sub">
            Crie buscas salvas e receba notificações quando surgirem vagas compatíveis.
          </p>
        </div>
      </div>

      <form className="app-card alert-form" onSubmit={submit}>
        <h3>{editingId ? "Editar alerta" : "Novo alerta"}</h3>
        <div className="form-row">
          <label>
            Nome (opcional)
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex.: Vagas React sênior"
            />
          </label>
        </div>
        <div className="form-row">
          <label>
            Busca
            <input
              value={form.query}
              onChange={(e) => setForm({ ...form, query: e.target.value })}
              placeholder='Ex.: "React acima de R$ 10.000", "estágio São Paulo", "Node.js remoto"'
              required
            />
          </label>
        </div>
        <div className="form-row form-row--split">
          <label>
            Cidade
            <input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="Todas"
            />
          </label>
          <label>
            Tipo
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              <option value="">Todos os tipos</option>
              <option value="full-time">Tempo integral</option>
              <option value="part-time">Meio período</option>
              <option value="contract">Contrato</option>
              <option value="internship">Estágio</option>
            </select>
          </label>
          <label>
            Salário mínimo
            <input
              type="number"
              min={0}
              step={500}
              value={form.salaryMin}
              onChange={(e) => setForm({ ...form, salaryMin: e.target.value })}
              placeholder="Opcional"
            />
          </label>
        </div>
        <div className="form-row form-row--split">
          <label className="checkbox">
            <input
              type="checkbox"
              checked={form.remote}
              onChange={(e) => setForm({ ...form, remote: e.target.checked })}
            />
            <span>Somente remoto</span>
          </label>
          <label>
            Frequência
            <select
              value={form.frequency}
              onChange={(e) => setForm({ ...form, frequency: e.target.value })}
            >
              <option value="daily">Diário</option>
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensal</option>
            </select>
          </label>
        </div>
        {error && <p className="app-error">{error}</p>}
        <div className="form-actions">
          {editingId && (
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => {
                setEditingId(null);
                setForm({ ...EMPTY_FORM });
              }}
            >
              Cancelar edição
            </button>
          )}
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? "Salvando…" : editingId ? "Salvar alterações" : "Criar alerta"}
          </button>
        </div>
      </form>

      <div className="alerts-list">
        {loading ? (
          <div className="app-loading" role="status">
            <span className="spinner" /> Carregando alertas…
          </div>
        ) : items.length === 0 ? (
          <div className="app-empty">
            <p>Nenhum alerta criado. Crie o primeiro acima para acompanhar novas vagas.</p>
          </div>
        ) : (
          items.map((a) => (
            <article key={a.id} className={`app-card alert-card ${!a.active ? "alert-card--off" : ""}`}>
              <div className="alert-card__head">
                <div>
                  <h4>{a.name}</h4>
                  <p className="alert-card__query">“{a.query}”</p>
                </div>
                <span className="alert-card__freq">{FREQ_LABEL[a.frequency] ?? a.frequency}</span>
              </div>
              <div className="alert-card__meta">
                {a.location && <span>📍 {a.location}</span>}
                {a.remote && <span>Remoto</span>}
                {a.type && <span className="tag">{a.type}</span>}
                {a.salaryMin && (
                  <span>
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(a.salaryMin)}+
                  </span>
                )}
              </div>
              <div className="alert-card__actions">
                <button
                  className={`btn btn--ghost btn--sm ${a.active ? "is-on" : ""}`}
                  onClick={() => toggle(a)}
                >
                  {a.active ? "Ativo" : "Pausado"}
                </button>
                <button className="btn btn--ghost btn--sm" onClick={() => test(a)}>
                  🔔 Testar
                </button>
                <button className="btn btn--ghost btn--sm" onClick={() => edit(a)}>
                  Editar
                </button>
                <button className="btn btn--ghost btn--sm btn--danger" onClick={() => remove(a.id)}>
                  Excluir
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}