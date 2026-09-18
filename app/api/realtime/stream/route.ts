import { NextRequest } from "next/server";
import { readSessionUserFromRequest } from "@/lib/auth";
import { ensureDatabaseReady } from "@/lib/db/init";
import { listRealtimeEventsSince, listBroadcastEventsSince } from "@/lib/db/events";
import { encodeSse, sseHeartbeat, decodeLastEventId } from "@/lib/events";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Streaming de eventos em tempo real (SSE) para o usuário autenticado.
// Em produção (Vercel serverless) as conexões longas são limitadas, então
// o cliente também faz fallback de polling em /api/me/notifications.
export async function GET(request: NextRequest) {
  const user = readSessionUserFromRequest(request);
  if (!user) {
    return new Response("Unauthorized", { status: 401, headers: { "content-type": "text/plain; charset=utf-8" } });
  }
  await ensureDatabaseReady();

  const userId = user.id;
  const lastEventId = decodeLastEventId(request.headers.get("last-event-id"));

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let cursor = lastEventId;
      let closed = false;

      const flush = async () => {
        if (closed) return;
        try {
          const [mine, broadcast] = await Promise.all([
            listRealtimeEventsSince(userId, cursor),
            listBroadcastEventsSince(cursor),
          ]);
          if (closed) return;
          const events = [...mine, ...broadcast].filter(
            (e, i, arr) => arr.findIndex((x) => x.id === e.id) === i
          );
          for (const event of events) {
            controller.enqueue(encoder.encode(encodeSse(event)));
            if (event.createdAt > cursor) cursor = event.createdAt;
          }
          controller.enqueue(encoder.encode(sseHeartbeat()));
        } catch {
          // Erro isolado: mantém conexão até o próximo ciclo.
        }
      };

      await flush();

      const timer = setInterval(() => {
        void flush();
      }, 15000);

      request.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(timer);
        try {
          controller.close();
        } catch {
          // já fechado
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "connection": "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}