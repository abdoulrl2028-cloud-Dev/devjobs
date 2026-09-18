import { queryAll, queryOne, execute } from "./conn";
import { newId } from "../crypto";

export type Consent = {
  id: string;
  userId: string;
  type: string;
  target: string | null;
  granted: boolean;
  createdAt: string;
  updatedAt: string;
};

function toConsent(row: Record<string, unknown>): Consent {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    type: String(row.type),
    target: (row.target as string | null) ?? null,
    granted: Number(row.granted) === 1,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export type ConsentInput = {
  userId: string;
  type: string;
  target?: string | null;
  granted: boolean;
};

export async function upsertConsent(input: ConsentInput): Promise<Consent> {
  const existing = await queryOne(
    "SELECT * FROM consents WHERE user_id = ? AND type = ? AND target IS NOT DISTINCT FROM ?",
    [input.userId, input.type, input.target ?? null]
  );
  const now = new Date().toISOString();
  if (existing) {
    const existingId = String(existing.id);
    await execute(
      "UPDATE consents SET granted = ?, updated_at = ? WHERE id = ?",
      [input.granted ? 1 : 0, now, existingId]
    );
    return { ...toConsent(existing), granted: input.granted, updatedAt: now };
  }
  const id = newId("cons");
  await execute(
    `INSERT INTO consents (id, user_id, type, target, granted, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, input.userId, input.type, input.target ?? null, input.granted ? 1 : 0, now, now]
  );
  return {
    id,
    userId: input.userId,
    type: input.type,
    target: input.target ?? null,
    granted: input.granted,
    createdAt: now,
    updatedAt: now,
  };
}

export async function getConsent(
  userId: string,
  type: string,
  target?: string | null
): Promise<Consent | undefined> {
  const row = await queryOne(
    "SELECT * FROM consents WHERE user_id = ? AND type = ? AND target IS NOT DISTINCT FROM ?",
    [userId, type, target ?? null]
  );
  return row ? toConsent(row) : undefined;
}

export async function listConsents(userId: string): Promise<Consent[]> {
  const rows = await queryAll("SELECT * FROM consents WHERE user_id = ? ORDER BY updated_at DESC", [userId]);
  return rows.map(toConsent);
}