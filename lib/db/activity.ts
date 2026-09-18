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
    stage: (row.stage ?? "applied") as Application["stage"],
    notes: (row.notes as string | null) ?? null,
    resumeId: (row.resume_id as string | null) ?? null,
    analysisScore:
      row.analysis_score !== null && row.analysis_score !== undefined ? Number(row.analysis_score) : null,
    interviewId: (row.interview_id as string | null) ?? null,
    appliedVia: (row.applied_via === "ai" ? "ai" : "manual") as Application["appliedVia"],
    appliedAt: String(row.applied_at),
  };
}

async function insertApplication(
  jobId: string,
  candidateId: string,
  data: { resumeId?: string | null; analysisScore?: number | null; interviewId?: string | null; via: "manual" | "ai" }
): Promise<Application | null> {
  // Índice único (job_id, candidate_id) impede duplicidade.
  const existing = await queryOne(
    "SELECT * FROM applications WHERE job_id = ? AND candidate_id = ?",
    [jobId, candidateId]
  );
  if (existing) return toApplication(existing);

  const id = newId("app");
  const appliedAt = new Date().toISOString();
  await execute(
    `INSERT INTO applications (id, job_id, candidate_id, status, applied_via, resume_id, analysis_score, interview_id, applied_at)
     VALUES (?, ?, ?, 'applied', ?, ?, ?, ?, ?)`,
    [
      id,
      jobId,
      candidateId,
      data.via,
      data.resumeId ?? null,
      data.analysisScore ?? null,
      data.interviewId ?? null,
      appliedAt,
    ]
  );
  return {
    id,
    jobId,
    candidateId,
    status: "applied",
    stage: "applied",
    notes: null,
    resumeId: data.resumeId ?? null,
    analysisScore: data.analysisScore ?? null,
    interviewId: data.interviewId ?? null,
    appliedVia: data.via,
    appliedAt,
  };
}

export async function addApplication(jobId: string, candidateId: string): Promise<Application | null> {
  return insertApplication(jobId, candidateId, { via: "manual" });
}

export async function addAiApplication(
  jobId: string,
  candidateId: string,
  data: { resumeId?: string | null; analysisScore?: number | null; interviewId?: string | null }
): Promise<Application | null> {
  return insertApplication(jobId, candidateId, { ...data, via: "ai" });
}

export async function hasApplied(jobId: string, candidateId: string): Promise<boolean> {
  const row = await queryOne(
    "SELECT 1 FROM applications WHERE job_id = ? AND candidate_id = ?",
    [jobId, candidateId]
  );
  return Boolean(row);
}

export async function getApplicationById(id: string): Promise<Application | undefined> {
  const row = await queryOne("SELECT * FROM applications WHERE id = ?", [id]);
  return row ? toApplication(row) : undefined;
}

export type JobApplicationDetailed = Application & {
  candidateName: string;
  candidateEmail: string;
  candidateHeadline: string | null;
  candidateSkills: string[];
  resumeTitle: string | null;
  resumeFilename: string | null;
  interviewScore: number | null;
  interviewReport: { scores: string; strengths: string[]; weaknesses: string[]; recommendations: string[]; feedback: string } | null;
  consented: boolean;
};

export async function listApplicationsForJobDetailed(
  jobId: string,
  companyId: string
): Promise<JobApplicationDetailed[]> {
  const rows = await queryAll(
    `SELECT a.*, u.name AS candidate_name, u.email AS candidate_email,
            cp.headline AS candidate_headline,
            (SELECT COALESCE(array_to_json(array_agg(s.skill ORDER BY s.skill))::text, '[]')
             FROM candidate_skills s WHERE s.candidate_profile_id = cp.id) AS candidate_skills,
            r.title AS resume_title, r.filename AS resume_filename,
            it.score AS interview_score,
            (ir.scores || '~' || ir.strengths || '~' || ir.weaknesses || '~' || ir.recommendations || '~' || ir.feedback) AS interview_report_raw,
            (cons.granted = 1) AS consented
     FROM applications a
     JOIN users u ON u.id = a.candidate_id
     LEFT JOIN candidate_profiles cp ON cp.user_id = u.id
     LEFT JOIN resumes r ON r.id = a.resume_id
     LEFT JOIN interviews it ON it.id = a.interview_id
     LEFT JOIN interview_reports ir ON ir.interview_id = it.id
     LEFT JOIN consents cons ON cons.user_id = u.id AND cons.type = 'share_to_company' AND cons.target = ?
     WHERE a.job_id = ?
     ORDER BY a.applied_at DESC`,
    [companyId, jobId]
  );
  return rows.map((row) => {
    let interviewReport: JobApplicationDetailed["interviewReport"] = null;
    const raw = row.interview_report_raw ? String(row.interview_report_raw) : null;
    if (raw && raw.includes("~")) {
      const [scores, strengths, weaknesses, recommendations, feedback] = raw.split("~");
      let parsedS: string[] = [];
      let parsedW: string[] = [];
      let parsedR: string[] = [];
      try { parsedS = JSON.parse(strengths ?? "[]") as string[]; } catch { parsedS = []; }
      try { parsedW = JSON.parse(weaknesses ?? "[]") as string[]; } catch { parsedW = []; }
      try { parsedR = JSON.parse(recommendations ?? "[]") as string[]; } catch { parsedR = []; }
      interviewReport = {
        scores,
        strengths: parsedS,
        weaknesses: parsedW,
        recommendations: parsedR,
        feedback: feedback ?? "",
      };
    }
    let skills: string[] = [];
    try { skills = JSON.parse(String(row.candidate_skills ?? "[]")) as string[]; } catch { skills = []; }
    return {
      ...toApplication(row),
      candidateName: String(row.candidate_name),
      candidateEmail: String(row.candidate_email),
      candidateHeadline: (row.candidate_headline as string | null) ?? null,
      candidateSkills: skills,
      resumeTitle: (row.resume_title as string | null) ?? null,
      resumeFilename: (row.resume_filename as string | null) ?? null,
      interviewScore:
        row.interview_score !== null && row.interview_score !== undefined ? Number(row.interview_score) : null,
      interviewReport,
      consented: Number(row.consented) === 1,
    };
  });
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