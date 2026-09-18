import { TRACK_QUESTIONS } from "@/lib/interview";
import type { InterviewTrack, ResumeData } from "@/lib/types";
import type { Job } from "@/lib/jobs";

const TRACK_ORDER: InterviewTrack[] = [
  "frontend", "backend", "fullstack", "mobile", "devops", "data", "cybersecurity", "game",
];

const TRACK_KEYWORDS: Record<InterviewTrack, RegExp> = {
  frontend: /\b(react|vue|angular|frontend|front-end|css|html|next|javascript|typescript|ui|ux|web)\b/i,
  backend: /\b(backend|back-end|node|api|rest|graphql|java|spring|go|golang|php|laravel|ruby|postgres|sql|docker|microservice)\b/i,
  fullstack: /\b(fullstack|full-stack|full stack|next|ciclo completo)\b/i,
  mobile: /\b(mobile|react native|flutter|ios|android|app)\b/i,
  devops: /\b(devops|kubernetes|k8s|docker|terraform|aws|azure|gcp|ci\/cd|pipeline|infra)\b/i,
  data: /\b(data|dados|etl|analytics|sql|python|bi|machine learning|ml|pandas)\b/i,
  cybersecurity: /\b(segurança|security|pentest|owasp|oauth|jwt|auth|criptografia)\b/i,
  game: /\b(game|jogo|unity|unreal|godot|gameplay)\b/i,
};

export function detectTrackFromJob(job: Pick<Job, "title" | "description" | "tags" | "requirements">): InterviewTrack {
  const haystack = `${job.title} ${job.description} ${job.tags.join(" ")} ${job.requirements.join(" ")}`;
  for (const track of TRACK_ORDER) {
    if (TRACK_KEYWORDS[track].test(haystack)) return track;
  }
  return "fullstack";
}

const TERM_STOPWORDS = new Set([
  "com", "para", "de", "da", "do", "das", "dos", "em", "e", "ou", "a", "o", "as", "os",
  "anos", "ano", "experiencia", "experiência", "conhecimento", "conhecimentos", "atencao",
  "detalhes", "qualidade", "visual", "aprender", "desejavel", "desejável", "mais", "menos",
  "acima", "superior", "bom", "boa", "facilidade", "trabalhar", "trabalho", "equipe", "time",
  "comunicacao", "comunicação", "organizacao", "organização", "proatividade", "iniciativa",
  "vontade", "capacidade", "habilidade", "ingles", "inglês", "diferencial", "ferramentas",
  "eur", "usd", "brl", "salario", "remoto", "presencial", "beneficios", "requisitos", "requisito",
  "experience", "ability", "strong", "skills", "role", "company", "responsib", "preferred",
  "nice", "have", "work", "job", "team", "years", "year", "tools", "etc", "etc.",
]);

export function jobTechTerms(job: Pick<Job, "description" | "tags" | "requirements">, limit = 12): string[] {
  const haystack = [
    ...job.requirements,
    ...job.tags,
    ...(job.description ?? "").split(/[\n.,;()]+/),
  ]
    .map((s) => s.replace(/[^a-zA-Z0-9\u00C0-\u017F#+._\-\s]/g, " "))
    .join(" ");

  const words = haystack
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 2)
    .filter((w) => !TERM_STOPWORDS.has(w.toLowerCase()));

  const counts = new Map<string, number>();
  for (const w of words) {
    const key = w.toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  // Prioriza termos que aparecem mais de uma vez e são "tecno" (letras/dígitos).
  const ranked = [...counts.entries()]
    .filter(([w]) => !/^[a-z0-9]+$/.test(w) || w.length > 3)
    .sort((a, b) => b[1] - a[1])
    .map(([w]) => {
      const original = words.find((x) => x.toLowerCase() === w) ?? w;
      return original.length <= 32 ? original : w;
    });

  return [...new Set(ranked)].slice(0, limit);
}

function stableIndex(str: string, min: number, max: number): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return min + (h % Math.max(1, max - min + 1));
}

export function generateJobQuestions(
  job: Pick<Job, "id" | "title" | "description" | "tags" | "requirements">,
  resume: ResumeData | null | undefined
): { questions: string[]; track: InterviewTrack } {
  const track = detectTrackFromJob({ ...job, title: job.title });
  const pool = TRACK_QUESTIONS[track];
  const hash = job.id ?? job.title;
  const gap = Math.min(3, pool.length);

  // Perguntas técnicas base da trilha (rotacionadas de forma estável pela vaga).
  const baseIndex = stableIndex(hash, 0, pool.length - gap);
  const trackQuestions = pool.slice(baseIndex, baseIndex + 3);

  const resumeSkills = new Set((resume?.skills ?? []).map((s) => s.toLowerCase()));
  const resumeText = [resume?.summary ?? "", ...(resume?.experienceItems ?? []).map((e) => `${e.role} ${e.company} ${e.description}`).join(" ")]
    .join(" ")
    .toLowerCase();

  // Termos da vaga que o candidato ainda não menciona → perguntas de "gap".
  const gapTerms = jobTechTerms(job)
    .filter((term) => {
      const key = term.toLowerCase();
      return !resumeSkills.has(key) && !resumeText.includes(key);
    })
    .slice(0, 2);

  const questions: string[] = [...trackQuestions];
  for (const term of gapTerms) {
    questions.push(`Fale sobre sua vivência com ${term}: o que já construiu, dificuldades e um exemplo concreto.`);
  }
  if (questions.length < 5) {
    questions.push("Conte sobre o projeto mais desafiador da sua carreira e qual foi exatamente o seu papel.");
  }
  if (questions.length < 6) {
    questions.push(
      "Descreva como você age quando precisa entregar uma tarefa crítica sem ter todas as informações necessárias."
    );
  }
  if (questions.length < 6) {
    questions.push("Como você prioriza tarefas quando há várias demandas concorrentes e prazos apertados?");
  }
  return { questions: questions.slice(0, 6), track };
}