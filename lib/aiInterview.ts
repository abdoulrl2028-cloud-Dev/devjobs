import type { InterviewPlanQuestion, InterviewResult } from "@/lib/types";

// A chave da LLM (ex.: OPENAI_API_KEY) NUNCA é exposta ao frontend:
// este módulo roda apenas no servidor e lê process.env. Se a chave não
// estiver configurada, o fluxo usa análise determinística (mesma base do
// restante do projeto), sem inventar integração externa.
export function hasLlmConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

// Análise determinística de resposta por tópicos esperados.
export function analyzeInterviewAnswer(input: {
  question: InterviewPlanQuestion;
  answer: string;
}): { score: number; feedback: string; strengths: string[]; missingTopics: string[] } {
  const answer = input.answer.trim();
  if (!answer) {
    return { score: 0, feedback: "Você não respondeu esta pergunta.", strengths: [], missingTopics: input.question.expected_topics };
  }
  const text = answer.toLowerCase();
  const words = answer.split(/\s+/).filter((w) => w.length > 0).length;

  const present: string[] = [];
  const missing = input.question.expected_topics.filter((topic) => {
    const key = topic.toLowerCase();
    const hit = text.includes(key) || key.split(/\s+/).some((t) => t.length > 3 && text.includes(t));
    if (hit) present.push(topic);
    return !hit;
  });

  const base = input.question.question_type === "behavioral" ? 55 : 50;
  let score = base;
  score += present.length * 8;
  if (words >= 40) score += 12;
  else if (words >= 20) score += 8;
  else if (words >= 8) score += 4;
  if (/exemplo|porque|por quê|vi|implementei|criei|desenvolvi|projeto/.test(text)) score += 8;
  score = Math.max(0, Math.min(100, score));

  const strengths: string[] = [];
  if (present.length > 0) strengths.push(`Cobriu os tópicos: ${present.join(", ")}.`);
  if (words >= 40) strengths.push("Resposta bem desenvolvida e com detalhamento.");

  let feedback: string;
  if (score >= 80) {
    feedback = "Resposta sólida: você demonstrou domínio do assunto e estrutura.";
  } else if (score >= 60) {
    feedback = "Boa resposta, mas pode aprofundar mais em exemplos e detalhes técnicos.";
  } else if (score >= 40) {
    feedback = "Resposta razoável; faltou aprofundamento nos tópicos centrais da pergunta.";
  } else {
    feedback = "Resposta fraca para esta pergunta. Revise os tópicos indicados.";
  }
  if (missing.length > 0) {
    feedback += ` Não abordou: ${missing.join(", ")}.`;
  }

  return {
    score,
    feedback,
    strengths: strengths.filter(Boolean),
    missingTopics: missing,
  };
}

export function compileInterviewResult(input: {
  qas: Array<{ questionType: string; score: number }>;
}): {
  technical: number;
  practical: number;
  theoretical: number;
  communication: number;
  overall: number;
  studyTopics: string[];
} {
  const byType = (t: string[]) => input.qas.filter((q) => t.includes(q.questionType)).map((q) => q.score);
  const avg = (s: number[]) => (s.length ? Math.round(s.reduce((a, b) => a + b, 0) / s.length) : 0);

  const technical = avg(byType(["technical"]));
  const practical = avg(byType(["practical"]));
  const theoretical = avg(byType(["theoretical"]));
  const communication = avg(byType(["behavioral"]));

  const scoreSource = [technical, practical, theoretical].filter((s) => s > 0);
  const overall = avg(scoreSource.length
    ? [...scoreSource, communication].filter((s) => s > 0)
    : input.qas.map((q) => q.score));

  const studyTopics: string[] = [];
  if (technical < 60) studyTopics.push("Técnica: revisar fundamentos da stack da vaga e práticas de código.");
  if (practical < 60) studyTopics.push("Prática: treinar desafios de implementação (algoritmos, API, banco).");
  if (theoretical < 60) studyTopics.push("Teórica: revisar conceitos e trade-offs de arquitetura.");
  if (communication < 60) studyTopics.push("Comportamental: estruturar respostas com métodos como STAR.");
  if (studyTopics.length === 0) studyTopics.push("Mantenha o ritmo: domínio consistente em todas as áreas.");

  return { technical, practical, theoretical, communication, overall, studyTopics };
}

export function strengthsAndImprovements(input: { qas: Array<{ questionType: string; score: number }> }): {
  strengths: string[];
  improvements: string[];
} {
  const strong = input.qas.filter((q) => q.score >= 75).length;
  const weak = input.qas.filter((q) => q.score < 60).length;
  const strengths: string[] = [];
  const improvements: string[] = [];
  if (strong >= Math.ceil(input.qas.length / 2)) strengths.push("Consistência e domínio nas perguntas de maior dificuldade.");
  if (input.qas.some((q) => q.questionType === "behavioral" && q.score >= 75)) strengths.push("Boa comunicação e estruturação de respostas comportamentais.");
  if (input.qas.some((q) => q.questionType === "technical" && q.score >= 75)) strengths.push("Sólida base técnica na stack avaliada.");
  if (weak > 0) improvements.push(`Aprofundar os ${weak} tópico(s) onde a pontuação ficou abaixo de 60.`);
  if (improvements.length === 0) improvements.push("Ampliar exemplos reais de projetos nas respostas.");
  if (strengths.length === 0) strengths.push("Mostrou participação em todas as etapas da entrevista.");
  return { strengths, improvements };
}

export function buildInterviewResult(input: Parameters<typeof compileInterviewResult>[0] & Parameters<typeof strengthsAndImprovements>[0]): Omit<InterviewResult, "id" | "interviewId" | "candidateId" | "createdAt"> {
  const scores = compileInterviewResult(input);
  const { strengths, improvements } = strengthsAndImprovements(input);
  return {
    technicalScore: scores.technical || null,
    practicalScore: scores.practical || null,
    theoreticalScore: scores.theoretical || null,
    communicationScore: scores.communication || null,
    overallScore: scores.overall,
    strengths,
    improvements,
    studyTopics: scores.studyTopics,
  };
}

export function nextQuestionSuggestion(missingTopics: string[]): string | null {
  if (missingTopics.length === 0) return null;
  return `Na próxima pergunta, procure mostrar exemplos de ${missingTopics[0]} para reforçar essa área.`;
}