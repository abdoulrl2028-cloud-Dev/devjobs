import { queryAll, queryOne, execute } from "./conn";
import { newId } from "../crypto";
import type { RealtimeEvent, RealtimeEventType, RealtimeEventPayload } from "../events";

export async function insertRealtimeEvent(
  userId: string | null,
  type: RealtimeEventType,
  payload: RealtimeEventPayload
): Promise<RealtimeEvent> {
  const id = newId("evt");
  const createdAt = new Date().toISOString();
  await execute(
    "INSERT INTO realtime_events (id, user_id, type, payload, created_at) VALUES (?, ?, ?, ?, ?)",
    [id, userId, type, JSON.stringify(payload), createdAt]
  );
  return { id, userId, type, payload, createdAt };
}

// Eventos para um usuário criados após um determinado marcador ISO (ex.: Last-Event-ID).
export async function listRealtimeEventsSince(
  userId: string,
  sinceIso: string,
  limit = 100
): Promise<RealtimeEvent[]> {
  const rows = await queryAll(
    "SELECT id, user_id, type, payload, created_at FROM realtime_events WHERE user_id = ? AND created_at > ? ORDER BY created_at ASC LIMIT ?",
    [userId, sinceIso, limit]
  );
  return rows.map((row) => ({
    id: String(row.id),
    userId: row.user_id ? String(row.user_id) : null,
    type: row.type as RealtimeEventType,
    payload: parsePayload(row.payload),
    createdAt: String(row.created_at),
  }));
}

// Eventos broadcast (user_id nulo) para todos os usuários.
export async function listBroadcastEventsSince(sinceIso: string, limit = 100): Promise<RealtimeEvent[]> {
  const rows = await queryAll(
    "SELECT id, user_id, type, payload, created_at FROM realtime_events WHERE user_id IS NULL AND created_at > ? ORDER BY created_at ASC LIMIT ?",
    [sinceIso, limit]
  );
  return rows.map((row) => ({
    id: String(row.id),
    userId: row.user_id ? String(row.user_id) : null,
    type: row.type as RealtimeEventType,
    payload: parsePayload(row.payload),
    createdAt: String(row.created_at),
  }));
}

// Último marcador (last event) de um usuário — baseado no evento mais recente.
export async function latestRealtimeWatermark(userId: string): Promise<string | null> {
  const row = await queryOne(
    "SELECT MAX(created_at) AS w FROM realtime_events WHERE user_id = ?",
    [userId]
  );
  return row?.w ? String(row.w) : null;
}

function parsePayload(raw: unknown): RealtimeEventPayload {
  try {
    return JSON.parse(String(raw ?? "{}")) as RealtimeEventPayload;
  } catch {
    return {};
  }
}