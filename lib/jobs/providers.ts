// Adaptadores de fontes de vagas internacionais.
// Apenas fontes que autorizam o uso dos dados (APIs oficiais e feeds públicos).
// - Remotive: feed público (sem chave).
// - JSearch (RapidAPI): requer JSEARCH_API_KEY.
// - Adzuna: requer ADZUNA_APP_ID + ADZUNA_APP_KEY (+ ADZUNA_COUNTRIES).
// Nenhuma chave é enviada ao frontend; tudo roda no servidor.

import { inferCountry } from "../international/countries";

export type FeedSource = "remotive" | "jsearch" | "adzuna";

export type FeedJob = {
  source: FeedSource;
  externalId: string;
  title: string;
  company: string;
  description: string;
  location: string;
  remote: boolean;
  type: string;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string | null;
  tags: string[];
  applyUrl: string | null;
  publishedAt: string | null;
  country: string | null;
  city: string | null;
  logoColor?: string | null;
};

export async function fetchWithTimeout(url: string, init?: RequestInit, timeoutMs = 15000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function cleanText(value: unknown): string {
  return String(value ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function inferTags(description: string, title: string, extra: string[] = []): string[] {
  const known = [
    "javascript", "typescript", "react", "next.js", "node.js", "vue", "angular",
    "python", "java", "golang", "go", "ruby", "php", "c#", "dotnet", "swift",
    "kotlin", "flutter", "react native", "sql", "postgresql", "mysql", "mongodb",
    "redis", "kafka", "aws", "azure", "gcp", "docker", "kubernetes", "terraform",
    "ci/cd", "git", "linux", "figma", "ux", "ui", "design system", "machine learning",
    "ai", "data", "analytics", "devops", "frontend", "backend", "fullstack", "mobile",
    "qa", "cypress", "playwright", "selenium",
  ];
  const text = `${title} ${description}`.toLowerCase();
  const found = new Set<string>();
  for (const tag of known) {
    if (text.includes(tag)) found.add(tag.toUpperCase());
  }
  for (const extraTag of extra) {
    const t = String(extraTag).trim();
    if (t) found.add(t.toUpperCase());
  }
  return [...found].slice(0, 12);
}

/* ------------------------------ Remotive ------------------------------ */

export async function fetchRemotive(): Promise<FeedJob[]> {
  const url = "https://remotive.com/api/remote-jobs?limit=200&category=software-dev";
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`Remotive retornou ${res.status}`);
  const body = (await res.json()) as { jobs?: unknown[] };
  const jobs = body.jobs ?? [];
  const out: FeedJob[] = [];

  for (const raw of jobs) {
    const item = raw as Record<string, unknown>;
    const id = String(item.id ?? "");
    const title = cleanText(item.title);
    const company = cleanText(item.company_name);
    if (!id || !title || !company) continue;

    const locationRaw = cleanText(item.candidate_required_location) || "Remote";
    const { country } = inferCountry(locationRaw + " " + title);
    const salary = parseSalary(String(item.salary ?? ""), null);
    const publishedAt = toIso(item.publication_date);

    out.push({
      source: "remotive",
      externalId: id,
      title,
      company,
      description: cleanText(item.description),
      location: locationRaw,
      remote: true,
      type: normalizeType(String(item.job_type ?? "full_time")),
      salaryMin: salary.min,
      salaryMax: salary.max,
      currency: salary.currency,
      tags: inferTags(String(item.description ?? ""), title, Array.isArray(item.tags) ? (item.tags as unknown[]).map(String) : []),
      applyUrl: typeof item.url === "string" ? item.url : null,
      publishedAt: publishedAt ? publishedAt : null,
      country,
      city: null,
      logoColor: null,
    });
  }
  return out;
}

/* ------------------------------- JSearch ------------------------------ */

export async function fetchJSearch(apiKey: string): Promise<FeedJob[]> {
  const queries = ["software engineer", "frontend developer", "backend developer", "devops engineer", "data scientist", "product designer"];
  const out: FeedJob[] = [];
  for (const q of queries) {
    const url = `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(q)}&num_pages=1&page=1`;
    const res = await fetchWithTimeout(url, {
      headers: {
        "x-rapidapi-key": apiKey,
        "x-rapidapi-host": "jsearch.p.rapidapi.com",
      },
    });
    if (!res.ok) continue;
    const body = (await res.json()) as { data?: unknown[] };
    for (const raw of body.data ?? []) {
      const item = raw as Record<string, unknown>;
      const id = String(item.job_id ?? "");
      const title = cleanText(item.job_title);
      const company = cleanText(item.employer_name);
      if (!id || !title || !company) continue;
      const countryCode = cleanText(item.job_country);
      const city = cleanText(item.job_city);
      const remoteRaw = cleanText(item.job_remote);
      const remote = remoteRaw ? remoteRaw.toLowerCase().includes("remote") : true;
      const { region } = inferCountry(`${city} ${countryCode}`);
      out.push({
        source: "jsearch",
        externalId: id,
        title,
        company,
        description: cleanText(item.job_description),
        location: [city, countryCode].filter(Boolean).join(", ") || "Remote",
        remote,
        type: normalizeType(String(item.job_employment_type ?? "FULLTIME")),
        salaryMin: toNum(item.job_min_salary) ?? null,
        salaryMax: toNum(item.job_max_salary) ?? null,
        currency: cleanText(item.job_salary_currency) || null,
        tags: inferTags(String(item.job_description ?? ""), title, Array.isArray(item.job_required_skills) ? (item.job_required_skills as unknown[]).map(String) : []),
        applyUrl: typeof item.job_apply_link === "string" ? item.job_apply_link : null,
        publishedAt: toIso(item.job_posted_at_datetime_utc),
        country: countryCode || null,
        city: city || null,
      });
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return out;
}

/* -------------------------------- Adzuna ------------------------------ */

export async function fetchAdzuna(appId: string, appKey: string, countries: string[]): Promise<FeedJob[]> {
  const out: FeedJob[] = [];
  for (const country of countries.length ? countries : ["gb", "us", "ca", "de", "fr", "pt", "es", "it", "br", "in", "ae", "mx", "ar", "za", "ng", "au"]) {
    const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/1?app_id=${appId}&app_key=${appKey}&results_per_page=50&content-type=application/json`;
    try {
      const res = await fetchWithTimeout(url);
      if (!res.ok) continue;
      const body = (await res.json()) as { results?: unknown[] };
      for (const raw of body.results ?? []) {
        const item = raw as Record<string, unknown>;
        const id = String(item.id ?? "");
        const title = cleanText(item.title);
        const location = (item.location as { area?: unknown[] } | undefined)?.area?.map(String).join(", ") ?? "";
        const company = String((item.company as { display_name?: unknown } | undefined)?.display_name ?? "");
        if (!id || !title) continue;
        const remote = (location + " " + cleanText(item.description)).toLowerCase().includes("remote");
        const { country: inferredCountry } = inferCountry(location);
        const salaryCurrencyRaw = item.salary_currency;
        const adzunaCurrency =
          salaryCurrencyRaw && typeof salaryCurrencyRaw === "object"
            ? cleanText((salaryCurrencyRaw as { code?: unknown }).code)
            : cleanText(salaryCurrencyRaw);
        out.push({
          source: "adzuna",
          externalId: id,
          title,
          company,
          description: cleanText(item.description),
          location: location || country.toUpperCase(),
          remote,
          type: normalizeType(String(item.contract_type ?? "permanent")),
          salaryMin: toNum(item.salary_min) ?? null,
          salaryMax: toNum(item.salary_max) ?? null,
          currency: adzunaCurrency || "GBP",
          tags: inferTags(String(item.description ?? ""), title, []),
          applyUrl: typeof item.redirect_url === "string" ? item.redirect_url : null,
          publishedAt: toIso(item.created),
          country: country.toUpperCase(),
          city: location.split(",")[0] ?? null,
        });
      }
    } catch {
      // Continua para o próximo país.
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  return out;
}

/* ------------------------------- helpers ------------------------------ */

function normalizeType(raw: string): string {
  const r = raw.toLowerCase();
  if (r.includes("part")) return "part-time";
  if (r.includes("contract")) return "contract";
  if (r.includes("intern")) return "internship";
  return "full-time";
}

// Converte texto de salário ("R$ 4.000-6.000", "$50k - $70k USD", "BRL 4000") em min/max/moeda.
function parseSalary(text: string, fallbackCurrency: string | null): { min: number | null; max: number | null; currency: string | null } {
  if (!text) return { min: null, max: null, currency: fallbackCurrency };
  let currency: string | null = fallbackCurrency ?? null;
  const currencies: { code: string; re: RegExp }[] = [
    { code: "BRL", re: /R\$\s?|BRL/i },
    { code: "USD", re: /\$\s?|USD/i },
    { code: "EUR", re: /€|EUR/ },
    { code: "GBP", re: /£|GBP/ },
    { code: "CAD", re: /CAD/ },
    { code: "AUD", re: /AUD/ },
  ];
  for (const c of currencies) {
    if (c.re.test(text)) {
      currency = c.code;
      break;
    }
  }
  const nums = (text.match(/\d[\d.,]*k?/gi) ?? []).map((n) => {
    const k = /k/i.test(n);
    const base = parseFloat(n.replace(/[^0-9.]/g, ""));
    if (Number.isNaN(base)) return NaN;
    return Math.round(k ? base * 1000 : base);
  }).filter((n) => !Number.isNaN(n) && n > 0);
  if (!nums.length) return { min: null, max: null, currency };
  if (nums.length === 1) return { min: nums[0], max: nums[0], currency };
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  return { min, max, currency };
}

function toNum(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n !== 0 ? n : null;
}

function toIso(value: unknown): string | null {
  if (!value) return null;
  const date = new Date(String(value).replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function providerFor(source: FeedSource): { name: string; label: string } {
  const map: Record<FeedSource, { name: string; label: string }> = {
    remotive: { name: "remotive", label: "Remotive" },
    jsearch: { name: "jsearch", label: "JSearch (RapidAPI)" },
    adzuna: { name: "adzuna", label: "Adzuna" },
  };
  return map[source];
}