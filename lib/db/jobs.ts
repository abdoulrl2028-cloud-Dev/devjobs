import { queryAll, queryOne, execute, likeEscape, withTransaction } from "./conn";
import { newId } from "../crypto";
import type {
  DbJob,
  Job,
  JobStatus,
  JobType,
  Plan,
} from "../types";
import { getEffectivePlan } from "./company";

export type JobFilter = {
  q?: string | null;
  location?: string | null;
  type?: string | null;
  remote?: string | null;
  include?: JobStatus[];
};

function parseJsonArray(value: unknown): string[] {
  try {
    const parsed = JSON.parse(String(value ?? "[]"));
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function rowToJob(row: Record<string, unknown>): Job {
  return {
    id: String(row.id),
    companyId: String(row.company_id),
    title: String(row.title),
    description: String(row.description),
    location: String(row.location),
    remote: Boolean(row.remote),
    type: row.type as JobType,
    salary:
      row.salary_min !== null && row.salary_max !== null
        ? {
            min: Number(row.salary_min),
            max: Number(row.salary_max),
            currency: String(row.currency ?? "BRL"),
          }
        : null,
    tags: parseJsonArray(row.tags),
    quantity: Number(row.quantity),
    contactEmail: String(row.contact_email),
    applyUrl: (row.apply_url as string | null) ?? null,
    status: row.status as JobStatus,
    featured: Boolean(row.featured),
    sponsored: Boolean(row.sponsored),
    plan: row.plan as Plan,
    responsibilities: parseJsonArray(row.responsibilities),
    requirements: parseJsonArray(row.requirements),
    benefits: parseJsonArray(row.benefits),
    views: Number(row.views),
    clicks: Number(row.clicks),
    expiresAt: (row.expires_at as string | null) ?? null,
    createdAt: String(row.created_at),
    company: String(row.company_name ?? ""),
    logoColor: String(row.job_logo_color ?? row.company_logo_color ?? "#6d28d9"),
    companyUrl: (row.company_website as string | null) ?? null,
    postedAt: String(row.created_at),
  };
}

const JOB_SELECT = `
  SELECT j.*,
         c.name AS company_name,
         c.logo_color AS company_logo_color,
         c.website AS company_website,
         COALESCE(j.logo_color, c.logo_color) AS job_logo_color
  FROM jobs j
  JOIN companies c ON c.id = j.company_id
`;

export async function searchJobs(filter: JobFilter): Promise<Job[]> {
  const where: string[] = [];
  const params: (string | number)[] = [];

  const statuses = filter.include ?? ["active"];
  const statusPlaceholders = statuses.map(() => "?").join(", ");
  where.push(`j.status IN (${statusPlaceholders})`);
  params.push(...statuses);

  if (filter.q) {
    const q = filter.q.trim().toLowerCase();
    where.push(
      `(LOWER(j.title) LIKE ? ESCAPE '\\' OR LOWER(c.name) LIKE ? ESCAPE '\\' OR LOWER(j.tags) LIKE ? ESCAPE '\\')`
    );
    params.push(`%${likeEscape(q)}%`, `%${likeEscape(q)}%`, `%${likeEscape(q)}%`);
  }
  if (filter.location) {
    where.push("LOWER(j.location) LIKE ? ESCAPE '\\'");
    params.push(`%${likeEscape(filter.location.toLowerCase())}%`);
  }
  if (filter.type) {
    where.push("j.type = ?");
    params.push(filter.type);
  }
  if (filter.remote === "true") {
    where.push("j.remote = 1");
  }
  if (filter.remote === "false") {
    where.push("j.remote = 0");
  }

  // Sem patrocinadas na listagem principal — elas aparecem na área de anúncios.
  const isPublicList = !filter.include || filter.include.length === 1 && filter.include[0] === "active";
  if (isPublicList) where.push("j.sponsored = 0");

  const order = isPublicList
    ? "featured DESC, created_at DESC"
    : "created_at DESC";

  const rows = await queryAll(
    `${JOB_SELECT} WHERE ${where.join(" AND ")} ORDER BY ${order}`,
    params as (string | number | bigint | boolean | null)[]
  );
  return rows.map(rowToJob);
}

export async function getSponsoredJobs(status: JobStatus[] = ["active"]): Promise<Job[]> {
  const placeholders = status.map(() => "?").join(", ");
  const rows = await queryAll(
    `${JOB_SELECT} WHERE j.sponsored = 1 AND j.status IN (${placeholders}) ORDER BY created_at DESC`,
    status
  );
  return rows.map(rowToJob);
}

export async function getJobById(id: string): Promise<Job | undefined> {
  const row = await queryOne(`${JOB_SELECT} WHERE j.id = ?`, [id]);
  return row ? rowToJob(row) : undefined;
}

export type NewJobInput = {
  companyId: string;
  title: string;
  description: string;
  location: string;
  remote: boolean;
  type: string;
  salaryMin?: number | null;
  salaryMax?: number | null;
  currency?: string | null;
  tags: string[];
  quantity: number;
  contactEmail: string;
  applyUrl?: string | null;
  plan: Plan;
  status: JobStatus;
  featured?: boolean;
  sponsored?: boolean;
  responsibilities: string[];
  requirements: string[];
  benefits: string[];
};

const PLAN_DURATION_DAYS: Record<Plan, number> = {
  free: 15,
  destaque: 30,
  pro: 30,
  empresa: 30,
};

export async function createJob(input: NewJobInput): Promise<DbJob> {
  const id = newId("job");
  const now = new Date();
  const createdAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + PLAN_DURATION_DAYS[input.plan] * 86400000).toISOString();
  const currency = input.currency ?? "BRL";
  const salaryMin = input.salaryMin ?? null;
  const salaryMax = input.salaryMax ?? null;

  await execute(
    `INSERT INTO jobs (
      id, company_id, title, description, location, remote, type,
      salary_min, salary_max, currency, tags, quantity, contact_email, apply_url,
      status, featured, sponsored, plan,
      responsibilities, requirements, benefits,
      expires_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.companyId,
      input.title.trim(),
      input.description.trim(),
      input.location.trim(),
      input.remote ? 1 : 0,
      input.type,
      salaryMin,
      salaryMax,
      currency,
      JSON.stringify(input.tags),
      input.quantity,
      input.contactEmail.trim(),
      input.applyUrl?.trim() ?? null,
      input.status,
      input.featured ? 1 : 0,
      input.sponsored ? 1 : 0,
      input.plan,
      JSON.stringify(input.responsibilities),
      JSON.stringify(input.requirements),
      JSON.stringify(input.benefits),
      expiresAt,
      createdAt,
    ]
  );

  return {
    id,
    companyId: input.companyId,
    title: input.title.trim(),
    description: input.description.trim(),
    location: input.location.trim(),
    remote: input.remote,
    type: input.type as JobType,
    salaryMin,
    salaryMax,
    currency,
    tags: input.tags,
    quantity: input.quantity,
    contactEmail: input.contactEmail.trim(),
    applyUrl: input.applyUrl?.trim() ?? null,
    status: input.status,
    featured: input.featured ?? false,
    sponsored: input.sponsored ?? false,
    plan: input.plan,
    responsibilities: input.responsibilities,
    requirements: input.requirements,
    benefits: input.benefits,
    views: 0,
    clicks: 0,
    expiresAt,
    createdAt,
  };
}

export async function updateJob(
  id: string,
  data: Partial<
    Pick<
      NewJobInput,
      | "title"
      | "description"
      | "location"
      | "remote"
      | "type"
      | "salaryMin"
      | "salaryMax"
      | "currency"
      | "tags"
      | "quantity"
      | "contactEmail"
      | "applyUrl"
      | "responsibilities"
      | "requirements"
      | "benefits"
    >
  > & { featured?: boolean; sponsored?: boolean; status?: JobStatus }
): Promise<void> {
  const sets: string[] = [];
  const params: (string | number | null)[] = [];

  const fieldMap: Partial<Record<keyof typeof data, string>> = {
    title: "title",
    description: "description",
    location: "location",
    remote: "remote",
    type: "type",
    salaryMin: "salary_min",
    salaryMax: "salary_max",
    currency: "currency",
    tags: "tags",
    quantity: "quantity",
    contactEmail: "contact_email",
    applyUrl: "apply_url",
    responsibilities: "responsibilities",
    requirements: "requirements",
    benefits: "benefits",
    featured: "featured",
    sponsored: "sponsored",
    status: "status",
  };

  (Object.keys(data) as (keyof typeof data)[]).forEach((key) => {
    const column = fieldMap[key];
    if (!column) return;
    const value = data[key];
    if (value === undefined) return;
    sets.push(`${column} = ?`);
    if (key === "tags" || key === "responsibilities" || key === "requirements" || key === "benefits")
      params.push(JSON.stringify(value as string[]));
    else if (key === "remote") params.push(value ? 1 : 0);
    else if (key === "featured" || key === "sponsored") params.push(value ? 1 : 0);
    else if (key === "title" || key === "description" || key === "location")
      params.push(String(value).trim());
    else if (key === "applyUrl") params.push((value as string | null)?.trim() ?? null);
    else if (key === "salaryMin") params.push((value as number | null) ?? null);
    else if (key === "salaryMax") params.push((value as number | null) ?? null);
    else params.push(value as string);
  });

  if (sets.length === 0) return;
  params.push(id);
  await execute(`UPDATE jobs SET ${sets.join(", ")} WHERE id = ?`, params);
}

export async function setJobStatus(id: string, status: JobStatus): Promise<void> {
  await execute("UPDATE jobs SET status = ? WHERE id = ?", [status, id]);
}

export async function deleteJob(id: string): Promise<void> {
  await withTransaction(async (tx) => {
    await tx.execute("DELETE FROM applications WHERE job_id = ?", [id]);
    await tx.execute("DELETE FROM favorites WHERE job_id = ?", [id]);
    await tx.execute("DELETE FROM job_views WHERE job_id = ?", [id]);
    await tx.execute("UPDATE payments SET job_id = NULL WHERE job_id = ?", [id]);
    await tx.execute("DELETE FROM jobs WHERE id = ?", [id]);
  });
}

export async function getCompanyJobs(companyId: string): Promise<Job[]> {
  const rows = await queryAll(
    `${JOB_SELECT} WHERE j.company_id = ? ORDER BY created_at DESC`,
    [companyId]
  );
  return rows.map(rowToJob);
}

export async function getAllJobs(): Promise<Job[]> {
  const rows = await queryAll(`${JOB_SELECT} ORDER BY created_at DESC`);
  return rows.map(rowToJob);
}

export async function getFavoriteJobs(userId: string): Promise<Job[]> {
  const rows = await queryAll(
    `${JOB_SELECT} JOIN favorites f ON f.job_id = j.id WHERE f.user_id = ? ORDER BY f.created_at DESC`,
    [userId]
  );
  return rows.map(rowToJob);
}

/* ------------------------- Limite por plano ------------------------- */

export async function countActiveJobsForCompany(companyId: string): Promise<number> {
  const row = await queryOne(
    "SELECT COUNT(*) AS total FROM jobs WHERE company_id = ? AND status IN ('pending', 'active') AND expires_at > ?",
    [companyId, new Date().toISOString()]
  );
  return Number(row?.total ?? 0);
}

function limitForPlan(plan: Plan): number {
  return plan === "free" || plan === "destaque" ? 1 : plan === "pro" ? 5 : Infinity;
}

/*
 * Verifica se a empresa pode publicar mais uma vaga.
 * Sem `options.forPlan`, usa o plano efetivo (assinatura ativa) da empresa.
 * Ao publicar uma vaga, o formulário indica o plano desejado — informamos
 * `forPlan` para validar o limite do plano da vaga em si.
 */
export async function canCompanyPostMore(
  companyId: string,
  options?: { forPlan?: Plan }
): Promise<{
  allowed: boolean;
  plan: Plan;
  active: number;
  limit: number;
}> {
  const currentPlan = await getEffectivePlan(companyId);
  const plan = options?.forPlan ?? currentPlan;
  const active = await countActiveJobsForCompany(companyId);
  const limit = limitForPlan(plan);
  return { allowed: active < limit, plan, active, limit };
}

/* ------------------------- Métricas ------------------------- */

export async function countJobsByStatus(status: JobStatus): Promise<number> {
  const row = await queryOne("SELECT COUNT(*) AS total FROM jobs WHERE status = ?", [status]);
  return Number(row?.total ?? 0);
}

export async function countFlagged(column: "featured" | "sponsored"): Promise<number> {
  const row = await queryOne(`SELECT COUNT(*) AS total FROM jobs WHERE ${column} = 1`);
  return Number(row?.total ?? 0);
}

export async function countJobsByPlan(plan: Plan): Promise<number> {
  const row = await queryOne("SELECT COUNT(*) AS total FROM jobs WHERE plan = ? AND status = 'active'", [plan]);
  return Number(row?.total ?? 0);
}

export async function recordJobView(jobId: string): Promise<void> {
  await withTransaction(async (tx) => {
    await tx.execute("UPDATE jobs SET views = views + 1 WHERE id = ?", [jobId]);
    await tx.execute(
      "INSERT INTO job_views (id, job_id, viewed_at) VALUES (?, ?, ?)",
      [newId("view"), jobId, new Date().toISOString()]
    );
  });
}

export async function incrementJobClicks(jobId: string): Promise<void> {
  await execute("UPDATE jobs SET clicks = clicks + 1 WHERE id = ?", [jobId]);
}

export async function getDistinctLocations(): Promise<string[]> {
  const rows = await queryAll(
    "SELECT DISTINCT location FROM jobs WHERE status = 'active' AND sponsored = 0 ORDER BY location"
  );
  return rows.map((r) => String(r.location));
}

export async function countActiveJobs(): Promise<number> {
  const row = await queryOne("SELECT COUNT(*) AS total FROM jobs WHERE status = 'active'");
  return Number(row?.total ?? 0);
}