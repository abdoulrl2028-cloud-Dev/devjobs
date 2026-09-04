import { NextRequest, NextResponse } from "next/server";
import { requireCompany } from "@/lib/context";
import { ensureDatabaseReady } from "@/lib/db/init";
import { updateCompany } from "@/lib/db/company";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest) {
  let rich;
  try {
    rich = await requireCompany();
  } catch {
    return NextResponse.json({ error: "Acesso restrito a empresas" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 });
  }

  await ensureDatabaseReady();

  const patch: { name?: string; logoColor?: string; website?: string | null; description?: string | null } = {};
  if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim().slice(0, 80);
  if (typeof body.logoColor === "string" && /^#[0-9a-fA-F]{6}$/.test(body.logoColor)) {
    patch.logoColor = body.logoColor;
  }
  if (typeof body.website === "string") patch.website = body.website.trim().slice(0, 300) || null;
  if (typeof body.description === "string") patch.description = body.description.trim().slice(0, 2000) || null;

  if (Object.keys(patch).length > 0) {
    await updateCompany(rich.company.id, patch);
  }

  return NextResponse.json({ data: { ok: true, message: "Perfil da empresa atualizado." } });
}