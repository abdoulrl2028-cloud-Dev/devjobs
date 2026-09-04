import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/context";
import { ensureDatabaseReady } from "@/lib/db/init";
import { deleteCompany, listCompanies } from "@/lib/db/company";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Acesso restrito ao admin" }, { status: 403 });
  }

  await ensureDatabaseReady();

  const params = request.nextUrl.searchParams;
  const q = params.get("q")?.slice(0, 80).toLowerCase() ?? null;

  let companies = await listCompanies();
  if (q) {
    companies = companies.filter((c) => c.name.toLowerCase().includes(q));
  }

  const response = NextResponse.json({
    data: companies.map((c) => ({
      id: c.id,
      name: c.name,
      logoColor: c.logoColor,
      website: c.website,
      createdAt: c.createdAt,
    })),
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Acesso restrito ao admin" }, { status: 403 });
  }

  await ensureDatabaseReady();
  const companyId = request.nextUrl.searchParams.get("id");
  if (!companyId) {
    return NextResponse.json({ error: "Id da empresa é obrigatório" }, { status: 400 });
  }

  await deleteCompany(companyId);
  return NextResponse.json({ data: { ok: true, message: "Empresa excluída." } });
}