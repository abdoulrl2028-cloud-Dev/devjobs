import { NextRequest, NextResponse } from "next/server";

export type RateLimitRule = {
  limit: number;
  windowSeconds: number;
};

export type RateLimitOutcome = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

// Janela deslizante em memória (por instância). Suficiente para proteger
// login contra brute-force e a API contra scraping agressivo.
const hits = new Map<string, number[]>();
const MAX_BUCKETS = 10000;
const CLEANUP_INTERVAL_MS = 60000;
let lastCleanup = Date.now();

function slidingWindow(key: string, rule: RateLimitRule): RateLimitOutcome {
  const now = Date.now();
  const windowMs = rule.windowSeconds * 1000;
  const windowStart = now - windowMs;

  const timestamps = (hits.get(key) ?? []).filter((t) => t > windowStart);

  if (timestamps.length >= rule.limit) {
    hits.set(key, timestamps);
    return {
      success: false,
      limit: rule.limit,
      remaining: 0,
      reset: Math.floor((timestamps[0] + windowMs) / 1000),
    };
  }

  timestamps.push(now);
  // Mantém o array com tamanho limitado.
  if (timestamps.length > rule.limit * 2) {
    timestamps.splice(0, timestamps.length - rule.limit);
  }
  hits.set(key, timestamps);

  // Limpeza periódica de chaves antigas para evitar vazamento de memória.
  if (now - lastCleanup > CLEANUP_INTERVAL_MS) {
    lastCleanup = now;
    if (hits.size > MAX_BUCKETS) {
      for (const [k, v] of hits) {
        if (v.every((t) => t <= now - windowMs)) hits.delete(k);
      }
    }
  }

  return {
    success: true,
    limit: rule.limit,
    remaining: Math.max(rule.limit - timestamps.length, 0),
    reset: Math.floor((timestamps[0] + windowMs) / 1000),
  };
}

// IP real do cliente. A Vercel define x-forwarded-for no edge; em outras
// hospedagens x-real-ip é usado por proxies. Não confiamos no cliente.
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export function checkRateLimit(
  request: NextRequest,
  rule: RateLimitRule
): NextResponse | null {
  const key = `${request.nextUrl.pathname}:${getClientIP(request)}`;
  const outcome = slidingWindow(key, rule);

  if (outcome.success) return null;

  return NextResponse.json(
    { error: "Muitas requisições. Tente novamente em instantes." },
    {
      status: 429,
      headers: {
        "Retry-After": String(
          Math.max(outcome.reset - Math.floor(Date.now() / 1000), 1)
        ),
        "X-RateLimit-Limit": String(outcome.limit),
        "X-RateLimit-Remaining": "0",
      },
    }
  );
}