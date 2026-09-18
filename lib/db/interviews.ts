import { queryAll, queryOne, execute } from "./conn";
import { newId } from "../crypto";
import type { InterviewResult, InterviewScheduleStatus, InterviewType, InterviewPlanQuestion } from "../types";

type SqlValue = string | number | bigint | boolean | null;

export type InterviewListItem = {
  id: string;
  type: InterviewType;
  companyId: string | null;
  companyName: string | null;
  candidateId: string | null;
  candidateName: string | null;
  jobId: string | null;
  jobTitle: string | null;
  title: string | null;
  description: string | null;
  scheduledAt: string | null;
  durationMinutes: number | null;
  meetingUrl: string | null;
  interviewerName: string | null;
  status: string;
  score: number | null;
  createdAt: string;
  updatedAt: string | null;
  trackingId?: string;
};

const LIST_SELECT = `
  SELECT i.*, u.name AS candidate_name, j.title AS job_title, c.name AS company_name
  FROM interviews i
  LEFT JOIN users u ON u.id = COALESCE(i.candidate_id, i.user_id)
  LEFT JOIN jobs j ON j.id = i.job_id
  LEFT JOIN companies c ON c.id = i.company_id
`;

function toListItem(row: Record<string, unknown>): InterviewListItem {
  return {
    id: String(row.id),
    type: (row.type as InterviewType) ?? "ai",
    companyId: row.company_id ? String(row.company_id) : null,
    companyName: row.company_name ? String(row.company_name) : null,
    candidateId: row.candidate_id ? String(row.candidate_id) : null,
    candidateName: row.candidate_name ? String(row.candidate_name) : null,
    jobId: row.job_id ? String(row.job_id) : null,
    jobTitle: row.job_title ? String(row.job_title) : null,
    title: row.title ? String(row.title) : null,
    description: row.description ? String(row.description) : null,
    scheduledAt: row.scheduled_at ? String(row.scheduled_at) : null,
    durationMinutes: row.duration_minutes !== null && row.duration_minutes !== undefined ? Number(row.duration_minutes) : null,
    meetingUrl: row.meeting_url ? String(row.meeting_url) : null,
    interviewerName: row.interviewer_name ? String(row.interviewer_name) : null,
    status: String(row.status ?? "scheduled"),
    score: row.score !== null && row.score !== undefined ? Number(row.score) : null,
    createdAt: String(row.created_at),
    updatedAt: row.updated_at ? String(row.updated_at) : null,
    trackingId: (row.track as string) ?? undefined,
  };
}

export type InterviewQuestionRow = { id: string; interviewId: string; question: string; questionType: string; orderIndex: number; createdAt: string };
export type InterviewAnswerRow = {
  id: string;
  interviewId: string;
  questionId: string | null;
  candidateId: string;
  answerText: string | null;
  answerAudioUrl: string | null;
  score: number | null;
  feedback: string | null;
  createdAt: string;
};

export async function createScheduledInterview(input: {
  userId: string;
  companyId: string;
  jobId: string;
  candidateId: string;
  type: InterviewType;
  title: string;
  description?: string | null;
  scheduledAt: string;
  durationMinutes: number;
  meetingUrl?: string | null;
  interviewerName?: string | null;
}): Promise<string> {
  const id = newId("int");
  const now = new Date().toISOString();
  await execute(
    `INSERT INTO interviews (
      id, user_id, track, job_id, topic, questions, answers, metrics, status, created_at,
      type, company_id, candidate_id, title, description, scheduled_at, duration_minutes,
      meeting_url, interviewer_name, updated_at
    ) VALUES (?, ?, ?, ?, ?, '[]', '[]', '{}', 'scheduled', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.userId,
      input.type,
      input.jobId,
      input.title,
      now,
      input.type,
      input.companyId,
      input.candidateId,
      input.title,
      input.description ?? null,
      input.scheduledAt,
      input.durationMinutes,
      input.meetingUrl ?? null,
      input.interviewerName ?? null,
      now,
    ]
  );
  return id;
}

export async function updateScheduledInterview(
  id: string,
  companyId: string,
  patch: {
    scheduledAt?: string;
    durationMinutes?: number;
    meetingUrl?: string | null;
    interviewerName?: string | null;
    status?: InterviewScheduleStatus;
    title?: string;
    description?: string | null;
  }
): Promise<boolean> {
  const fields: string[] = [];
  const values: SqlValue[] = [];
  const add = (col: string, value: unknown) => {
    if (value !== undefined) {
      fields.push(`${col} = ?`);
      values.push(value as SqlValue);
    }
  };
  add("scheduled_at", patch.scheduledAt);
  add("duration_minutes", patch.durationMinutes);
  add("meeting_url", patch.meetingUrl);
  add("interviewer_name", patch.interviewerName);
  add("status", patch.status);
  add("title", patch.title);
  add("description", patch.description);
  if (fields.length === 0) return false;
  fields.push("updated_at = ?");
  values.push(new Date().toISOString());
  await execute(`UPDATE interviews SET ${fields.join(", ")} WHERE id = ? AND company_id = ?`, [...values, id, companyId]);
  const check = await queryOne("SELECT id FROM interviews WHERE id = ? AND company_id = ?", [id, companyId]);
  return Boolean(check);
}

export async function listCompanyInterviews(companyId: string): Promise<InterviewListItem[]> {
  const rows = await queryAll(`${LIST_SELECT} WHERE i.company_id = ? ORDER BY i.created_at DESC`, [companyId]);
  return rows.map(toListItem);
}

export async function listCandidateInterviews(userId: string): Promise<InterviewListItem[]> {
  const rows = await queryAll(
    `${LIST_SELECT} WHERE u.id = ? ORDER BY i.created_at DESC`,
    [userId]
  );
  return rows.map(toListItem);
}

export async function getCompanyInterview(companyId: string, id: string): Promise<{ item: InterviewListItem | null; questions: InterviewQuestionRow[]; answers: InterviewAnswerRow[]; result: InterviewResult | null }> {
  const row = await queryOne(`${LIST_SELECT} WHERE i.id = ? AND i.company_id = ?`, [id, companyId]);
  if (!row) return { item: null, questions: [], answers: [], result: null };
  return { item: toListItem(row), ...(await attachDetail(id)) };
}

export async function getCandidateInterview(userId: string, id: string): Promise<{ item: InterviewListItem | null; questions: InterviewQuestionRow[]; answers: InterviewAnswerRow[]; result: InterviewResult | null }> {
  const row = await queryOne(`${LIST_SELECT} WHERE i.id = ? AND COALESCE(i.candidate_id, i.user_id) = ?`, [id, userId]);
  if (!row) return { item: null, questions: [], answers: [], result: null };
  return { item: toListItem(row), ...(await attachDetail(id)) };
}

async function attachDetail(id: string) {
  const questionRows = await queryAll(
    "SELECT * FROM interview_questions WHERE interview_id = ? ORDER BY order_index ASC",
    [id]
  );
  const questions: InterviewQuestionRow[] = questionRows.map((r) => ({
    id: String(r.id),
    interviewId: String(r.interview_id),
    question: String(r.question),
    questionType: String(r.question_type),
    orderIndex: Number(r.order_index),
    createdAt: String(r.created_at),
  }));
  const answerRows = await queryAll(
    "SELECT * FROM interview_answers WHERE interview_id = ? ORDER BY created_at ASC",
    [id]
  );
  const answers: InterviewAnswerRow[] = answerRows.map((r) => ({
    id: String(r.id),
    interviewId: String(r.interview_id),
    questionId: r.question_id ? String(r.question_id) : null,
    candidateId: String(r.candidate_id),
    answerText: r.answer_text ? String(r.answer_text) : null,
    answerAudioUrl: r.answer_audio_url ? String(r.answer_audio_url) : null,
    score: r.score !== null && r.score !== undefined ? Number(r.score) : null,
    feedback: r.feedback ? String(r.feedback) : null,
    createdAt: String(r.created_at),
  }));
  const resultRow = await queryOne("SELECT * FROM interview_results WHERE interview_id = ? ORDER BY created_at DESC LIMIT 1", [id]);
  const result = resultRow ? toResult(resultRow) : null;
  return { questions, answers, result };
}

function toResult(row: Record<string, unknown>): InterviewResult {
  const parse = (v: unknown, fallback: string[]): string[] => {
    try {
      const parsed = JSON.parse(String(v ?? "[]"));
      return Array.isArray(parsed) ? parsed.map((item: unknown) => String(item)) : fallback;
    } catch {
      return fallback;
    }
  };
  return {
    id: String(row.id),
    interviewId: String(row.interview_id),
    candidateId: String(row.candidate_id),
    technicalScore: row.technical_score !== null && row.technical_score !== undefined ? Number(row.technical_score) : null,
    practicalScore: row.practical_score !== null && row.practical_score !== undefined ? Number(row.practical_score) : null,
    theoreticalScore: row.theoretical_score !== null && row.theoretical_score !== undefined ? Number(row.theoretical_score) : null,
    communicationScore: row.communication_score !== null && row.communication_score !== undefined ? Number(row.communication_score) : null,
    overallScore: row.overall_score !== null && row.overall_score !== undefined ? Number(row.overall_score) : null,
    strengths: parse(row.strengths, []),
    improvements: parse(row.improvements, []),
    studyTopics: parse(row.study_topics, []),
    createdAt: String(row.created_at),
  };
}

export async function saveInterviewQuestions(interviewId: string, questions: InterviewPlanQuestion[]): Promise<string[]> {
  const ids: string[] = [];
  for (const q of questions) {
    const id = newId("iq");
    await execute(
      "INSERT INTO interview_questions (id, interview_id, question, question_type, order_index, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      [id, interviewId, q.question, q.question_type, q.index, new Date().toISOString()]
    );
    ids.push(id);
  }
  return ids;
}

export async function listQuestionsForInterview(interviewId: string): Promise<InterviewQuestionRow[]> {
  const rows = await queryAll("SELECT * FROM interview_questions WHERE interview_id = ? ORDER BY order_index ASC", [interviewId]);
  return rows.map((r) => ({
    id: String(r.id),
    interviewId: String(r.interview_id),
    question: String(r.question),
    questionType: String(r.question_type),
    orderIndex: Number(r.order_index),
    createdAt: String(r.created_at),
  }));
}

export async function saveInterviewAnswer(input: {
  interviewId: string;
  questionId: string;
  candidateId: string;
  answerText: string;
  answerAudioUrl?: string | null;
  score: number;
  feedback: string;
}): Promise<string> {
  const id = newId("ia");
  await execute(
    "INSERT INTO interview_answers (id, interview_id, question_id, candidate_id, answer_text, answer_audio_url, score, feedback, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [
      id,
      input.interviewId,
      input.questionId,
      input.candidateId,
      input.answerText,
      input.answerAudioUrl ?? null,
      input.score,
      input.feedback,
      new Date().toISOString(),
    ]
  );
  return id;
}

export async function saveInterviewResult(input: {
  interviewId: string;
  candidateId: string;
  technicalScore: number | null;
  practicalScore: number | null;
  theoreticalScore: number | null;
  communicationScore: number | null;
  overallScore: number;
  strengths: string[];
  improvements: string[];
  studyTopics: string[];
}): Promise<string> {
  const id = newId("ir");
  await execute(
    `INSERT INTO interview_results (
      id, interview_id, candidate_id, technical_score, practical_score, theoretical_score,
      communication_score, overall_score, strengths, improvements, study_topics, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.interviewId,
      input.candidateId,
      input.technicalScore,
      input.practicalScore,
      input.theoreticalScore,
      input.communicationScore,
      input.overallScore,
      JSON.stringify(input.strengths),
      JSON.stringify(input.improvements),
      JSON.stringify(input.studyTopics),
      new Date().toISOString(),
    ]
  );
  return id;
}

export async function setInterviewStatus(id: string, userId: string, status: string): Promise<boolean> {
  await execute(
    "UPDATE interviews SET status = ?, updated_at = ? WHERE id = ? AND COALESCE(candidate_id, user_id) = ?",
    [status, new Date().toISOString(), id, userId]
  );
  const check = await queryOne("SELECT id FROM interviews WHERE id = ? AND COALESCE(candidate_id, user_id) = ?", [id, userId]);
  return Boolean(check);
}

export async function setInterviewScore(id: string, score: number): Promise<void> {
  await execute("UPDATE interviews SET score = ?, status = 'completed' WHERE id = ?", [score, id]);
}

export async function jobOwnerCompanyId(jobId: string): Promise<string | null> {
  const row = await queryOne("SELECT company_id FROM jobs WHERE id = ?", [jobId]);
  return row?.company_id ? String(row.company_id) : null;
}

export async function getCompanyOwnerUserId(companyId: string): Promise<string | null> {
  const row = await queryOne("SELECT user_id FROM companies WHERE id = ?", [companyId]);
  return row?.user_id ? String(row.user_id) : null;
}

export async function getInterviewInfo(interviewId: string): Promise<{
  companyId: string | null;
  companyOwnerUserId: string | null;
  candidateUserId: string | null;
  jobId: string | null;
  status: string;
} | null> {
  const row = await queryOne(
    `SELECT i.id, i.company_id, i.candidate_id, i.user_id, i.job_id, i.status, c.user_id AS company_owner
     FROM interviews i LEFT JOIN companies c ON c.id = i.company_id WHERE i.id = ?`,
    [interviewId]
  );
  if (!row) return null;
  return {
    companyId: row.company_id ? String(row.company_id) : null,
    companyOwnerUserId: row.company_owner ? String(row.company_owner) : null,
    candidateUserId: row.candidate_id ? String(row.candidate_id) : row.user_id ? String(row.user_id) : null,
    jobId: row.job_id ? String(row.job_id) : null,
    status: String(row.status ?? "scheduled"),
  };
}

export function createAiSession(input: {
  userId: string;
  jobId: string;
  type: InterviewType;
  title: string;
  description?: string | null;
}): Promise<string> {
  const id = newId("int");
  const now = new Date().toISOString();
  return execute(
    `INSERT INTO interviews (
      id, user_id, track, job_id, topic, questions, answers, metrics, status, created_at,
      type, company_id, candidate_id, title, description, scheduled_at, duration_minutes,
      meeting_url, interviewer_name, updated_at
    ) VALUES (?, ?, ?, ?, ?, '[]', '[]', '{}', 'in_progress', ?, ?, NULL, ?, ?, ?, NULL, NULL, NULL, NULL, ?)`,
    [
      id,
      input.userId,
      input.type,
      input.jobId,
      input.title,
      now,
      input.type,
      input.userId,
      input.title,
      input.description ?? null,
      now,
    ]
  ).then(() => id);
}

export async function listInterviewAnswers(interviewId: string): Promise<Array<{
  id: string;
  interviewId: string;
  questionId: string | null;
  candidateId: string;
  answerText: string | null;
  answerAudioUrl: string | null;
  score: number | null;
  feedback: string | null;
  createdAt: string;
}>> {
  const rows = await queryAll(
    "SELECT * FROM interview_answers WHERE interview_id = ? ORDER BY created_at ASC",
    [interviewId]
  );
  return rows.map((r) => ({
    id: String(r.id),
    interviewId: String(r.interview_id),
    questionId: r.question_id ? String(r.question_id) : null,
    candidateId: String(r.candidate_id),
    answerText: r.answer_text ? String(r.answer_text) : null,
    answerAudioUrl: r.answer_audio_url ? String(r.answer_audio_url) : null,
    score: r.score !== null && r.score !== undefined ? Number(r.score) : null,
    feedback: r.feedback ? String(r.feedback) : null,
    createdAt: String(r.created_at),
  }));
}

export async function addLegacyAnswer(interviewId: string, question: string, answer: string, score: number): Promise<void> {
  const row = await queryOne("SELECT questions, answers FROM interviews WHERE id = ?", [interviewId]);
  if (!row) return;
  const parse = (raw: unknown) => {
    try { return JSON.parse(String(raw ?? "[]")) as string[]; } catch { return []; }
  };
  const questions = parse(row.questions);
  const answers = parse(row.answers);
  questions.push(question);
  answers.push(answer);
  await execute("UPDATE interviews SET questions = ?, answers = ?, score = ? WHERE id = ?", [
    JSON.stringify(questions),
    JSON.stringify(answers),
    score,
    interviewId,
  ]);
}

export async function createLegacyReport(input: {
  interviewId: string;
  candidateId: string;
  scores: Record<string, number>;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  feedback: string;
}): Promise<void> {
  const id = newId("irpt");
  await execute(
    "INSERT INTO interview_reports (id, interview_id, user_id, job_id, scores, strengths, weaknesses, recommendations, feedback, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [
      id,
      input.interviewId,
      input.candidateId,
      null,
      JSON.stringify(input.scores),
      JSON.stringify(input.strengths),
      JSON.stringify(input.weaknesses),
      JSON.stringify(input.recommendations),
      input.feedback,
      new Date().toISOString(),
    ]
  );
}

export async function assertIsCompanyOwner(companyId: string, jobId: string): Promise<boolean> {
  const row = await queryOne("SELECT company_id FROM jobs WHERE id = ? AND company_id = ?", [jobId, companyId]);
  return Boolean(row);
}