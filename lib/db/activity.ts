import { queryAll, queryOne, execute, isPostgres } from "./conn";
import { newId } from "../crypto";
import type { Application } from "../types";

/* ------------------------- Applications ------------------------- */

function toApplication(row: Record<string, unknown>): Application {
  return {
    id: String(row.id),
    jobId: String(row.job_id),
    candidateId: String(row.candidate_id),
    status: (row.status ?? "applied") as Application["status"],
    appliedAt: String(row.applied_at),
  };
}

export async function addApplication(jobId: string, candidateId: string): Promise<Application | null> {
  // Índice único (job_id, candidate_id) impede duplicidade.
  const existing = await queryOne(
    "SELECT * FROM applications WHERE job_id = ? AND candidate_id = ?",
    [jobId, candidateId]
  );
  if (existing) return toApplication(existing);

  const id = newId("app");
  const appliedAt = new Date().toISOString();
  await execute(
    "INSERT INTO applications (id, job_id, candidate_id, status, applied_at) VALUES (?, ?, ?, 'applied', ?)",
    [id, jobId, candidateId, appliedAt]
  );
  return { id, jobId, candidateId, status: "applied", appliedAt };
}

export async function hasApplied(jobId: string, candidateId: string): Promise<boolean> {
  const row = await queryOne(
    "SELECT 1 FROM applications WHERE job_id = ? AND candidate_id = ?",
    [jobId, candidateId]
  );
  return Boolean(row);
}

export async function listApplicationsForJob(jobId: string): Promise<
  (Application & { candidateName: string; candidateEmail: string })[]
> {
  const rows = await queryAll(
    `SELECT a.*, u.name AS candidate_name, u.email AS candidate_email
     FROM applications a
     JOIN users u ON u.id = a.candidate_id
     WHERE a.job_id = ?
     ORDER BY a.applied_at DESC`,
    [jobId]
  );
  return rows.map((row) => ({
    ...toApplication(row),
    candidateName: String(row.candidate_name),
    candidateEmail: String(row.candidate_email),
  }));
}

export async function listApplicationsForCandidate(candidateId: string): Promise<Application[]> {
  const rows = await queryAll(
    "SELECT * FROM applications WHERE candidate_id = ? ORDER BY applied_at DESC",
    [candidateId]
  );
  return rows.map(toApplication);
}

export async function countApplicationsForJob(jobId: string): Promise<number> {
  const row = await queryOne("SELECT COUNT(*) AS total FROM applications WHERE job_id = ?", [jobId]);
  return Number(row?.total ?? 0);
}

export async function countApplicationsForCompany(companyId: string): Promise<number> {
  const row = await queryOne(
    `SELECT COUNT(*) AS total FROM applications a
     JOIN jobs j ON j.id = a.job_id
     WHERE j.company_id = ?`,
    [companyId]
  );
  return Number(row?.total ?? 0);
}

export async function updateApplicationStatus(id: string, status: Application["status"]): Promise<void> {
  await execute("UPDATE applications SET status = ? WHERE id = ?", [status, id]);
}

export async function countApplicationsTotal(): Promise<number> {
  const row = await queryOne("SELECT COUNT(*) AS total FROM applications");
  return Number(row?.total ?? 0);
}

/* ------------------------- Favorites ------------------------- */

export async function getFavoriteJobIds(userId: string): Promise<string[]> {
  const rows = await queryAll("SELECT job_id FROM favorites WHERE user_id = ?", [userId]);
  return rows.map((r) => String(r.job_id));
}

export async function addFavorite(userId: string, jobId: string): Promise<void> {
  const sql = isPostgres
    ? "INSERT INTO favorites (user_id, job_id, created_at) VALUES (?, ?, ?) ON CONFLICT (user_id, job_id) DO NOTHING"
    : "INSERT OR IGNORE INTO favorites (user_id, job_id, created_at) VALUES (?, ?, ?)";
  await execute(sql, [userId, jobId, new Date().toISOString()]);
}

export async function removeFavorite(userId: string, jobId: string): Promise<void> {
  await execute("DELETE FROM favorites WHERE user_id = ? AND job_id = ?", [userId, jobId]);
}

/* ------------------------- Job views history ------------------------- */

export async function countViewsLastDays(days: number): Promise<number> {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const row = await queryOne("SELECT COUNT(*) AS total FROM job_views WHERE viewed_at >= ?", [since]);
  return Number(row?.total ?? 0);
}