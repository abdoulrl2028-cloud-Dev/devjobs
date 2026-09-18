import type { InterviewPlanQuestion, InterviewType } from "@/lib/types";
import type { Job } from "@/lib/jobs";
import type { ResumeData } from "@/lib/types";

export const INTERVIEW_TYPES: InterviewType[] = ["technical", "practical", "theoretical", "ai"];

export const INTERVIEW_TYPE_LABELS: Record<InterviewType, string> = {
  technical: "Entrevista técnica",
  practical: "Desafio prático",
  theoretical: "Entrevista teórica",
  ai: "Entrevista com IA",
  company_online: "Entrevista online",
};

export const INTERVIEW_COUNT_OPTIONS = [5, 10, 15, 20];

export type SkillQuestionBank = {
  technical: string[];
  theoretical: string[];
  practical: string[];
};

export const SKILL_BANKS: Record<string, SkillQuestionBank> = {
  javascript: {
    technical: [
      "Explique as diferenças entre var, let e const e quando usar cada um em JavaScript.",
      "O que são closures em JavaScript? Dê um exemplo prático de uso.",
      "Como funciona o event loop no JavaScript e o que são microtasks?",
      "Explique diferenças entre == e === e coerção de tipos.",
      "O que são Promises e async/await? Como você lida com erros nelas?",
      "Como funciona o hoisting em JavaScript? Quais os riscos?",
    ],
    theoretical: [
      "Qual a diferença entre execução síncrona e assíncrona?",
      "O que é o conceito de imutabilidade e por que é importante em JavaScript?",
      "Explique o modelo de concorrência single-threaded do JavaScript.",
    ],
    practical: [
      "Implemente uma função que remove duplicatas de um array mantendo a ordem.",
      "Escreva uma função debounce de 300ms para um campo de busca.",
      "Implemente uma Promise.all com limite de concorrência.",
      "Crie uma função que agrupa um array de objetos por uma propriedade.",
    ],
  },
  typescript: {
    technical: [
      "O que são tipos utilitários no TypeScript? Cite exemplos como Partial, Pick e Omit.",
      "Explique a diferença entre types e interfaces no TypeScript.",
      "Como você usa discriminated unions para modelar estados em TypeScript?",
      "O que é type narrowing e como o instanceof/typeof ajudam?",
      "Como você tipa APIs externas sem tipos Documentadas (declaration merging)?",
    ],
    theoretical: [
      "Por que Tipagem Estática ajuda a prevenir erros de produção?",
      "Explique a diferença entre generics em funções e em componentes.",
    ],
    practical: [
      "Declare um tipo para o estado de uma requisição (loading, success, error) com discriminated union.",
      "Escreva uma função genérica mapBy que tipa corretamente a chave e o valor.",
    ],
  },
  react: {
    technical: [
      "Explique o ciclo de vida e as fases de renderização do React com hooks.",
      "Como funciona o Virtual DOM e quando o React decide re-renderizar?",
      "Quais as diferenças entre useMemo, useCallback e useEffect?",
      "Como você evita renderizações desnecessárias em listas grandes?",
      "O que é reconciliation e por que a `key` importa?",
    ],
    theoretical: [
      "Explique o conceito de composição vs. herança em React.",
      "O que é o fluxo unidirecional de dados e por que React o adota?",
      "Qual a diferença entre estado local, contexto global e estado de servidor?",
    ],
    practical: [
      "Implemente um componente de busca com debounce e cancelamento de requests.",
      "Escreva um hook useLocalStorage com sincronização entre abas.",
      "Crie um formulário controlado com validação e mensagens de erro.",
      "Implemente uma lista virtualizada simples com janela de itens visíveis.",
    ],
  },
  "react-native": {
    technical: [
      "Explique a diferença entre componentes nativos e componentes web no React Native.",
      "Como funciona a Bridge (ou o novo Fabric) e o que muda no desempenho?",
      "Como você gerencia navegação e estado global em um app React Native?",
      "Quais as estratégias para otimizar o desempenho de listas no FlatList?",
    ],
    theoretical: [
      "Por que o JavaScript roda em uma thread separada no React Native?",
      "O que é o Fast Refresh e como ele difere do Hot Reload?",
    ],
    practical: [
      "Implemente um FlatList com pull-to-refresh e infinite scroll.",
      "Escreva um hook useKeyboardAware para evitar que o teclado cubra inputs.",
      "Crie um componente de formulário com persistência local dos dados.",
    ],
  },
  node: {
    technical: [
      "Como o Node.js lida com I/O não-bloqueante e o event loop em aplicações web?",
      "Explique o modelo de módulos CommonJS vs ESM no Node.js.",
      "Como você escala uma aplicação Node com cluster ou worker threads?",
      "Quais as boas práticas para tratamento de erros assíncronos em Node?",
    ],
    theoretical: [
      "O que significa single-threaded e por que ainda é performático para I/O?",
      "Explique a diferença entre processamento de CPU-bound e I/O-bound.",
    ],
    practical: [
      "Implemente um endpoint REST com tratamento de erro e validação.",
      "Escreva um middleware de rate limiting por IP sem dependências externas.",
      "Crie uma fila simples em memória com retry para processamento assíncrono.",
    ],
  },
  python: {
    technical: [
      "Explique o GIL do Python e seus impactos em aplicações concorrentes.",
      "Qual a diferença entre listas, tuplas e generators em memória e uso?",
      "Como funcionam decorators e context managers no Python?",
      "O que são as f-strings e formatação avançada de strings?",
    ],
    theoretical: [
      "O que é duck typing e como ele influencia o design de APIs em Python?",
      "Explique a filosofia 'explicit is better than implicit' com um exemplo.",
    ],
    practical: [
      "Implemente um gerador infinito que produz números da sequência de Fibonacci.",
      "Escreva um decorator @retry(3) para funções instáveis.",
      "Crie uma função que processa um CSV grande em chunks sem carregar tudo em memória.",
    ],
  },
  java: {
    technical: [
      "Explique as diferenças entre String, StringBuilder e StringBuffer.",
      "Como funciona a coleta de lixo (garbage collection) na JVM?",
      "O que são record classes e pattern matching no Java moderno?",
      "Explique a imutabilidade e como criar objetos imutáveis corretamente.",
    ],
    theoretical: [
      "Por que a JVM traz portabilidade? O que é bytecode?",
      "Explique os pilares de orientação a objetos aplicados na prática.",
    ],
    practical: [
      "Implemente um método que detecta se uma string é um palíndromo ignorando espaços.",
      "Escreva um comparator ordenando uma lista por múltiplos critérios.",
    ],
  },
  sql: {
    technical: [
      "Explique a diferença entre INNER JOIN, LEFT JOIN e FULL JOIN com exemplos.",
      "Como você otimiza uma query lenta com índices? O que é um índice composto?",
      "Qual a diferença entre WHERE e HAVING?",
      "Como funciona o plano de execução e quando usar EXPLAIN?",
    ],
    theoretical: [
      "O que é normalização e as formas normais 1NF a 3NF?",
      "Explique transações ACID.",
    ],
    practical: [
      "Escreva uma query que retorna os 3 clientes com maior total de pedidos por mês.",
      "Escreva uma consulta para encontrar registros duplicados em uma tabela.",
      "Crie uma query com window function (ROW_NUMBER) para paginação.",
    ],
  },
  apis: {
    technical: [
      "Explique REST: recursos, verbos, status codes e idempotência.",
      "O que são autenticação, autorização e os padrões JWT, OAuth 2.0 e Basic?",
      "Como você versiona e documenta uma API? Qual a diferença entre REST e GraphQL?",
      "Quais são os limites e boas práticas de rate limiting e paginação?",
    ],
    theoretical: [
      "O que diferencia um design de API robusto de um frágil?",
      "Explique o conceito de contratos de API e breaking changes.",
    ],
    practical: [
      "Projete um endpoint de busca com filtros, ordenação e paginação.",
      "Escreva o schema de resposta JSON para um cadastro de usuário com validação de erros.",
      "Implemente um client HTTP com retry e timeout.",
    ],
  },
  docker: {
    technical: [
      "Explique a diferença entre imagem, container e camadas no Docker.",
      "Como você monta um multi-stage build otimizado?",
      "O que são volumes, networks e como containers se comunicam?",
      "Como você reduz o tamanho de uma imagem e mantém a segurança?",
    ],
    theoretical: [
      "Qual a diferença entre virtualização e conteinerização?",
      "O que significa 'images são imutáveis e containers são estado'?",
    ],
    practical: [
      "Escreva um Dockerfile de produção para uma aplicação Node em duas etapas.",
      "Crie um docker-compose com app + banco + healthcheck.",
    ],
  },
  git: {
    technical: [
      "Explique o fluxo de Git Flow vs. GitHub Flow e quando usar cada um.",
      "Como você resolve um conflito de merge e evita que ele aconteça?",
      "Qual a diferença entre rebase e merge? Quando usar cada um?",
      "Como você corrige um commit já publicado (revert, reset e cherry-pick)?",
    ],
    theoretical: [
      "O que é um commit 'limpo' e por que a história importa?",
      "Explique o conceito de branches efêmeras no Git.",
    ],
    practical: [
      "Descreva os passos exatos para reverter o último commit mantendo as mudanças no working tree.",
      "Monte uma estratégia de branches para uma feature com revisão e deploy.",
    ],
  },
  cloud: {
    technical: [
      "Explique os modelos IaaS, PaaS e SaaS com exemplos.",
      "Como você estrutura uma conta cloud em múltiplas contas/vnets/organizações?",
      "O que são serverless functions e quando você evita utilizá-las?",
      "Como você implementa autoscalar e alta disponibilidade?",
    ],
    theoretical: [
      "O que significa 'infraestrutura como código' e seus benefícios?",
      "Explique o modelo de responsabilidade compartilhada na nuvem.",
    ],
    practical: [
      "Desenhe uma arquitetura serverless para API com autenticação e banco.",
      "Escreva passos para tornar uma aplicação stateless e escalável horizontalmente.",
    ],
  },
  arquitetura: {
    technical: [
      "Explique os padrões de arquitetura: monólito, modular, microsserviços e event-driven.",
      "Como você decide o design de dados e consistência em sistemas distribuídos?",
      "O que são os princípios SOLID aplicados a uma arquitetura real?",
      "Como você projeta observabilidade (logs, métricas, tracing) na arquitetura?",
    ],
    theoretical: [
      "O que diferencia uma boa arquitetura de uma que gera dívida técnica?",
      "Explique trade-offs entre consistência, disponibilidade e latência.",
    ],
    practical: [
      "Desenhe a arquitetura de um sistema de e-commerce com checkout, pagamento e estoque.",
      "Projete uma fila de eventos para um sistema de notificações em alta escala.",
    ],
  },
  css: {
    technical: [
      "Explique Flexbox e Grid: quando usar cada um e diferenças de layout.",
      "O que são CSS variables e como você estrutura um design system?",
      "Como funciona o rendering de fontes e performance com @font-face?",
    ],
    theoretical: [
      "Explique o conceito de especificidade e cascata no CSS.",
      "O que é o box model e como o `box-sizing` afeta o layout?",
    ],
    practical: [
      "Crie um layout responsivo de 3 colunas que vira 1 coluna no mobile.",
      "Implemente um componente de modal com overlay usando CSS puro.",
    ],
  },
};

export const BEHAVIORAL_QUESTIONS = [
  "Conte sobre um projeto desafiador e qual foi exatamente o seu papel nele.",
  "Descreva uma situação em que você teve que entregar sob pressão. Como você se organizou?",
  "Como você age ao receber feedback negativo? Dê um exemplo.",
  "Explique como você prioriza tarefas quando há várias demandas concorrentes.",
  "Conte como você resolveu um conflito técnico ou de equipe.",
  "Quando você não conhece uma tecnologia, como você aprende rápido?",
];

export function detectSkillsFromJob(job: Pick<Job, "description" | "tags" | "requirements" | "title">): string[] {
  const flags: Record<string, RegExp> = {
    javascript: /\b(javascript|js|ecmascript)\b/i,
    typescript: /\b(typescript)\b/i,
    react: /\b(react|next\.?js|hooks)\b/i,
    "react-native": /\b(react\s?native)\b/i,
    node: /\b(node\.?js|node)\b/i,
    python: /\bpython\b/i,
    java: /\bjava\b/i,
    sql: /\b(sql|postgres|mysql|database)\b/i,
    apis: /\b(api|rest|graphql)\b/i,
    docker: /\b(docker|container)\b/i,
    git: /\bgit\b/i,
    cloud: /\b(cloud|aws|azure|gcp|serverless)\b/i,
    arquitetura: /\b(arquitetur|architecture|microsservi|microservice)\b/i,
    css: /\b(css|front.?end|scss)\b/i,
  };
  const haystack = `${job.title} ${job.description ?? ""} ${job.tags.join(" ")} ${job.requirements.join(" ")}`;
  const found: string[] = [];
  for (const [skill, re] of Object.entries(flags)) {
    if (re.test(haystack)) found.push(skill);
  }
  return found.length ? found : ["javascript", "react"];
}

function pickPool(skill: string, type: string): string[] {
  const bank = SKILL_BANKS[skill];
  if (!bank) return [];
  if (type === "practical") return bank.practical;
  if (type === "theoretical") return bank.theoretical;
  return bank.technical;
}

function rotated(full: string[], seed: string, index: number): string {
  const h = () => {
    let acc = 0;
    for (let i = 0; i < seed.length; i++) acc = (acc * 31 + seed.charCodeAt(i)) >>> 0;
    return acc;
  };
  return full[(h() + index) % full.length];
}

export function generateInterviewPlan(input: {
  job: Pick<Job, "id" | "title" | "description" | "tags" | "requirements">;
  resume: Pick<ResumeData, "skills" | "summary" | "experienceItems"> | null | undefined;
  type: Exclude<InterviewType, "company_online">;
  count: number;
}): InterviewPlanQuestion[] {
  const { job, type, count } = input;
  const skills = detectSkillsFromJob(job);
  const used = new Set<string>();
  const questions: InterviewPlanQuestion[] = [];

  // Para "ai": distribui por igual entre técnica, prática, teórica e comportamental.
  const stageTypes = type === "ai" ? ["technical", "practical", "theoretical", "behavioral"] : [type];

  let index = 0;
  let guard = 0;
  while (questions.length < count && guard < count * 8) {
    guard++;
    const stage = stageTypes[questions.length % stageTypes.length];
    if (stage === "behavioral") {
      const q = rotated(BEHAVIORAL_QUESTIONS, `${job.id}-${index}`, questions.length);
      if (used.has(q)) continue;
      used.add(q);
      questions.push({ index: index++, question: q, question_type: "behavioral", expected_topics: ["comportamental", "comunicação", "colaboração"] });
      continue;
    }
    const skill = skills[questions.length % skills.length];
    const pool = pickPool(skill, stage);
    if (!pool.length) continue;
    const q = rotated(pool, `${job.id}-${index}`, questions.length);
    if (used.has(q)) continue;
    used.add(q);
    questions.push({ index: index++, question: q, question_type: stage, expected_topics: [skill, stage] });
  }

  // Garante o mínimo na contagem configurada: completa com perguntas técnicas da skill dominante.
  const primary = skills[0];
  while (questions.length < count) {
    const pool = pickPool(primary || "javascript", "technical");
    const q = rotated(pool, `${job.id}-fill`, questions.length);
    questions.push({ index: index++, question: q, question_type: "technical", expected_topics: [primary || "javascript", "technical"] });
    if (pool.length <= 1) break;
  }
  return questions.slice(0, count);
}