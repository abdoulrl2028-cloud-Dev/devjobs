import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

export const config = {
  // Intercepta apenas chamadas de API.
  matcher: ["/api/:path*"],
};

export default function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Regras por sensibilidade:
  // - Login/cadastro: proteção contra brute-force (5/min por IP).
  // - Demais rotas de auth: 30/min.
  // - API geral: proteção anti scraping (120/min).
  const rule =
    path.startsWith("/api/auth/login") || path.startsWith("/api/register")
      ? { limit: 5, windowSeconds: 60 }
      : path.startsWith("/api/auth/")
        ? { limit: 30, windowSeconds: 60 }
        : { limit: 120, windowSeconds: 60 };

  const blocked = checkRateLimit(request, rule);
  if (blocked) return blocked;

  return NextResponse.next();
}