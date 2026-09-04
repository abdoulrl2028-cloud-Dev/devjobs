import { NextRequest, NextResponse } from "next/server";
import { requireCompany } from "@/lib/context";
import { ensureDatabaseReady } from "@/lib/db/init";
import { searchTalents, type TalentFilter } from "@/lib/db/candidates";

export const dynamic = "force-dynamic";

/*
 * Banco de talentos é exclusivo de empresas com plano Pro ou Empresa.
 */
export async function GET(request: NextRequest) {
  let rich;
  try {
    rich = await requireCompany();
  } catch {
    return NextResponse.json({ error: "Acesso restrito a empresas" }, { status: 403 });
  }

  if (rich.plan !== "pro" && rich.plan !== "empresa") {
    return NextResponse.json(
      {
        error: "Banco de talentos disponível para planos Pro e Empresa.",
        upgradeRequired: true,
      },
      { status: 403 }
    );
  }

  await ensureDatabaseReady();

  const params = request.nextUrl.searchParams;
  const cargo = (params.get("cargo") ?? params.get("q"))?.slice(0, 80) ?? null;
  const filter: TalentFilter = {
    skill: params.get("tech")?.slice(0, 40) ?? null,
    cargo,
    experience: params.get("experience")?.slice(0, 20) ?? null,
    location: params.get("location")?.slice(0, 80) ?? null,
    remote: params.get("remote") === "true" ? true : params.get("remote") === "false" ? false : null,
  };

  const talents = await searchTalents(filter);
  const response = NextResponse.json({ data: talents });
  response.headers.set("Cache-Control", "no-store");
  return response;
}