import { NextResponse } from "next/server";
import { getJobById } from "@/lib/jobs";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const job = getJobById(id);
  if (!job) {
    return NextResponse.json({ error: "Vaga não encontrada" }, { status: 404 });
  }
  return NextResponse.json({ data: job });
}