import { NextRequest, NextResponse } from "next/server";
import { requireCandidate } from "@/lib/context";
import { ensureDatabaseReady } from "@/lib/db/init";
import { cancelActiveCandidateSubscription } from "@/lib/db/premium";
import { assertSameOrigin } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Cancela a assinatura ativa do candidato e volta para o plano Grátis.
export async function POST(request: NextRequest) {
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;

  let session;
  try {
    session = await requireCandidate();
  } catch {
    return NextResponse.json({ error: "Acesso restrito a candidatos" }, { status: 403 });
  }

  await ensureDatabaseReady();

  const canceled = await cancelActiveCandidateSubscription(session.user.id);
  if (!canceled) {
    return NextResponse.json(
      { error: "Você não possui uma assinatura ativa para cancelar." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    data: {
      ok: true,
      tier: "free",
      message: "Assinatura cancelada. Você voltou para o plano Grátis.",
    },
  });
}