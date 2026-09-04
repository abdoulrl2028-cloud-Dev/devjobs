import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/context";
import { ensureDatabaseReady } from "@/lib/db/init";
import { listUsers, deleteUser, countUsersByRole } from "@/lib/db/users";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Acesso restrito ao admin" }, { status: 403 });
  }

  await ensureDatabaseReady();

  const params = request.nextUrl.searchParams;
  const role = params.get("role")?.slice(0, 15) ?? null;
  const q = params.get("q")?.slice(0, 80).toLowerCase() ?? null;

  let users = await listUsers();
  if (role) users = users.filter((u) => u.role === role);
  if (q) {
    users = users.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }

  const curated = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    createdAt: u.created_at ?? "",
  }));

  const counts = {
    admin: await countUsersByRole("admin"),
    company: await countUsersByRole("company"),
    candidate: await countUsersByRole("candidate"),
  };

  const response = NextResponse.json({ data: curated, counts });
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
  const userId = request.nextUrl.searchParams.get("id");
  if (!userId) {
    return NextResponse.json({ error: "Id do usuário é obrigatório" }, { status: 400 });
  }

  await deleteUser(userId);
  return NextResponse.json({ data: { ok: true, message: "Usuário excluído." } });
}