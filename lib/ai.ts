import type { AiAnalysis, Job, CandidateProfile, JobType } from "./types";

/*
 * Motor de análise de compatibilidade (determinístico, sem API externa).
 * Cruza skills/experiência do candidato com requisitos/tags da vaga e
 * produz score, fortes/faltas e sugestões acionáveis.
 */

const SYNONYMS: Record<string, string[]> = {
  js: ["javascript", "ecmascript", "es6"],
  ts: ["typescript"],
  react: ["reactjs", "react.js", "next", "nextjs"],
  node: ["node.js", "nodejs", "express", "nest"],
  py: ["python", "django", "flask", "fastapi"],
  java: ["spring", "spring boot"],
  aws: ["amazon web services", "ec2", "s3", "lambda", "cloud"],
  gcp: ["google cloud"],
  azure: ["azure devops"],
  docker: ["dockerfile", "containers"],
  k8s: ["kubernetes", "kubectl"],
  "c#": ["csharp", ".net", "dotnet"],
  golang: ["go", "golang"],
  sql: ["postgres", "postgresql", "mysql", "sqlite", "database"],
  nosql: ["mongodb", "redis", "cassandra", "dynamodb"],
  tdd: ["testes", "unit tests", "jest", "vitest"],
  git: ["github", "gitlab"],
  "ci/cd": ["cicd", "continuous integration", "jenkins", "github actions"],
  agile: ["scrum", "kanban", "sprint"],
};

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9+#/$ .-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function expandSkill(skill: string): string[] {
  const key = normalize(skill);
  if (SYNONYMS[key]) return [key, ...SYNONYMS[key]];
  return [key];
}

function tokenSet(items: string[]): Set<string> {
  const set = new Set<string>();
  for (const item of items) {
    for (const token of expandSkill(item)) set.add(token);
  }
  return set;
}

function levelForYears(experience: string): number {
  switch (experience) {
    case "5+":
      return 5;
    case "3-5":
      return 4;
    case "1-3":
      return 3;
    default:
      return 2;
  }
}

function scoreLevel(level: number): number {
  // 1..5 → contribuição proporcional
  return Math.min(100, Math.round(((level - 1) / 4) * 50 + 30));
}

export function analyzeCompatibility(
  profile: Pick<CandidateProfile, "skills" | "experience" | "summary" | "headline"> | null,
  job: Job
): AiAnalysis {
  const candidateTokens = tokenSet(profile?.skills ?? []);
  const candidateContext = normalize(
    `${profile?.headline ?? ""} ${profile?.summary ?? ""} ${(profile?.skills ?? []).join(" ")}`
  );
  const candidateHas = (token: string) => {
    const key = normalize(token);
    return candidateTokens.has(key) || candidateContext.includes(key);
  };

  const requirements = (job.requirements ?? []).length
    ? job.requirements
    : job.tags.length
      ? job.tags
      : [];

  // Cada requisito (frase) é avaliado por cobertura de "palavras-chave" de
  // tecnologia. Palavras genéricas (ex.: "experiência", "detalhes") não contam.
  // Ex.: "React e TypeScript" exige React E TypeScript; "React Native" exige
  // "native" também — não basta ter "React".
  const STOPWORDS = new Set([
    "com", "para", "de", "da", "do", "das", "dos", "em", "e", "ou", "a", "o",
    "anos", "ano", "experiencia", "experiencia", "conhecimento", "atencao",
    "detalhes", "qualidade", "visual", "aprender", "desejavel", "desirable",
    "mais", "menos", "acima", "superior", "bom", "boa", "facilidade",
    "trabalhar", "trabalho", "equipe", "time", "comunicacao", "organizacao",
    "proatividade", "iniciativa", "vontade", "capacidade", "habilidade",
    "conhecimentos", "ingles", "ingles", "diferencial", "ferramentas",
  ]);

  const isTechWord = (word: string) => word.length > 2 && !STOPWORDS.has(word);

  const reqResults = requirements.map((req) => {
    const text = normalize(req);
    const words = text.split(" ").filter(Boolean);
    const specific = words.filter((w) => isTechWord(w));

    if (specific.length === 0) return { req, ok: true, unmet: [] }; // requisito soft

    // Cobertura: toda palavra-chave do requisito aparece no contexto do
    // candidato (headline + resumo + skills). "React Native" exige que
    // "native" também esteja — apenas "React" não basta.
    const covered = specific.every((w) => candidateContext.includes(w));
    return { req, ok: covered, unmet: covered ? [] : [req] };
  });

  const metReqs = reqResults.filter((r) => r.ok);
  const missingReqs = reqResults.filter((r) => !r.ok).map((r) => r.req);
  const met = metReqs.length;
  const reqTotal = requirements.length || 1;

  // Match de tags (independente dos requisitos) para mais granularidade
  const tagTokens = tokenSet(job.tags);
  let tagHits = 0;
  for (const token of tagTokens) {
    if (candidateHas(token)) tagHits++;
  }
  const tagOverlap = tagTokens.size > 0 ? tagHits / tagTokens.size : 0;

  const reqRatio = requirements.length > 0 ? met / reqTotal : tagOverlap;

  // Experiência (nível) vs senioridade implícita nos requisitos
  const exp = levelForYears(profile?.experience ?? "0-1");
  const keywordLevel = candidateContext.includes("sênior") || candidateContext.includes("senior")
    ? 5
    : candidateContext.includes("pleno")
      ? 4
      : candidateContext.includes("jr") || candidateContext.includes("junior")
        ? 3
        : exp;
  const expScore = Math.min(100, Math.round((keywordLevel / 5) * 100));

  // Proximidade do cargo
  const titleTokens = normalize(job.title).split(" ");
  const headline = normalize(profile?.headline ?? "");
  let titleHits = 0;
  for (const token of titleTokens) {
    if (token.length > 2 && (headline.includes(token) || candidateTokens.has(token))) titleHits++;
  }
  const significantTitles = titleTokens.filter((t) => t.length > 2);
  const titleRatio = significantTitles.length ? titleHits / significantTitles.length : 0;

  const score = Math.round(
    reqRatio * 0.55 * 100 + expScore * 0.25 + titleRatio * 0.2
  );
  const capped = Math.max(5, Math.min(98, score));

  // Match por tecnologia para painel "por tech"
  const techCandidates = unique([
    ...(profile?.skills ?? []).map(s => s.trim()).filter(Boolean),
    ...job.tags,
  ]).slice(0, 10);
  const techMatches = techCandidates.map((name) => {
    const present = candidateHas(name);
    const relevant = job.requirements.some((r) => normalize(r).includes(normalize(name))) ||
      job.tags.some((t) => normalize(t) === normalize(name));
    const level = present
      ? Math.max(1, Math.min(5, (relevant ? 4 : 2) + (candidateTokens.has(normalize(name)) ? 1 : 0)))
      : 1;
    return { name: titleCase(name), present, level };
  });

  const strengths = buildStrengths({
    reqRatio,
    expScore,
    titleRatio,
    tagOverlap,
    skillCount: profile?.skills?.length ?? 0,
  });
  const weakPoints = buildWeakPoints({ reqRatio, missing: missingReqs });
  const suggestions = buildSuggestions({ missing: missingReqs, expScore, titleRatio });

  const scoreLabel =
    capped >= 80 ? "Excelente" : capped >= 60 ? "Boa chance" : capped >= 40 ? "Moderada" : "Baixa";

  return {
    score: capped,
    scoreLabel,
    techMatches,
    requirementsMet: metReqs.slice(0, 8).map((r) => r.req),
    requirementsMissing: missingReqs.slice(0, 8),
    strengths,
    weakPoints,
    suggestions,
    summary: buildSummary(capped, scoreLabel, reqRatio, met, reqTotal),
  };
}

function unique(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = item.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}

function titleCase(value: string): string {
  return value
    .split(" ")
    .map((w) => (w.length > 2 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function buildStrengths(data: {
  reqRatio: number;
  expScore: number;
  titleRatio: number;
  tagOverlap: number;
  skillCount: number;
}): string[] {
  const out: string[] = [];
  if (data.reqRatio >= 0.7) out.push("Você atende a maior parte dos requisitos da vaga.");
  if (data.expScore >= 70) out.push("Sua experiência está alinhada à senioridade esperada.");
  if (data.titleRatio >= 0.5) out.push("Seu cargo/cabeçalho combina diretamente com o da vaga.");
  if (data.skillCount > 0) out.push(`Você tem ${data.skillCount} habilidades registradas no perfil.`);
  if (data.tagOverlap >= 0.5 && data.reqRatio < 0.7)
    out.push("Suas tecnologias se aproximam bastante do dia a dia da vaga.");
  if (out.length === 0) out.push("Perfil com base sólida para começar a evoluir.");
  return out.slice(0, 4);
}

function buildWeakPoints(data: { reqRatio: number; missing: string[] }): string[] {
  const out: string[] = [];
  if (data.reqRatio < 0.4) out.push("Você atende menos da metade dos requisitos desta vaga.");
  if (data.reqRatio >= 0.4 && data.reqRatio < 0.7)
    out.push("Faltam alguns requisitos importantes para ficar entre os favoritos.");
  data.missing.slice(0, 3).forEach((m) => out.push(`Requisito ausente: ${titleCase(m)}.`));
  if (out.length === 0) out.push("Poucos pontos críticos encontrados.");
  return out.slice(0, 4);
}

function buildSuggestions(data: { missing: string[]; expScore: number; titleRatio: number }): string[] {
  const out: string[] = [];
  if (data.missing.length > 0) {
    const short = data.missing.slice(0, 4).map((m) => titleCase(m)).join(", ");
    out.push(`Adicione ao currículo: ${short}.`);
  }
  if (data.expScore < 60) out.push("Destaque 2 a 3 projetos que comprovem resultados mensuráveis.");
  if (data.titleRatio < 0.5)
    out.push('Ajuste seu headline para incluir o cargo da vaga (ex.: "Desenvolvedor React").');
  out.push("Mencione números e impacto (p.ex., redução de custo, tempo de carregamento, % de testes).");
  return out.slice(0, 4);
}

function buildSummary(
  score: number,
  label: string,
  reqRatio: number,
  met: number,
  total: number
): string {
  return `Compatibilidade ${label.toLowerCase()} (${score}/100). Você atende ${met} de ${total} requisitos. ${
    label === "Excelente"
      ? "Perfil muito alinhado, aplique com confiança."
      : label === "Boa chance"
        ? "Aplique e use as sugestões para reforçar o currículo."
        : "Aplique mesmo assim, mas invista nas lacunas apontadas."
  }`;
}

/* ------------------------- Busca inteligente ------------------------- */

export type ParsedQuery = {
  terms: string[];
  locations: string[];
  remote: boolean | null;
  types: JobType[];
  salaryMin: number | null;
  salaryMax: number | null;
  tags: string[];
};

const CITIES = [
  "são paulo", "sao paulo", "sp", "rio de janeiro", "rj", "belo horizonte", "bh",
  "curitiba", "porto alegre", "florianópolis", "florianopolis", "recife", "brasília",
  "brasilia", "campinas", "salvador", "fortaleza", "lisboa", "lisbon", "berlim", "berlin",
  "lisboa remoto", "100% remoto",
];

export function parseSmartQuery(raw: string): ParsedQuery {
  const text = normalize(raw);
  const result: ParsedQuery = {
    terms: [],
    locations: [],
    remote: null,
    types: [],
    salaryMin: null,
    salaryMax: null,
    tags: [],
  };

  // remoto
  if (/\bremot[ao](?!\s+e presencial)\b/.test(text)) result.remote = true;
  if (/\bpresencial\b/.test(text)) result.remote = false;

  // tipo de vaga
  if (/\best(á|a)g(io|o)\b/.test(text)) result.types.push("internship");
  if (/\bmeio[ -]?per(í|i)odo\b/.test(text)) result.types.push("part-time");
  if (/\bcontrat[ao]\b/.test(text)) result.types.push("contract");
  if (/\btempo integral|full[ -]?time|integral\b/.test(text)) result.types.push("full-time");

  // salário "acima de R$ X" | "R$ 5.000 a R$ 8.000" | "até R$ N"
  let cleaned = text;
  const salaryMatches = [
    ...text.matchAll(/(?:acima de|a partir de|mais de)?\s*r\$\s*([\d.]+)\s*(?:a|até|–|-)?\s*(?:r\$\s*)?([\d.]+)?/gi),
  ].filter((m) => m[1]);
  for (const m of salaryMatches) {
    const first = parseInt(m[1].replace(/\D/g, ""), 10);
    const prev = text.slice(Math.max(0, m.index! - 24), m.index!);
    if (/(acima de|a partir de|mais de)/.test(prev)) {
      result.salaryMin = first;
    } else {
      if (result.salaryMin === null) result.salaryMin = first;
      if (m[2]) result.salaryMax = parseInt(m[2].replace(/\D/g, ""), 10);
    }
    cleaned = cleaned.replace(m[0], " ");
  }
  // "até R$ N"
  for (const m of text.matchAll(/até\s+r\$\s*([\d.]+)/gi)) {
    result.salaryMax = parseInt(m[1].replace(/\D/g, ""), 10);
    cleaned = cleaned.replace(m[0], " ");
  }

  // localizaçoes
  for (const city of CITIES) {
    if (cleaned.includes(city)) {
      const mapped =
        city === "sao paulo" || city === "sp" ? "São Paulo"
          : city === "rio de janeiro" || city === "rj" ? "Rio de Janeiro"
            : city === "belo horizonte" || city === "bh" ? "Belo Horizonte"
              : city === "florianopolis" ? "Florianópolis"
                : city === "brasilia" ? "Brasília"
                  : city === "lisbon" ? "Lisboa" : city === "berlin" ? "Berlim"
                    : city;
      result.locations.push(mapped);
      cleaned = cleaned.replace(new RegExp(city, "g"), " ");
    }
  }

  // termos restantes = palavra solta viram termos e possíveis tags
  const rest = cleaned.replace(/r\$/g, " ").replace(/\d+(\.\d+)*/g, " ");
  result.terms = rest
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 2 && !["de", "da", "do", "das", "dos", "para", "com", "e", "em", "vaga", "vagas"].includes(t));
  result.tags = result.terms;
  return result;
}

export function filterJobsByParsed(jobs: Job[], parsed: ParsedQuery): Job[] {
  return jobs.filter((job) => {
    if (parsed.remote !== null && job.remote !== parsed.remote) return false;
    if (parsed.types.length > 0 && !parsed.types.includes(job.type)) return false;
    if (parsed.salaryMin !== null && parsed.salaryMin !== undefined) {
      const max = job.salary?.max ?? job.salary?.min ?? 0;
      if (max < parsed.salaryMin) return false;
    }
    if (parsed.salaryMax !== null && parsed.salaryMax !== undefined) {
      const min = job.salary?.min ?? 0;
      if (min > parsed.salaryMax) return false;
    }
    if (parsed.locations.length > 0) {
      const loc = normalize(job.location);
      if (!parsed.locations.some((l) => loc.includes(normalize(l)))) return false;
    }
    if (parsed.tags.length > 0) {
      const haystack = normalize(`${job.title} ${job.tags.join(" ")} ${job.requirements.join(" ")}`);
      if (!parsed.tags.some((t) => haystack.includes(normalize(t)))) return false;
    }
    return true;
  });
}