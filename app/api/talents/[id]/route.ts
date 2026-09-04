import { NextResponse } from "next/server";
import { requireCompany } from "@/lib/context";
import { ensureDatabaseReady } from "@/lib/db/init";
import { getProfileById } from "@/lib/db/candidates";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  let rich;
  try {
    rich = await requireCompany();
  } catch {
    return NextResponse.json({ error: "Acesso restrito a empresas" }, { status: 403 });
  }

  if (rich.plan !== "pro" && rich.plan !== "empresa") {
    return NextResponse.json(
      { error: "Banco de talentos disponível para planos Pro e Empresa.", upgradeRequired: true },
      { status: 403 }
    );
  }

  await ensureDatabaseReady();
  const id = (await params).id;

  const profile = await getProfileById(id);
  if (!profile) {
    return NextResponse.json({ error: "Perfil não encontrado" }, { status: 404 });
  }

  const response = NextResponse.json({ data: profile });
  response.headers.set("Cache-Control", "no-store");
  return response;
}