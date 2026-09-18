import { queryAll, queryOne, execute } from "./conn";
import { newId } from "../crypto";

export type Message = {
  id: string;
  applicationId: string | null;
  senderId: string;
  recipientId: string;
  body: string;
  channel: string;
  read: boolean;
  createdAt: string;
};

function toMessage(row: Record<string, unknown>): Message {
  return {
    id: String(row.id),
    applicationId: (row.application_id as string | null) ?? null,
    senderId: String(row.sender_id),
    recipientId: String(row.recipient_id),
    body: String(row.body),
    channel: String(row.channel ?? "inapp"),
    read: Number(row.read) === 1,
    createdAt: String(row.created_at),
  };
}

export async function createMessage(input: {
  applicationId: string | null;
  senderId: string;
  recipientId: string;
  body: string;
  channel?: string;
}): Promise<Message> {
  const id = newId("msg");
  const createdAt = new Date().toISOString();
  await execute(
    `INSERT INTO messages (id, application_id, sender_id, recipient_id, body, channel, read, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
    [id, input.applicationId, input.senderId, input.recipientId, input.body, input.channel ?? "inapp", createdAt]
  );
  return {
    id,
    applicationId: input.applicationId,
    senderId: input.senderId,
    recipientId: input.recipientId,
    body: input.body,
    channel: input.channel ?? "inapp",
    read: false,
    createdAt,
  };
}

export async function listMessagesForApplication(applicationId: string): Promise<Message[]> {
  const rows = await queryAll(
    "SELECT * FROM messages WHERE application_id = ? ORDER BY created_at ASC",
    [applicationId]
  );
  return rows.map(toMessage);
}

export async function listMessagesForUser(userId: string, limit = 50): Promise<Message[]> {
  const rows = await queryAll(
    "SELECT * FROM messages WHERE recipient_id = ? ORDER BY created_at DESC LIMIT ?",
    [userId, limit]
  );
  return rows.map(toMessage);
}

export async function getMessage(id: string): Promise<Message | undefined> {
  const row = await queryOne("SELECT * FROM messages WHERE id = ?", [id]);
  return row ? toMessage(row) : undefined;
}