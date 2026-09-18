import type { InterviewTrack } from "@/lib/types";

// Banco determinístico de perguntas por trilha. Sem IA externa: o avaliação é
// feita por heurística (comprimento/temas da resposta) e feedback objetivo.
export const TRACK_QUESTIONS: Record<InterviewTrack, string[]> = {
  frontend: [
    "Explique a diferença entre Virtual DOM e DOM real no React.",
    "Como funciona o ciclo de vida de um componente com hooks (useEffect)?",
    "O que é server-side rendering e quais as vantagens para SEO?",
    "Como você garantiria acessibilidade (a11y) em uma aplicação React?",
    "Descreva como otimizaria o carregamento de imagens e bundle em Next.js.",
    "Como lidaria com estado global em uma aplicação grande?",
    "O que é CSS-in-JS e quando vale a pena usar?",
    "Como testaria componentes React (unitário e e2e)?",
  ],
  backend: [
    "O que é autenticação stateless com JWT e quais os cuidados de segurança?",
    "Explique ACID em bancos relacionais com um exemplo prático.",
    "Como faria rate limiting e proteção contra brute force numa API?",
    "Descreva como projetaria uma fila para processamento assíncrono.",
    "Como garantir a consistência de dados em transações distribuídas?",
    "O que é idempotência e por que importa em APIs REST?",
    "Como escalaria um serviço com banco de dados?",
    "Explique a diferença entre horizontal e vertical scaling.",
  ],
  fullstack: [
    "Como você estrutura um projeto full stack com Next.js e Node?",
    "Descreva uma arquitetura de API REST com camadas bem definidas.",
    "Como garantir type-safety entre frontend e backend?",
    "Como lidaria com autenticação e autorização na prática?",
    "Explique como otimizaria uma consulta SQL com muitos joins.",
    "Como faria deploy contínuo de uma aplicação full stack?",
    "Como protegeria dados sensíveis no cliente e no servidor?",
    "O que considera ao escolher entre SSR, SSG ou client-side?",
  ],
  mobile: [
    "Diferenças práticas entre React Native e desenvolvimento nativo.",
    "Como gerenciar navegação e estado em um app grande de RN?",
    "Como otimizar performance em telas com muitas listas?",
    "Como lidar com armazenamento local e sincronização offline?",
    "Como funciona o processo de publicação na App Store/Play Store?",
    "Estratégias para testar apps mobile (unit e e2e).",
    "Deep linking: como funciona e quando usar?",
    "Como monitorar crashes e performance em produção?",
  ],
  devops: [
    "Explique como estruturaria um pipeline de CI/CD completo.",
    "Como funciona o controle de acesso em Kubernetes (RBAC)?",
    "Descreva sua estratégia de observabilidade (logs, métricas, traces).",
    "Como faria backups automatizados e disaster recovery?",
    "Diferencie Terraform do gerenciamento manual de infra.",
    "Como configuraria um ambiente multi-região?",
    "Estratégias de deploy: blue/green, canary, rolling. Explique.",
    "Como garantir segurança em containers e imagens?",
  ],
  data: [
    "Diferencie banco relacional e NoSQL com exemplos reais.",
    "Como modelaria um data warehouse para BI?",
    "Explique o que é um pipeline ETL/ELT com orquestração.",
    "Como garantir qualidade de dados em produção?",
    "Otimize uma consulta que lê milhões de linhas diariamente.",
    "Como lidar com dados semiestruturados (JSON)?",
    "O que é particionamento e sharding?",
    "Como mover dados entre sistemas sem perda nem duplicação?",
  ],
  cybersecurity: [
    "Explique o OWASP Top 10 com os pontos mais críticos.",
    "Como protegeria uma API de injeção, XSS e CSRF?",
    "O que é autenticação multifator e como funciona?",
    "Como conduziria um pentest em um web app?",
    "Estratégias de resposta a incidentes passo a passo.",
    "Como gerenciar vulnerabilidades de dependências?",
    "Diferencie criptografia simétrica e assimétrica com casos de uso.",
    "Como garantir segurança em infraestrutura em nuvem?",
  ],
  game: [
    "Explique o game loop e por que ele é fundamental.",
    "Como resolveria problemas de performance em jogos?",
    "Diferencie update fixo e variável (fixed/variable timestep).",
    "Como projetaria um sistema de física simples para 2D?",
    "Estratégias de salvamento automático e checkpoint.",
    "Como validar a diversão (game feel) em um protótipo?",
    "Como estruturaria o código para um jogo grande?",
    "Como fazer multiplayer básico com autoridade do servidor?",
  ],
};

// Temas que contam como "cobertura técnica" da resposta.
const KEY_TERMS: Record<InterviewTrack, string[]> = {
  frontend: ["react", "dom", "hook", "ssr", "seo", "acessibilidade", "a11y", "bundle", "estado", "css", "next", "teste", "componente"],
  backend: ["jwt", "token", "sql", "banco", "fila", "api", "idempot", "cache", "transaction", "segurança", "scala", "consistencia"],
  fullstack: ["api", "next", "node", "type", "auth", "sql", "deploy", "servidor", "cliente", "dados", "security", "ssr"],
  mobile: ["react", "native", "estado", "navegação", "perf", "lista", "offline", "store", "teste", "crash", "link"],
  devops: ["ci", "cd", "kubernetes", "rbac", "log", "metric", "trace", "backup", "terraform", "deploy", "container", "regiao"],
  data: ["sql", "nosql", "warehouse", "etl", "pipeline", "dado", "qualidade", "particao", "shard", "json", "orchestra"],
  cybersecurity: ["owasp", "injeção", "xss", "csrf", "mfa", "pentest", "incidente", "criptografia", "vulnerab", "nuvem", "api"],
  game: ["game loop", "perf", "physics", "fisica", "timestep", "checkpoint", "salvamento", "protótipo", "multiplayer", "servidor", "code"],
};

export type SelfEvaluation = "poor" | "ok" | "good" | "excellent" | null;

export function analyzeAnswer(track: InterviewTrack, question: string, answer: string): {
  score: number;
  coverage: string[];
} {
  const terms = KEY_TERMS[track] ?? [];
  const text = answer.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const nc = text.replace(/\s+/g, " ");
  const covered = terms.filter((t) => text.includes(t.toLowerCase()));
  const wordCount = nc.split(" ").filter(Boolean).length;
  const hasExample = /\b(quando|por exemplo|em caso\b|utilizei|implementei|ajudei|resolvi|criei|desenvolvi|projeto)\b/.test(text);
  let score = 30;
  score += Math.min(25, Math.floor(wordCount / 20) * 5); // extensão
  score += covered.length * 5; // cobertura técnica
  if (hasExample) score += 20;
  if (wordCount >= 80) score += 5;
  return { score: Math.max(5, Math.min(98, score)), coverage: covered };
}

export function trackFeedback(score: number): { label: string; advice: string } {
  if (score >= 80) return { label: "Excelente", advice: "Resposta técnica e com exemplos. Ótimo trabalho!" };
  if (score >= 60) return { label: "Bom", advice: "Boa base. Adicione exemplos concretos da sua experiência para subir o desempenho." };
  if (score >= 40) return { label: "Regular", advice: "Cite termos técnicos da área e detalhe mais a solução proposta." };
  return { label: "Precisa melhorar", advice: "Estude o tema e pratique respostas estruturadas (contexto → solução → resultado)." };
}

export type JobInterviewReport = {
  score: number;
  metrics: {
    technical: number;
    communication: number;
    clarity: number;
    experience: number;
    problemSolving: number;
  };
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  feedback: string;
};

const EXAMPLE_VERBS = /\b(utilizei|implementei|criei|desenvolvi|projeto|resolvi|construi|construí|ajudei|liderei|automatizei)\b/i;
const STRUCTURE_WORDS = /\b(primeiro|primeiramente|depois|em seguida|então|por fim|por exemplo|etapas|passos|analisei|avaliei)\b/i;
const SOLUTION_WORDS = /\b(solucao|solução|resultado|impacto|otimiza|reduzi|melhorei|recomendei|comparacao|comparacão)\b/i;

function clampPct(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function gradeJobInterview(
  track: InterviewTrack,
  questions: string[],
  answers: string[]
): JobInterviewReport {
  const perQuestion = questions.map((q, i) => analyzeAnswer(track, q, answers[i] ?? ""));

  const technical = perQuestion.reduce((a, p) => a + p.score, 0) / Math.max(1, perQuestion.length);
  const wordCounts = answers.map((a) => a.trim().split(/\s+/).filter(Boolean).length);
  const communication =
    wordCounts.reduce((a, c) => a + (c >= 30 ? 100 : c >= 15 ? 70 : c >= 5 ? 50 : 25), 0) /
    Math.max(1, wordCounts.length);
  const structureCount = answers.filter((a) => STRUCTURE_WORDS.test(a)).length;
  const clarity = (structureCount / Math.max(1, answers.length)) * 100;
  const experience =
    answers.reduce((a, t) => a + (EXAMPLE_VERBS.test(t) ? 1 : 0), 0) / Math.max(1, answers.length) * 100;
  const problemSolving =
    answers.reduce((a, t) => a + (SOLUTION_WORDS.test(t) ? 1 : 0), 0) / Math.max(1, answers.length) * 100;

  const score = Math.round(technical * 0.45 + communication * 0.2 + clarity * 0.12 + experience * 0.12 + problemSolving * 0.11);

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  perQuestion.forEach((p, i) => {
    if (answers[i]?.trim() && p.score >= 70) strengths.push(`Boa resposta: “${questions[i].slice(0, 60)}…”`);
    if (answers[i]?.trim() && p.score < 50) weaknesses.push(`Precisa melhorar: “${questions[i].slice(0, 60)}…”`);
  });
  if (strengths.length === 0 && technical >= 60) strengths.push("Respostas tecnicamente consistentes com a vaga.");
  if (weaknesses.length === 0 && technical < 45) weaknesses.push("Cobertura técnica abaixo do esperado para esta vaga.");

  const recommendations: string[] = [];
  if (technical < 60) recommendations.push("Revise os fundamentos e termos técnicos citados na descrição da vaga.");
  if (communication < 60) recommendations.push("Responda de forma mais completa: contexto → solução → resultado.");
  if (clarity < 50) recommendations.push("Estruture a resposta em etapas e use conectores (“primeiro…, depois…, por fim…”).");
  if (experience < 50) recommendations.push("Traga exemplos reais de projetos, com seu papel e o impacto gerado.");

  const label = trackFeedback(score);
  const feedback = `${label.label}. ${label.advice}${
    recommendations.length ? ` ${recommendations[0]}` : ""
  }`;

  return {
    score: clampPct(score),
    metrics: {
      technical: clampPct(technical),
      communication: clampPct(communication),
      clarity: clampPct(clarity),
      experience: clampPct(experience),
      problemSolving: clampPct(problemSolving),
    },
    strengths: strengths.slice(0, 3),
    weaknesses: weaknesses.slice(0, 3),
    recommendations: recommendations.slice(0, 3),
    feedback,
  };
}