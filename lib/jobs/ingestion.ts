// Pipeline de ingestão de vagas internacionais.
// Fluxo: fonte autorizada → normalização → deduplicação → banco → evento realtime.

import { queryOne } from "../db/conn";
import { ensureFeedCompany } from "../db/company";
import { createJob } from "../db/jobs";
import { insertRealtimeEvent } from "../db/events";
import { regionFromCountryCode, flipRegionForLocation, CITY_TO_COUNTRY } from "../international/countries";
import { fetchRemotive, fetchJSearch, fetchAdzuna, type FeedJob, type FeedSource } from "./providers";

const FEED_CONTACT = "vagas@devjobs.global";
const FEED_PLAN = "empresa";

export type IngestionResult = {
  requested: FeedSource[];
  succeeded: FeedSource[];
  fetched: number;
  inserted: number;
  skippedDuplicates: number;
  newJobIds: string[];
  errors: Record<string, string>;
};

// Prepara um FeedJob para o banco (inferência de país/cidade por região).
function enrichFeedJob(job: FeedJob) {
  const region = job.country ? regionFromCountryCode(job.country) : flipRegionForLocation(job.location);
  const cityUpper = (job.location ?? "").toLowerCase();
  let country = job.country;
  let city = job.city;
  if (!country) {
    for (const [cityName, code] of Object.entries(CITY_TO_COUNTRY)) {
      if (cityUpper.includes(cityName)) {
        country = code;
        city = cityName;
        break;
      }
    }
  }
  return {
    ...job,
    country,
    city,
    region: (region ?? null) as string | null,
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    currency: job.currency,
  };
}

async function jobExists(source: string, externalId: string): Promise<boolean> {
  const row = await queryOne("SELECT 1 AS r FROM jobs WHERE source = ? AND external_id = ?", [source, externalId]);
  return Boolean(row?.r);
}

export async function ingestJobs(options?: {
  sources?: FeedSource[];
  runAdzunaIfKeys?: boolean;
}): Promise<IngestionResult> {
  const feedCompanyId = await ensureFeedCompany();

  const enabledSources: FeedSource[] = [];
  const env = {
    REMOTIVE_ENABLED: process.env.REMOTIVE_ENABLED !== "false",
    JSEARCH_API_KEY: process.env.JSEARCH_API_KEY,
    ADZUNA_APP_ID: process.env.ADZUNA_APP_ID,
    ADZUNA_APP_KEY: process.env.ADZUNA_APP_KEY,
  };

  const requested = options?.sources?.length ? options.sources : ((["remotive", "jsearch", "adzuna"] as FeedSource[]) as FeedSource[]);
  if (requested.includes("remotive") && env.REMOTIVE_ENABLED) enabledSources.push("remotive");
  if (requested.includes("jsearch") && env.JSEARCH_API_KEY) enabledSources.push("jsearch");
  if (requested.includes("adzuna") && env.ADZUNA_APP_ID && env.ADZUNA_APP_KEY) enabledSources.push("adzuna");

  const result: IngestionResult = {
    requested,
    succeeded: [],
    fetched: 0,
    inserted: 0,
    skippedDuplicates: 0,
    newJobIds: [],
    errors: {},
  };

  for (const source of enabledSources) {
    try {
      let jobs: FeedJob[] = [];
      if (source === "remotive") jobs = await fetchRemotive();
      if (source === "jsearch") jobs = await fetchJSearch(env.JSEARCH_API_KEY!);
      if (source === "adzuna") {
        const countries = (process.env.ADZUNA_COUNTRIES ?? "").split(",").map((s) => s.trim()).filter(Boolean);
        jobs = await fetchAdzuna(env.ADZUNA_APP_ID!, env.ADZUNA_APP_KEY!, countries);
      }
      result.succeeded.push(source);
      result.fetched += jobs.length;

      for (const rawJob of jobs) {
        if (!rawJob.externalId) continue;
        if (await jobExists(source, rawJob.externalId)) {
          result.skippedDuplicates++;
          continue;
        }
        const job = enrichFeedJob(rawJob);
        const db = await createJob({
          companyId: feedCompanyId,
          title: job.title.slice(0, 120),
          description: job.description.slice(0, 6000),
          location: job.location.slice(0, 120),
          remote: job.remote,
          type: job.type as "full-time" | "part-time" | "contract" | "internship",
          salaryMin: job.salaryMin,
          salaryMax: job.salaryMax,
          currency: job.currency,
          tags: job.tags.length ? job.tags : inferFallbackTags(job.title),
          quantity: 1,
          contactEmail: FEED_CONTACT,
          applyUrl: job.applyUrl,
          plan: FEED_PLAN as "empresa",
          status: "active",
          featured: false,
          sponsored: false,
          responsibilities: [],
          requirements: [],
          benefits: [],
          country: job.country,
          city: job.city,
          region: job.region,
          source,
          externalId: job.externalId,
          sourceCompany: job.company.slice(0, 120),
          postedAtRef: job.publishedAt ?? undefined,
          expiresAt: job.publishedAt
            ? new Date(new Date(job.publishedAt).getTime() + 30 * 86400000).toISOString()
            : new Date(Date.now() + 30 * 86400000).toISOString(),
          logoColor: "#2563eb",
        });
        result.inserted++;
        result.newJobIds.push(db.id);
      }
    } catch (error) {
      result.errors[source] = error instanceof Error ? error.message : String(error);
    }
  }

  // Evento de job.created (broadcast) para quem está escutando SSE.
  if (result.newJobIds.length) {
    await insertRealtimeEvent(null, "job.created", {
      count: result.newJobIds.length,
      jobIds: result.newJobIds,
      at: new Date().toISOString(),
    });
  }

  return result;
}

function inferFallbackTags(title: string): string[] {
  const lower = title.toLowerCase();
  const map: Record<string, string> = {
    frontend: "FRONTEND",
    backend: "BACKEND",
    fullstack: "FULLSTACK",
    devops: "DEVOPS",
    "machine learning": "AI",
    "data scientist": "DATA",
    "software engineer": "ENGINEERING",
    developer: "ENGINEERING",
    design: "DESIGN",
    mobile: "MOBILE",
    qa: "QA",
    product: "PRODUCT",
  };
  const tags: string[] = [];
  for (const [key, value] of Object.entries(map)) {
    if (lower.includes(key)) tags.push(value);
  }
  return tags.length ? [...new Set(tags)] : ["TECH"];
}