import { NextRequest, NextResponse } from "next/server";
import { readSessionUserFromRequest } from "@/lib/auth";
import { ensureDatabaseReady } from "@/lib/db/init";
import { listInterviews, getInterview, createInterview } from "@/lib/db/premium";
import type { InterviewTrack } from "@/lib/types";

export const dynamic = "force-dynamic";

const TRACKS: InterviewTrack[] = [
  "frontend", "backend", "fullstack", "mobile", "devops", "data", "cybersecurity", "game",
];

export async function GET(request: NextRequest) {
  const session = readSessionUserFromRequest(request);
  if (!session || session.role !== "candidate") {
    return NextResponse.json({ error: "Acesso restrito." }, { status: 401 });
  }
  await ensureDatabaseReady();
  const items = await listInterviews(session.id);
  return NextResponse.json({ data: { items } });
}

export async function POST(request: NextRequest) {
  const session = readSessionUserFromRequest(request);
  if (!session || session.role !== "candidate") {
    return NextResponse.json({ error: "Acesso restrito." }, { status: 401 });
  }
  await ensureDatabaseReady();
  const body = (await request.json().catch(() => ({}))) as {
    track?: string;
    jobId?: string;
    topic?: string;
    questions?: string[];
    answers?: string[];
    score?: number;
    metrics?: Partial<Record<"technical" | "communication" | "clarity" | "experience" | "problemSolving", number>>;
  };
  if (!body.track || !TRACKS.includes(body.track as InterviewTrack)) {
    return NextResponse.json({ error: "Trilha inválida." }, { status: 400 });
  }
  const questions = Array.isArray(body.questions) && body.questions.length > 0
    ? body.questions.map(String).slice(0, 20)
    : [];
  const answers = Array.isArray(body.answers) ? body.answers.map(String).slice(0, 20) : [];
  if (questions.length === 0) {
    return NextResponse.json({ error: "As perguntas da entrevista são obrigatórias." }, { status: 400 });
  }
  const score = typeof body.score === "number" ? Math.max(0, Math.min(100, body.score)) : null;
  const created = await createInterview(session.id, {
    track: body.track as InterviewTrack,
    jobId: body.jobId,
    topic: (body.topic ?? "").trim().slice(0, 160),
    questions,
    answers,
    score: score ?? Math.round(questions.length ? (answers.filter((a) => a.trim().length > 20).length / answers.length) * 100 : 50),
    metrics: {
      technical: Math.max(0, Math.min(100, body.metrics?.technical ?? 0)),
      communication: Math.max(0, Math.min(100, body.metrics?.communication ?? 0)),
      clarity: Math.max(0, Math.min(100, body.metrics?.clarity ?? 0)),
      experience: Math.max(0, Math.min(100, body.metrics?.experience ?? 0)),
      problemSolving: Math.max(0, Math.min(100, body.metrics?.problemSolving ?? 0)),
    },
  });
  return NextResponse.json({ data: { item: created } }, { status: 201 });
}