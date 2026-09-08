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