// Motor de eventos em tempo real (SSE).
type X = { [key: string]: string | number | boolean | null | object };

export type RealtimeEventType =
  | "job.created"
  | "job.updated"
  | "job.expired"
  | "application.created"
  | "application.updated"
  | "interview.started"
  | "interview.answered"
  | "interview.completed"
  | "interview.scheduled"
  | "interview.updated"
  | "interview.cancelled"
  | "interview.reminder"
  | "resume.created"
  | "resume.updated"
  | "resume.deleted"
  | "company.viewed_application"
  | "company.message"
  | "notification.created"
  | "consent.updated";

export type RealtimeEventPayload = X;

export type RealtimeEvent = {
  id: string;
  userId: string | null; // null = broadcast (todas as plataformas)
  type: RealtimeEventType;
  payload: RealtimeEventPayload;
  createdAt: string;
};

// Formata um evento como linha SSE.
export function encodeSse(event: RealtimeEvent): string {
  const data = JSON.stringify({
    id: event.id,
    type: event.type,
    payload: event.payload,
    createdAt: event.createdAt,
  });
  return `id: ${event.id}\ndata: ${data}\n\n`;
}

// Marcador opcional: prefixo menor que o watermark anterior é normal.
export function decodeLastEventId(header: string | null): string {
  if (!header) return "1970-01-01T00:00:00.000Z";
  const date = new Date(header);
  return Number.isNaN(date.getTime()) ? "1970-01-01T00:00:00.000Z" : date.toISOString();
}

export function sseHeartbeat(): string {
  return `: ping\n\n`;
}