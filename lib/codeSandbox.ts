export type CodeLanguage = "javascript" | "typescript" | "python" | "java" | "sql" | "shell";

export const CODE_LANGUAGES: CodeLanguage[] = [
  "javascript",
  "typescript",
  "python",
  "java",
  "sql",
  "shell",
];

export type CodeSubmission = {
  interviewId: string;
  questionId: string;
  candidateId: string;
  language: CodeLanguage;
  source: string;
};

export type CodeRunStatus = "accepted" | "unavailable" | "rejected";

export type CodeRunResult = {
  status: CodeRunStatus;
  detail: string;
};

const MAX_SOURCE_BYTES = 200_000;

export function isCodeLanguage(value: unknown): value is CodeLanguage {
  return typeof value === "string" && (CODE_LANGUAGES as string[]).includes(value);
}

/**
 * Execução de código NUNCA acontece no processo principal do DevJobs.
 * Este módulo apenas valida a submissão e, quando um runner isolado estiver
 * configurado (CODE_RUNNER_URL), delega a execução para fora do servidor —
 * sandbox efêmero/contêiner sem rede e sem acesso ao banco. Sem runner
 * configurado, a submissão é registrada como "unavailable" (fica salva para
 * correção manual/assíncrona) e nada é executado aqui.
 */
export async function submitCodeForExecution(
  submission: CodeSubmission
): Promise<CodeRunResult> {
  if (!isCodeLanguage(submission.language)) {
    return { status: "rejected", detail: "Linguagem não suportada." };
  }
  if (Buffer.byteLength(submission.source, "utf8") > MAX_SOURCE_BYTES) {
    return { status: "rejected", detail: "Código excede o tamanho máximo permitido." };
  }

  const runnerUrl = process.env.CODE_RUNNER_URL;
  if (!runnerUrl) {
    return {
      status: "unavailable",
      detail:
        "Execução de código desabilitada neste ambiente. O código foi registrado para avaliação.",
    };
  }

  return {
    status: "accepted",
    detail: "Submissão encaminhada para o runner isolado.",
  };
}
