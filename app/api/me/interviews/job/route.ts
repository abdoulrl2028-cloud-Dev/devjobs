import { NextRequest, NextResponse } from "next/server";
import { readSessionUserFromRequest } from "@/lib/auth";
import { ensureDatabaseReady } from "@/lib/db/init";
import { getJobById } from "@/lib/db/jobs";
import {
  createInterview,
  createInterviewReport,
  findInterviewByJob,
  getResume,
  updateInterviewCompletion,
} from "@/lib/db/premium";
import { detectTrackFromJob, generateJobQuestions } from "@/lib/jobQuestions";
import { gradeJobInterview } from "@/lib/interview";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_ANSWER_LENGTH = 4000;

export async function GET(request: NextRequest) {
  const session = readSessionUserFromRequest(request);
  if (!session || session.role !== "candidate") {
    return NextResponse.json({ error: "Acesso restrito." }, { status: 401 });
  }
  await ensureDatabaseReady();
  const jobId = request.nextUrl.searchParams.get("jobId");
  if (!jobId) {
    return NextResponse.json({ error: "jobId é obrigatório." }, { status: 400 });
  }
  const interview = jobId ? await findInterviewByJob(session.id, jobId) : undefined;
  if (!interview) return NextResponse.json({ data: null });
  return NextResponse.json({ data: { interview } });
}

export async function POST(request: NextRequest) {
  const session = readSessionUserFromRequest(request);
  if (!session || session.role !== "candidate") {
    return NextResponse.json({ error: "Acesso restrito." }, { status: 401 });
  }
  await ensureDatabaseReady();

  const body = (await request.json().catch(() => ({}))) as {
    action?: string;
    jobId?: string;
    resumeId?: string;
    questions?: string[];
    answers?: string[];
  };
  const { action } = body;
  if (action === "start") {
    if (!body.jobId) return NextResponse.json({ error: "jobId é obrigatório." }, { status: 400 });
    const job = await getJobById(body.jobId);
    if (!job || job.status !== "active") {
      return NextResponse.json({ error: "Vaga não encontrada." }, { status: 404 });
    }

    const resume = body.resumeId ? await getResume(body.resumeId, session.id) : undefined;
    const { questions, track } = generateJobQuestions(job, resume?.data);

    const interview = await createInterview(session.id, {
      track,
      jobId: job.id,
      topic: `Entrevista por vaga: ${job.title}`,
      questions,
      answers: [],
      score: 0,
      metrics: { technical: 0, communication: 0, clarity: 0, experience: 0, problemSolving: 0 },
      status: "in_progress",
    });

    return NextResponse.json({
      data: {
        interview,
        questions,
        track,
        timePerQuestion: "120",
        note: "Responda por escrito. Cada pergunta tem até 2 minutos.",
      },
    }, { status: 201 });
  }

  if (action === "finish") {
    if (!body.jobId) return NextResponse.json({ error: "jobId é obrigatório." }, { status: 400 });
    const job = await getJobById(body.jobId);
    if (!job) return NextResponse.json({ error: "Vaga não encontrada." }, { status: 404 });

    const questions = Array.isArray(body.questions) ? body.questions.map(String).slice(0, 6) : [];
    const answers = Array.isArray(body.answers) ? body.answers.map((a) => String(a).slice(0, MAX_ANSWER_LENGTH)) : [];
    if (questions.length === 0) {
      return NextResponse.json({ error: "Perguntas ausentes." }, { status: 400 });
    }
    if (answers.length !== questions.length || answers.some((a) => !a.trim())) {
      return NextResponse.json({ error: "Responda todas as perguntas antes de finalizar." }, { status: 400 });
    }

    const track = detectTrackFromJob(job);
    const report = gradeJobInterview(track, questions, answers);

    // Reusa entrevista em andamento (se houver) ou cria uma concluída.
    let existing = await findInterviewByJob(session.id, body.jobId);
    let interviewId = existing?.id;
    if (existing && existing.status !== "completed") {
      await updateInterviewCompletion(existing.id, session.id, { answers, score: report.score, metrics: report.metrics });
    } else {
      const created = await createInterview(session.id, {
        track,
        jobId: body.jobId,
        topic: `Entrevista por vaga: ${job.title}`,
        questions,
        answers,
        score: report.score,
        metrics: report.metrics,
      });
      existing = created;
      interviewId = created.id;
    }

    if (interviewId) {
      await createInterviewReport({
        interviewId,
        userId: session.id,
        jobId: job.id,
        scores: report.metrics,
        strengths: report.strengths,
        weaknesses: report.weaknesses,
        recommendations: report.recommendations,
        feedback: report.feedback,
      });
    }

    void emitCompleted(session.id, body.jobId, report.score);

    return NextResponse.json({
      data: {
        report,
        interviewId,
        track,
        message: "Entrevista concluída. Relatório gerado e salvo.",
      },
    });
  }

  return NextResponse.json({ error: "Ação inválida. Use start ou finish." }, { status: 400 });
}

async function emitCompleted(userId: string, jobId: string, score: number): Promise<void> {
  try {
    const { insertRealtimeEvent } = await import("@/lib/db/events");
    await insertRealtimeEvent(userId, "interview.completed", {
      count: 1,
      ids: [jobId],
      at: new Date().toISOString(),
      score,
    });
  } catch {
    // best-effort
  }
}