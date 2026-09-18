import type { ResumeData } from "@/lib/types";

const SKILL_BASE = [
  "react", "typescript", "javascript", "node.js", "node", "next.js", "nextjs", "vue",
  "angular", "css", "html", "sass", "tailwind", "postgresql", "postgres", "sql",
  "mongodb", "redis", "docker", "kubernetes", "k8s", "git", "github", "gitlab",
  "aws", "azure", "gcp", "terraform", "python", "django", "flask", "fastapi",
  "java", "spring", "kotlin", "go", "golang", "rust", "c#", "php", "laravel", "ruby",
  "rails", "graphql", "rest apis", "rest", "api", "microservices", "kafka", "rabbitmq",
  "jest", "testing", "testes", "cypress", "playwright", "ci/cd", "ci cd", "jenkins",
  "github actions", "linux", "bash", "shell", "agile", "scrum", "kanban", "figma",
  "ui/ux", "ux", "design", "dados", "data engineering", "etl", "pandas", "numpy",
  "machine learning", "ml", "ai", "excel", "power bi", "tableau", "wordpress",
];

export function extractEmail(text: string): string {
  const m = text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
  return m ? m[0] : "";
}

export function extractPhone(text: string): string {
  const clean = text.replace(/[()\s.-]/g, "");
  const match = clean.match(/\+?\d{10,14}/);
  return match ? match[0] : "";
}

export function extractSkills(text: string, limit = 25): string[] {
  const lower = ` ${text.toLowerCase()} `;
  const found: string[] = [];
  for (const skill of SKILL_BASE) {
    const tag = ` ${skill} `;
    if (lower.includes(tag)) found.push(skill === "c#" ? "C#" : skill === "c" ? "C" : skill);
  }
  return [...new Set(found)].slice(0, limit);
}

export function extractFullName(text: string): string {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return "";
  for (const line of lines.slice(0, 4)) {
    if (line.toLowerCase().startsWith("nome")) {
      const name = line.replace(/^[^:]*:\s*/i, "").trim();
      if (name) return name;
    }
  }
  const first = lines[0];
  if (first.length <= 60 && first.includes(" ") && !/@/.test(first) && !first.match(/curricul|resume|vitae/i)) {
    const words = first.split(/\s+/);
    if (words.every((w) => /^[A-Z\u00C0-\u017F]/.test(w))) return first;
  }
  return "";
}

export function extractSummary(text: string, max = 240): string {
  const cleaned = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 30 && !/^(sobre|resumo|experi[eê]ncia|educaç[aã]o|skills|habilidades|projetos|contato|idiomas):?$/i.test(l))
    .slice(0, 3)
    .join(" ");
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max).match(/.*\s/)?.[0] ?? cleaned.slice(0, max)}…`;
}

export type CvExtraction = {
  data: ResumeData;
  completeness: number;
  rawTextSample: string;
};

export function extractResumeFromText(text: string): CvExtraction {
  const trimmed = text.trim();
  const email = extractEmail(trimmed);
  const phone = extractPhone(trimmed);
  const fullName = extractFullName(trimmed);
  const skills = extractSkills(trimmed);

  // Experiências: linhas que misturam cargo + empresa e período (ex.: anos).
  const experienceItems: ResumeData["experienceItems"] = [];
  const lines = trimmed.split("\n").map((l) => l.trim()).filter(Boolean);
  const kinds = /desenvolvedor|developer|engenheiro|engineer|analista|analyst|designer|product manager|estagi|intern|software|frontend|backend|fullstack|devops|data|qa|c?o?o|consultor|tech lead|líder|leader/i;
  for (const line of lines.slice(0, 40)) {
    if (
      line.length <= 160 &&
      kinds.test(line) &&
      /(19|20)\d{2}/.test(line)
    ) {
      const periodMatch = line.match(/(\b(?:19|20)\d{2}\b[^\w]*(-|–|—)\s*(?:hoje|atual|presente|(?:19|20)\d{2}))/i);
      const period = periodMatch ? periodMatch[0].trim() : "";
      const noPeriod = period ? line.replace(period, " ").replace(/\s{2,}/g, " ").trim() : line;
      const [role, company] = noPeriod.split(/[-|@]{1,2}/).map((s) => s.trim());
      if (role && role.length < 60) {
        experienceItems.push({ role, company: company ?? "", period, description: "", skills: skills.slice(0, 6) });
      }
    }
  }

  const data: ResumeData = {
    fullName,
    headline: "",
    email,
    phone,
    summary: extractSummary(trimmed),
    skills,
    experienceItems: experienceItems.slice(0, 6),
    education: [],
    projects: [],
    languages: [],
  };

  const completeness = Math.round(
    [
      fullName ? 1 : 0,
      email ? 1 : 0,
      phone ? 0.5 : 0,
      skills.length > 0 ? 1 : 0,
      data.summary ? 1 : 0,
      experienceItems.length > 0 ? 1 : 0,
    ].reduce((a, b) => a + b, 0) * 18.5
  );

  return { data, completeness: Math.min(100, completeness), rawTextSample: trimmed.slice(0, 800) };
}