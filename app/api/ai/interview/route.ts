import { NextRequest, NextResponse } from "next/server";
import { readSessionUserFromRequest } from "@/lib/auth";
import { ensureDatabaseReady } from "@/lib/db/init";
import { getJobById } from "@/lib/db/jobs";
import { getResume } from "@/lib/db/premium";
import { createNotification } from "@/lib/db/premium";
import { insertRealtimeEvent } from "@/lib/db/events";
import { generateInterviewPlan, INTERVIEW_COUNT_OPTIONS } from "@/lib/interviewPlans";
import {
  analyzeInterviewAnswer,
  buildInterviewResult,
  nextQuestionSuggestion,
} from "@/lib/aiInterview";
import {
  createAiSession,
  saveInterviewQuestions,
  listQuestionsForInterview,
  saveInterviewAnswer,
  saveInterviewResult,
  setInterviewScore,
  createLegacyReport,
  addLegacyAnswer,
  getCandidateInterview,
} from "@/lib/db/interviews";
import type { InterviewPlanQuestion } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_ANSWER_LENGTH = 4000;
const VALID_TYPES = ["technical", "practical", "theoretical", "ai"] as const;

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
    type?: string;
    count?: number;
    interviewId?: string;
    questionId?: string;
    answer?: string;
  };

  if (body.action === "start") {
    let jobId: string | undefined;
    let type = (VALID_TYPES.includes(body.type as (typeof VALID_TYPES)[number])
      ? body.type
      : "ai") as (typeof VALID_TYPES)[number];
    const count = Number(body.count);
    const questionCount = INTERVIEW_COUNT_OPTIONS.includes(count) ? count : 10;
    let interviewId: string | undefined;
    let title = "Entrevista com IA";
    let resume: { data?: import("@/lib/types").ResumeData } | undefined;

    if (body.interviewId) {
      const detail = await getCandidateInterview(session.id, body.interviewId);
      if (!detail.item) {
        return NextResponse.json({ error: "Entrevista não encontrada." }, { status: 404 });
      }
      if (detail.item.status === "completed" || detail.item.status === "cancelled") {
        return NextResponse.json({ error: "Esta entrevista não pode mais ser iniciada." }, { status: 400 });
      }
      if (detail.item.type === "company_online") {
        return NextResponse.json({ error: "Esta entrevista é online com a empresa. Use o link do convite." }, { status: 400 });
      }
      if (detail.questions.length > 0) {
        return NextResponse.json({
          data: {
            interviewId: detail.item.id,
            title: detail.item.title ?? "Entrevista com IA",
            type: detail.item.type,
            count: detail.questions.length,
            timePerQuestion: "120",
            next: detail.questions[0],
            note: "Responda por escrito. Cada pergunta tem até 2 minutos.",
          },
        });
      }
      jobId = detail.item.jobId ?? undefined;
      type = (VALID_TYPES.includes(detail.item.type) ? detail.item.type : "ai") as (typeof VALID_TYPES)[number];
      interviewId = detail.item.id;
      title = detail.item.title ?? "Entrevista com IA";
    } else {
      if (!body.jobId) {
        return NextResponse.json({ error: "jobId é obrigatório." }, { status: 400 });
      }
      jobId = body.jobId;
      resume = body.resumeId ? await getResume(body.resumeId, session.id) : undefined;
    }

    const job = await getJobById(jobId ?? "");
    if (!job || job.status !== "active") {
      return NextResponse.json({ error: "Vaga não encontrada." }, { status: 404 });
    }

    const questions = generateInterviewPlan({ job, resume: resume?.data, type, count: questionCount });
    if (questions.length === 0) {
      return NextResponse.json({ error: "Não foi possível gerar perguntas para esta vaga." }, { status: 422 });
    }

    if (!interviewId) {
      interviewId = await createAiSession({
        userId: session.id,
        jobId: job.id,
        type,
        title: `Entrevista ${type === "ai" ? "com IA" : type} para ${job.title}`,
        description: job.description,
      });
    }
    await saveInterviewQuestions(interviewId, questions);

    await insertRealtimeEvent(session.id, "interview.started", { interviewId, jobId: job.id });

    return NextResponse.json(
      {
        data: {
          interviewId,
          title,
          type,
          count: questions.length,
          timePerQuestion: "120",
          next: questions[0],
          note: "Responda por escrito. Cada pergunta tem até 2 minutos. Suas respostas são analisadas por IA.",
        },
      },
      { status: 201 }
    );
  }

  if (body.action === "answer") {
    const { interviewId, questionId, answer } = body;
    if (!interviewId || !questionId) {
      return NextResponse.json({ error: "interviewId e questionId são obrigatórios." }, { status: 400 });
    }
    if (typeof answer !== "string" || answer.trim().length === 0) {
      return NextResponse.json({ error: "Escreva uma resposta antes de avançar." }, { status: 400 });
    }
    const text = answer.trim().slice(0, MAX_ANSWER_LENGTH);
    const questions = await listQuestionsForInterview(interviewId);
    const q = questions.find((item) => item.id === questionId);
    if (!q) {
      return NextResponse.json({ error: "Pergunta não encontrada nesta entrevista." }, { status: 404 });
    }

    const adapted: InterviewPlanQuestion = {
      index: q.orderIndex,
      question: q.question,
      question_type: q.questionType,
      expected_topics: topTopics(q.questionType),
    };
    const analysis = analyzeInterviewAnswer({ question: adapted, answer: text });

    await saveInterviewAnswer({
      interviewId,
      questionId: q.id,
      candidateId: session.id,
      answerText: text,
      score: analysis.score,
      feedback: analysis.feedback,
    });
    await addLegacyAnswer(interviewId, q.question, text, analysis.score);

    await insertRealtimeEvent(session.id, "interview.answered", {
      interviewId,
      questionId: q.id,
      score: analysis.score,
    });

    return NextResponse.json({
      data: {
        feedback: analysis.feedback,
        strengths: analysis.strengths,
        missing_topics: analysis.missingTopics,
        next_question: nextQuestionSuggestion(analysis.missingTopics),
        score: analysis.score,
      },
    });
  }

  if (body.action === "finish") {
    const { interviewId } = body;
    if (!interviewId) {
      return NextResponse.json({ error: "interviewId é obrigatório." }, { status: 400 });
    }
    const questions = await listQuestionsForInterview(interviewId);
    const answers = await listAnswersForInterview(interviewId);
    if (answers.length === 0) {
      return NextResponse.json({ error: "Nenhuma resposta registrada para finalizar a entrevista." }, { status: 400 });
    }

    const qas = answers.map((a) => {
      const q = questions.find((item) => item.id === a.questionId);
      return { questionType: q?.questionType ?? "technical", score: a.score ?? 0 };
    });
    const result = buildInterviewResult({ qas });
    const resultId = await saveInterviewResult({
      interviewId,
      candidateId: session.id,
      technicalScore: result.technicalScore,
      practicalScore: result.practicalScore,
      theoreticalScore: result.theoreticalScore,
      communicationScore: result.communicationScore,
      overallScore: result.overallScore ?? 0,
      strengths: result.strengths,
      improvements: result.improvements,
      studyTopics: result.studyTopics,
    });
    await setInterviewScore(interviewId, result.overallScore ?? 0);
    await createLegacyReport({
      interviewId,
      candidateId: session.id,
      scores: {
        technical: result.technicalScore ?? 0,
        practical: result.practicalScore ?? 0,
        theoretical: result.theoreticalScore ?? 0,
        communication: result.communicationScore ?? 0,
        overall: result.overallScore ?? 0,
      },
      strengths: result.strengths,
      weaknesses: result.improvements,
      recommendations: result.studyTopics,
      feedback: `Entrevista com IA concluída. Nota geral: ${result.overallScore}/100.`,
    });
    await createNotification(session.id, {
      type: "success",
      title: "Entrevista concluída",
      body: `Seu relatório está pronto com nota ${result.overallScore}/100.`,
    });
    await insertRealtimeEvent(session.id, "interview.completed", {
      interviewId,
      score: result.overallScore,
      resultId,
    });

    return NextResponse.json({
      data: {
        resultId,
        ...result,
        finished_at: new Date().toISOString(),
      },
    });
  }

  return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
}

async function listAnswersForInterview(interviewId: string) {
  const { listInterviewAnswers } = await import("@/lib/db/interviews");
  return listInterviewAnswers(interviewId);
}

export function topTopics(questionType: string): string[] {
  switch (questionType) {
    case "theoretical":
      return ["conceitos", "arquitetura", "trade-offs", "boas práticas", "fundamentos"];
    case "practical":
      return ["implementação", "código", "algoritmo", "testes", "ferramentas"];
    case "behavioral":
      return ["experiência", "exemplo", "resultado", "aprendizado", "trabalho em equipe"];
    default:
      return ["sintaxe", "conceitos", "práticas", "ferramentas", "exemplo"];
  }
}