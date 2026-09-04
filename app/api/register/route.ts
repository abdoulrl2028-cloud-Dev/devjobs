import { NextRequest, NextResponse } from "next/server";
import {
  createSessionToken,
  isSameOrigin,
  isValidEmail,
  sessionCookie,
} from "@/lib/auth";
import { ensureDatabaseReady } from "@/lib/db/init";
import { createUser, getUserByEmail } from "@/lib/db/users";
import { createCompany } from "@/lib/db/company";
import { upsertProfile } from "@/lib/db/candidates";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 8192;

type RegisterBody = {
  name?: unknown;
  email?: unknown;
  password?: unknown;
  role?: unknown;
  companyName?: unknown;
};

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Origem não permitida" }, { status: 403 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Corpo da requisição muito grande" }, { status: 413 });
  }

  let body: RegisterBody;
  try {
    body = (await request.json()) as RegisterBody;
  } catch {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const role = body.role === "company" ? "company" : body.role === "admin" ? "candidate" : "candidate";
  const companyName =
    typeof body.companyName === "string" ? body.companyName.trim() : "";

  if (!isValidEmail(email) || !name || password.length < 6) {
    return NextResponse.json(
      { error: "Informe nome, e-mail válido e senha com pelo menos 6 caracteres." },
      { status: 400 }
    );
  }

  await ensureDatabaseReady();

  const existing = await getUserByEmail(email);
  if (existing) {
    return NextResponse.json(
      { error: "Já existe uma conta com este e-mail." },
      { status: 409 }
    );
  }

  const user = await createUser({ email, password, role, name });

  let company = null;
  let profile = null;

  if (role === "company") {
    company = await createCompany({
      userId: user.id,
      name: companyName || name || "Minha Empresa",
    });
  } else {
    profile = await upsertProfile({
      userId: user.id,
      fullName: name,
      headline: "Profissional de tecnologia",
      skills: [],
      experience: "0-1",
      availableRemote: true,
    });
  }

  const token = createSessionToken(user);
  const response = NextResponse.json({
    data: {
      user,
      message: "Conta criada com sucesso.",
      company: company ? { id: company.id, name: company.name } : null,
      profile: profile ? { id: profile.id } : null,
    },
  });
  response.cookies.set(sessionCookie.name, token, sessionCookie.options(7 * 86400));
  response.headers.set("Cache-Control", "no-store");
  return response;
}