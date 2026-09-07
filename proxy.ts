import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

export const config = {
  // Intercepta apenas chamadas de API.
  matcher: ["/api/:path*"],
};

const SECURITY_HEADERS: Array<[string, string]> = [
  ["X-Frame-Options", "DENY"],
  ["X-Content-Type-Options", "nosniff"],
  ["Referrer-Policy", "strict-origin-when-cross-origin"],
  ["Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=(), fullscreen=(self)"],
  ["Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload"],
  ["Cross-Origin-Opener-Policy", "same-origin"],
  ["Cross-Origin-Resource-Policy", "same-origin"],
  [
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "upgrade-insecure-requests",
    ].join("; "),
  ],
];

function applySecurityHeaders(response: NextResponse): NextResponse {
  if (response.headers.has("Content-Security-Policy")) return response;
  for (const [key, value] of SECURITY_HEADERS) {
    if (!response.headers.has(key)) {
      response.headers.set(key, value);
    }
  }
  return response;
}

export default function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Regras por sensibilidade:
  // - Login/cadastro: proteção contra brute-force (5/min por IP).
  // - Demais rotas de auth: 30/min.
  // - Candidatura/publicação: 30/min (evita spam).
  // - Checkout/cupom: 60/min.
  // - API geral: proteção anti scraping (120/min).
  const rule =
    path.startsWith("/api/auth/login") || path.startsWith("/api/register")
      ? { limit: 5, windowSeconds: 60 }
      : path.startsWith("/api/auth/")
        ? { limit: 30, windowSeconds: 60 }
        : path.startsWith("/api/jobs/") && path.endsWith("/apply")
          ? { limit: 30, windowSeconds: 60 }
          : path.startsWith("/api/company/jobs")
            ? { limit: 30, windowSeconds: 60 }
            : path.startsWith("/api/checkout") || path.startsWith("/api/coupons")
              ? { limit: 60, windowSeconds: 60 }
              : { limit: 120, windowSeconds: 60 };

  const blocked = checkRateLimit(request, rule);
  if (blocked) return applySecurityHeaders(blocked);

  return applySecurityHeaders(NextResponse.next());
}