import { NextRequest, NextResponse } from "next/server";
import { requireCandidate } from "@/lib/context";
import { ensureDatabaseReady } from "@/lib/db/init";
import { upsertProfile } from "@/lib/db/candidates";
import { updateUserName } from "@/lib/db/users";

export const dynamic = "force-dynamic";

function asUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const trimmed = value.trim();
  return /^https?:\/\/.+/i.test(trimmed) ? trimmed.slice(0, 500) : null;
}

export async function PUT(request: NextRequest) {
  let rich;
  try {
    rich = await requireCandidate();
  } catch {
    return NextResponse.json({ error: "Faça login como candidato(a) para editar o perfil." }, { status: 401 });
  }
  const { user } = rich;

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 16384) {
    return NextResponse.json({ error: "Corpo da requisição muito grande" }, { status: 413 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 });
  }

  const fullName = typeof body.fullName === "string" && body.fullName.trim() ? body.fullName.trim().slice(0, 100) : user.name;
  const headline = typeof body.headline === "string" && body.headline.trim() ? body.headline.trim().slice(0, 120) : "Profissional de tecnologia";
  const summary = typeof body.summary === "string" ? body.summary.trim().slice(0, 2000) : null;
  const experience = ["0-1", "1-3", "3-5", "5+"].includes(String(body.experience)) ? String(body.experience) : "0-1";
  const location = typeof body.location === "string" ? body.location.trim().slice(0, 120) || null : null;
  const availableRemote = body.availableRemote === true;
  const skills = Array.isArray(body.skills)
    ? (body.skills as string[]).filter((s): s is string => typeof s === "string").map((s) => s.trim().slice(0, 40)).slice(0, 20)
    : [];

  await ensureDatabaseReady();

  await upsertProfile({
    userId: user.id,
    fullName,
    headline,
    summary,
    experience,
    location,
    availableRemote,
    skills,
    githubUrl: asUrl(body.githubUrl),
    linkedinUrl: asUrl(body.linkedinUrl),
    resumeUrl: asUrl(body.resumeUrl),
  });

  if (fullName !== user.name) {
    await updateUserName(user.id, fullName);
  }

  return NextResponse.json({ data: { ok: true, message: "Perfil salvo com sucesso." } });
}