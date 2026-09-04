import { NextRequest, NextResponse } from "next/server";
import {
  createSessionToken,
  verifyCredentials,
  sessionCookie,
  isSameOrigin,
  hasValidCredentialsShape,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 2048;

export async function POST(request: NextRequest) {
  // Proteção CSRF: recusa requisições vindas de outras origens.
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Origem não permitida" }, { status: 403 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Corpo da requisição muito grande" }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 });
  }

  const email = typeof body === "object" && body !== null ? (body as { email?: unknown }).email : undefined;
  const password = typeof body === "object" && body !== null ? (body as { password?: unknown }).password : undefined;

  if (!hasValidCredentialsShape(email, password)) {
    return NextResponse.json({ error: "E-mail ou senha inválidos" }, { status: 400 });
  }

  const user = verifyCredentials(email as string, password as string);

  // Atraso constante para dificultar brute-force e enumeração de usuários.
  await new Promise((resolve) => setTimeout(resolve, 250));

  if (!user) {
    return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
  }

  const token = createSessionToken(user);
  const response = NextResponse.json({
    data: { user, message: "Login realizado com sucesso" },
  });
  response.cookies.set(sessionCookie.name, token, sessionCookie.options(7 * 86400));
  response.headers.set("Cache-Control", "no-store");
  return response;
}