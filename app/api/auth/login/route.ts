import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, verifyCredentials, sessionCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json({ error: "E-mail e senha são obrigatórios" }, { status: 400 });
    }

    const user = verifyCredentials(email, password);
    if (!user) {
      return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
    }

    const token = createSessionToken(user);
    const response = NextResponse.json({
      data: { user, message: "Login realizado com sucesso" },
    });
    response.cookies.set(sessionCookie.name, token, sessionCookie.options(7 * 86400));
    return response;
  } catch {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 });
  }
}