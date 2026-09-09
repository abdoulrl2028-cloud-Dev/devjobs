import { queryAll, queryOne, execute, withTransaction } from "./conn";
import { newId } from "../crypto";
import type {
  Alert,
  AppNotification,
  Application,
  ApplicationStage,
  CandidateTier,
  Interview,
  InterviewTrack,
  Job,
  JobType,
  Resume,
} from "../types";
import { rowToJob, getFavoriteJobs } from "./jobs";

/* ------------------------- Candidate tier ------------------------- */

export async function getCandidateTier(userId: string): Promise<CandidateTier> {
  const row = await queryOne("SELECT candidate_tier FROM users WHERE id = ?", [userId]);
  const tier = String(row?.candidate_tier ?? "free");
  const paid = tier === "premium" || tier === "pro" ? (tier as CandidateTier) : null;
  if (!paid) return "free";
  // Verifica se a assinatura paga ainda está ativa (não expirada).
  const active = await findActiveCandidateSubscription(userId);
  if (!active) {
    await setCandidateTier(userId, "free");
    return "free";
  }
  if (active.expiresAt) {
    const expires = new Date(active.expiresAt).getTime();
    if (expires <= Date.now()) {
      await execute("UPDATE candidate_subscriptions SET status = 'expired' WHERE id = ?", [active.id]);
      await setCandidateTier(userId, "free");
      return "free";
    }
  }
  return paid;
}

export async function setCandidateTier(userId: string, tier: CandidateTier): Promise<void> {
  await execute("UPDATE users SET candidate_tier = ? WHERE id = ?", [tier, userId]);
}

/* ------------------------- Candidate subscriptions (planos pagos) ------------------------- */

export async function findPendingCandidateSubscription(
  userId: string,
  tier: CandidateTier
): Promise<{ id: string } | undefined> {
  const row = await queryOne(
    "SELECT id FROM candidate_subscriptions WHERE user_id = ? AND tier = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1",
    [userId, tier]
  );
  return row?.id ? { id: String(row.id) } : undefined;
}

export async function findActiveCandidateSubscription(
  userId: string
): Promise<{ id: string; tier: CandidateTier; cadence: string | null; expiresAt: string | null } | undefined> {
  const row = await queryOne(
    "SELECT id, tier, cadence, expires_at FROM candidate_subscriptions WHERE user_id = ? AND status = 'active' ORDER BY expires_at DESC LIMIT 1",
    [userId]
  );
  if (!row?.id) return undefined;
  return {
    id: String(row.id),
    tier: (row.tier === "premium" || row.tier === "pro" ? row.tier : "free") as CandidateTier,
    cadence: row.cadence ? String(row.cadence) : null,
    expiresAt: row.expires_at ? String(row.expires_at) : null,
  };
}

export async function createPendingCandidateSubscription(
  userId: string,
  tier: CandidateTier,
  cadence: string,
  amount: number
): Promise<string> {
  const id = newId("sub");
  await execute(
    "INSERT INTO candidate_subscriptions (id, user_id, tier, cadence, amount, status, created_at) VALUES (?, ?, ?, ?, ?, 'pending', ?)",
    [id, userId, tier, cadence, amount, new Date().toISOString()]
  );
  return id;
}

export async function cancelActiveCandidateSubscription(
  userId: string
): Promise<boolean> {
  const active = await findActiveCandidateSubscription(userId);
  if (active) {
    await execute("UPDATE candidate_subscriptions SET status = 'canceled' WHERE id = ?", [active.id]);
    await setCandidateTier(userId, "free");
    return true;
  }
  return false;
}

export async function activateCandidateSubscription(data: {
  id: string;
  userId: string;
  tier: CandidateTier;
  cadence: string;
  mock: boolean;
  stripePaymentId?: string | null;
}): Promise<void> {
  const now = new Date();
  const months = data.cadence === "annual" ? 12 : 1;
  const expires = new Date(now.getFullYear(), now.getMonth() + months, now.getDate()).toISOString();
  await execute(
    `UPDATE candidate_subscriptions
     SET status = 'active', started_at = ?, expires_at = ?, stripe_payment_id = ?
     WHERE id = ?`,
    [now.toISOString(), expires, data.stripePaymentId ?? null, data.id]
  );
  await setCandidateTier(data.userId, data.tier);
}

/* ------------------------- Applications (pipeline) ------------------------- */

export async function listApplicationsForCandidateFull(candidateId: string): Promise<
  (Application & { job?: Job })[]
> {
  const rows = await queryAll(
    `SELECT a.id AS app_id, a.job_id, a.candidate_id, a.status AS app_status,
            a.stage AS app_stage, a.notes AS app_notes, a.applied_at,
            j.*, c.name AS company_name, c.logo_color AS company_logo_color,
            c.website AS company_website, COALESCE(j.logo_color, c.logo_color) AS job_logo_color
     FROM applications a
     JOIN jobs j ON j.id = a.job_id
     JOIN companies c ON c.id = j.company_id
     WHERE a.candidate_id = ?
     ORDER BY a.applied_at DESC`,
    [candidateId]
  );
  return rows.map((row) => ({
    id: String(row.app_id),
    jobId: String(row.job_id),
    candidateId: String(row.candidate_id),
    status: String(row.app_status ?? "applied") as Application["status"],
    stage: (row.app_stage ?? "applied") as ApplicationStage,
    notes: (row.app_notes as string | null) ?? null,
    appliedAt: String(row.applied_at),
    job: row.job_id ? rowToJob(row) : undefined,
  }));
}

export async function updateApplicationStage(id: string, stage: ApplicationStage): Promise<void> {
  await execute("UPDATE applications SET stage = ? WHERE id = ?", [stage, id]);
}

export async function updateApplicationNotes(id: string, notes: string): Promise<void> {
  await execute("UPDATE applications SET notes = ? WHERE id = ?", [notes, id]);
}

/* ------------------------- Resumes ------------------------- */

export async function listResumes(userId: string): Promise<Resume[]> {
  const rows = await queryAll(
    "SELECT * FROM resumes WHERE user_id = ? ORDER BY updated_at DESC",
    [userId]
  );
  return rows.map(toResume);
}

export async function getResume(id: string, userId: string): Promise<Resume | undefined> {
  const row = await queryOne("SELECT * FROM resumes WHERE id = ? AND user_id = ?", [id, userId]);
  return row ? toResume(row) : undefined;
}

export async function createResume(
  userId: string,
  title: string,
  data: Resume["data"]
): Promise<Resume> {
  const id = newId("res");
  const now = new Date().toISOString();
  await execute(
    "INSERT INTO resumes (id, user_id, title, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    [id, userId, title, JSON.stringify(data), now, now]
  );
  return { id, userId, title, data, createdAt: now, updatedAt: now };
}

export async function updateResume(
  id: string,
  userId: string,
  title: string,
  data: Resume["data"]
): Promise<void> {
  await execute("UPDATE resumes SET title = ?, data = ?, updated_at = ? WHERE id = ? AND user_id = ?", [
    title,
    JSON.stringify(data),
    new Date().toISOString(),
    id,
    userId,
  ]);
}

export async function duplicateResume(id: string, userId: string): Promise<Resume | undefined> {
  const source = await getResume(id, userId);
  if (!source) return undefined;
  return createResume(userId, `${source.title} (cópia)`, source.data);
}

export async function deleteResume(id: string, userId: string): Promise<void> {
  await execute("DELETE FROM resumes WHERE id = ? AND user_id = ?", [id, userId]);
}

function toResume(row: Record<string, unknown>): Resume {
  let data: Resume["data"];
  try {
    data = JSON.parse(String(row.data ?? "{}")) as Resume["data"];
  } catch {
    data = {} as Resume["data"];
  }
  return {
    id: String(row.id),
    userId: String(row.user_id),
    title: String(row.title),
    data,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

/* ------------------------- Alerts ------------------------- */

export async function listAlerts(userId: string): Promise<Alert[]> {
  const rows = await queryAll("SELECT * FROM alerts WHERE user_id = ? ORDER BY created_at DESC", [
    userId,
  ]);
  return rows.map(toAlert);
}

export async function createAlert(
  userId: string,
  input: Omit<Alert, "id" | "userId" | "createdAt" | "lastRunAt">
): Promise<Alert> {
  const id = newId("alrt");
  const now = new Date().toISOString();
  await execute(
    `INSERT INTO alerts (id, user_id, name, query, location, remote, type, salary_min, tags, frequency, active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      userId,
      input.name,
      input.query,
      input.location ?? null,
      input.remote ? 1 : 0,
      input.type ?? null,
      input.salaryMin ?? null,
      JSON.stringify(input.tags),
      input.frequency,
      input.active ? 1 : 0,
      now,
    ]
  );
  return { ...input, id, userId, createdAt: now, lastRunAt: null };
}

export async function updateAlert(
  id: string,
  userId: string,
  input: Partial<Omit<Alert, "id" | "userId" | "createdAt" | "lastRunAt">>
): Promise<void> {
  const sets: string[] = [];
  const params: (string | number | null)[] = [];
  if (input.name !== undefined) {
    sets.push("name = ?");
    params.push(input.name);
  }
  if (input.query !== undefined) {
    sets.push("query = ?");
    params.push(input.query);
  }
  if (input.location !== undefined) {
    sets.push("location = ?");
    params.push(input.location ?? null);
  }
  if (input.remote !== undefined) {
    sets.push("remote = ?");
    params.push(input.remote ? 1 : 0);
  }
  if (input.type !== undefined) {
    sets.push("type = ?");
    params.push(input.type ?? null);
  }
  if (input.salaryMin !== undefined) {
    sets.push("salary_min = ?");
    params.push(input.salaryMin ?? null);
  }
  if (input.tags !== undefined) {
    sets.push("tags = ?");
    params.push(JSON.stringify(input.tags));
  }
  if (input.frequency !== undefined) {
    sets.push("frequency = ?");
    params.push(input.frequency);
  }
  if (input.active !== undefined) {
    sets.push("active = ?");
    params.push(input.active ? 1 : 0);
  }
  if (sets.length === 0 || params.length === 0) return;
  params.push(id, userId);
  await execute(`UPDATE alerts SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`, params);
}

export async function deleteAlert(id: string, userId: string): Promise<void> {
  await execute("DELETE FROM alerts WHERE id = ? AND user_id = ?", [id, userId]);
}

export async function markAlertRun(id: string, userId: string): Promise<void> {
  await execute("UPDATE alerts SET last_run_at = ? WHERE id = ? AND user_id = ?", [
    new Date().toISOString(),
    id,
    userId,
  ]);
}

function toAlert(row: Record<string, unknown>): Alert {
  let tags: string[] = [];
  try {
    tags = JSON.parse(String(row.tags ?? "[]")) as string[];
  } catch {
    tags = [];
  }
  return {
    id: String(row.id),
    userId: String(row.user_id),
    name: String(row.name),
    query: String(row.query ?? ""),
    location: (row.location as string | null) ?? null,
    remote: Boolean(row.remote),
    type: (row.type as JobType | null) ?? null,
    salaryMin: row.salary_min !== null && row.salary_min !== undefined ? Number(row.salary_min) : null,
    tags,
    frequency: (row.frequency as Alert["frequency"]) ?? "weekly",
    active: Boolean(row.active),
    createdAt: String(row.created_at),
    lastRunAt: (row.last_run_at as string | null) ?? null,
  };
}

/* ------------------------- Notifications ------------------------- */

export async function listNotifications(userId: string, limit = 30): Promise<AppNotification[]> {
  const rows = await queryAll(
    "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
    [userId, limit]
  );
  return rows.map(toNotification);
}

export async function createNotification(
  userId: string,
  input: { type: AppNotification["type"]; title: string; body?: string; jobId?: string }
): Promise<void> {
  await execute(
    `INSERT INTO notifications (id, user_id, type, title, body, job_id, read, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
    [newId("ntf"), userId, input.type, input.title, input.body ?? null, input.jobId ?? null,
      new Date().toISOString()]
  );
}

export async function markNotificationRead(id: string, userId: string): Promise<void> {
  await execute("UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?", [id, userId]);
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await execute("UPDATE notifications SET read = 1 WHERE user_id = ? AND read = 0", [userId]);
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  const row = await queryOne(
    "SELECT COUNT(*) AS total FROM notifications WHERE user_id = ? AND read = 0",
    [userId]
  );
  return Number(row?.total ?? 0);
}

function toNotification(row: Record<string, unknown>): AppNotification {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    type: (row.type as AppNotification["type"]) ?? "info",
    title: String(row.title),
    body: (row.body as string | null) ?? null,
    jobId: (row.job_id as string | null) ?? null,
    read: Boolean(row.read),
    createdAt: String(row.created_at),
  };
}

/* ------------------------- Interviews ------------------------- */

export async function listInterviews(userId: string): Promise<Interview[]> {
  const rows = await queryAll(
    "SELECT * FROM interviews WHERE user_id = ? ORDER BY created_at DESC",
    [userId]
  );
  return rows.map(toInterview);
}

export async function getInterview(id: string, userId: string): Promise<Interview | undefined> {
  const row = await queryOne("SELECT * FROM interviews WHERE id = ? AND user_id = ?", [id, userId]);
  return row ? toInterview(row) : undefined;
}

export async function createInterview(
  userId: string,
  input: {
    track: InterviewTrack;
    jobId?: string;
    topic: string;
    questions: string[];
    answers: string[];
    score: number;
    metrics: Interview["metrics"];
  }
): Promise<Interview> {
  const id = newId("int");
  const now = new Date().toISOString();
  await execute(
    `INSERT INTO interviews (id, user_id, track, job_id, topic, questions, answers, score, metrics, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?)`,
    [
      id,
      userId,
      input.track,
      input.jobId ?? null,
      input.topic,
      JSON.stringify(input.questions),
      JSON.stringify(input.answers),
      input.score,
      JSON.stringify(input.metrics),
      now,
    ]
  );
  return {
    id,
    userId,
    track: input.track,
    topic: input.topic,
    questions: input.questions,
    answers: input.answers,
    score: input.score,
    metrics: input.metrics,
    status: "completed",
    createdAt: now,
  };
}

function toInterview(row: Record<string, unknown>): Interview {
  let questions: string[] = [];
  let answers: string[] = [];
  let metrics: Interview["metrics"] = {
    technical: 0,
    communication: 0,
    clarity: 0,
    experience: 0,
    problemSolving: 0,
  };
  try {
    questions = JSON.parse(String(row.questions ?? "[]")) as string[];
  } catch {
    questions = [];
  }
  try {
    answers = JSON.parse(String(row.answers ?? "[]")) as string[];
  } catch {
    answers = [];
  }
  try {
    metrics = { ...metrics, ...(JSON.parse(String(row.metrics ?? "{}")) as Partial<Interview["metrics"]>) };
  } catch {
    // mantém valores padrão
  }
  return {
    id: String(row.id),
    userId: String(row.user_id),
    track: (row.track as InterviewTrack) ?? "frontend",
    topic: String(row.topic ?? ""),
    questions,
    answers,
    score: row.score !== null && row.score !== undefined ? Number(row.score) : null,
    metrics,
    status: "completed",
    createdAt: String(row.created_at),
  };
}

/* ------------------------- AI usage (quota) ------------------------- */

export async function countAiAnalysesThisMonth(userId: string): Promise<number> {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const row = await queryOne(
    "SELECT COUNT(*) AS total FROM ai_analyses WHERE user_id = ? AND created_at >= ?",
    [userId, start]
  );
  return Number(row?.total ?? 0);
}

export async function recordAiAnalysis(userId: string, jobId: string | null, score: number): Promise<void> {
  await execute(
    "INSERT INTO ai_analyses (id, user_id, job_id, score, created_at) VALUES (?, ?, ?, ?, ?)",
    [newId("ai"), userId, jobId ?? null, score, new Date().toISOString()]
  );
}

/* ------------------------- Agregações do dashboard ------------------------- */

export async function candidateStats(userId: string): Promise<{
  applications: number;
  favorites: number;
  appliedApplications: number;
  testApplications: number;
  interviewApplications: number;
  offerApplications: number;
  hiredApplications: number;
  rejectedApplications: number;
  interviewsTaken: number;
  avgInterviewScore: number;
  profileCompleteness: number;
}> {
  const [appsRow, favs, ints, profile] = await Promise.all([
    queryOne("SELECT * FROM applications WHERE candidate_id = ?", [userId]),
    getFavoriteJobs(userId),
    listInterviews(userId),
    queryOne("SELECT * FROM candidate_profiles WHERE user_id = ?", [userId]),
  ]);

  const apps = appsRow?.id
    ? await queryAll("SELECT stage FROM applications WHERE candidate_id = ?", [userId])
    : [];

  const byStage = (stage: ApplicationStage) =>
    apps.filter((r) => String(r.stage ?? "applied") === stage).length;

  const scores = ints.map((i) => i.score ?? 0);
  const avg = scores.length
    ? Math.round(scores.reduce((acc, n) => acc + n, 0) / scores.length)
    : 0;

  return {
    applications: apps.length,
    favorites: favs.length,
    appliedApplications: byStage("applied"),
    testApplications: byStage("test"),
    interviewApplications: byStage("interview"),
    offerApplications: byStage("offer"),
    hiredApplications: byStage("hired"),
    rejectedApplications: byStage("rejected"),
    interviewsTaken: ints.length,
    avgInterviewScore: avg,
    profileCompleteness: 0,
  };
}