import { NextRequest, NextResponse } from "next/server";
import { ensureDatabaseReady } from "@/lib/db/init";
import { queryAll } from "@/lib/db/conn";

export const dynamic = "force-dynamic";

// Regiões/países disponíveis com contagem de vagas ativas (public, para o filtro).
export async function GET(request: NextRequest) {
  await ensureDatabaseReady();

  const q = request.nextUrl.searchParams.get("q");
  const where = ["status = 'active'"];
  const params: (string | number | boolean)[] = [];
  if (q) {
    where.push("(LOWER(title) LIKE ? OR LOWER(source_company) LIKE ? OR LOWER(tags) LIKE ?)");
    const term = `%${q.toLowerCase()}%`;
    params.push(term, term, term);
  }

  const rows = await queryAll(
    `SELECT COALESCE(NULLIF(region, ''), 'other') AS region, COUNT(*) AS total
     FROM jobs
     WHERE ${where.join(" AND ")}
     GROUP BY COALESCE(NULLIF(region, ''), 'other')
     ORDER BY total DESC`,
    params
  );

  const regions = rows
    .map((row) => ({
      region: row.region as string,
      country: null,
      count: Number(row.total),
    }))
    .filter((r) => r.region);

  return NextResponse.json({ data: regions });
}