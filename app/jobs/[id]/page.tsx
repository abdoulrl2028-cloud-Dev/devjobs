import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// Alias amigável: /jobs/[id] resolve para o detalhe canônico em /vagas/[id].
export default async function JobAliasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/vagas/${id}`);
}