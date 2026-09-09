export type UserRole = "candidate" | "company" | "admin";

export type Plan = "free" | "destaque" | "pro" | "empresa";

// Planos do candidato (DevJobs Premium). "free" é o tier padrão;
// o campo DB é users.candidate_tier.
export type CandidateTier = "free" | "premium" | "pro";

// Etapas do pipeline/kanban de candidaturas.
export const APPLICATION_STAGES = [
  "applied", // Candidatura enviada
  "test", // Teste técnico
  "interview", // Entrevista
  "offer", // Oferta
  "hired", // Contratado
  "rejected", // Recusada
] as const;

export type ApplicationStage = (typeof APPLICATION_STAGES)[number];

export type InterviewTrack =
  | "frontend"
  | "backend"
  | "fullstack"
  | "mobile"
  | "devops"
  | "data"
  | "cybersecurity"
  | "game";

export type JobStatus =
  | "pending"
  | "active"
  | "paused"
  | "rejected"
  | "expired";

export type JobType = "full-time" | "part-time" | "contract" | "internship";

export type User = {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  createdAt: string;
};

export type Company = {
  id: string;
  userId: string;
  name: string;
  logoColor: string;
  logoUrl: string | null;
  website: string | null;
  description: string | null;
  createdAt: string;
};

export type Subscription = {
  id: string;
  companyId: string;
  plan: Plan;
  status: "active" | "cancelled" | "expired";
  startedAt: string;
  expiresAt: string;
  createdAt: string;
};

export type DbJob = {
  id: string;
  companyId: string;
  title: string;
  description: string;
  location: string;
  remote: boolean;
  type: JobType;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string | null;
  tags: string[];
  quantity: number;
  contactEmail: string;
  applyUrl: string | null;
  status: JobStatus;
  featured: boolean;
  sponsored: boolean;
  plan: Plan;
  responsibilities: string[];
  requirements: string[];
  benefits: string[];
  views: number;
  clicks: number;
  expiresAt: string | null;
  createdAt: string;
};

export type Job = {
  id: string;
  companyId: string;
  company: string;
  logoColor: string;
  companyUrl: string | null;
  title: string;
  description: string;
  location: string;
  remote: boolean;
  type: JobType;
  salary: { min: number; max: number; currency: string } | null;
  tags: string[];
  quantity: number;
  contactEmail: string;
  applyUrl: string | null;
  status: JobStatus;
  featured: boolean;
  sponsored: boolean;
  plan: Plan;
  responsibilities: string[];
  requirements: string[];
  benefits: string[];
  views: number;
  clicks: number;
  expiresAt: string | null;
  createdAt: string;
  postedAt: string;
};

export type Application = {
  id: string;
  jobId: string;
  candidateId: string;
  status: "applied" | "viewed" | "rejected" | "accepted";
  stage: ApplicationStage;
  notes: string | null;
  appliedAt: string;
  job?: Job;
};

export type Payment = {
  id: string;
  companyId: string;
  plan: Plan;
  amount: number;
  currency: string;
  status: "pending" | "paid" | "failed" | "refunded";
  stripePaymentId: string | null;
  couponCode: string | null;
  createdAt: string;
};

export type CandidateProfile = {
  id: string;
  userId: string;
  fullName: string;
  headline: string;
  summary: string | null;
  photoUrl: string | null;
  githubUrl: string | null;
  linkedinUrl: string | null;
  resumeUrl: string | null;
  experience: string; // 0-1 | 1-3 | 3-5 | 5+ anos
  location: string | null;
  availableRemote: boolean;
  skills: string[];
  createdAt: string;
  updatedAt: string;
};

export type PlanInfo = {
  id: Plan;
  name: string;
  price: number;
  period: string;
  tagline: string;
  features: string[];
  popular?: boolean;
};

export const PLANS: PlanInfo[] = [
  {
    id: "free",
    name: "Grátis",
    price: 0,
    period: "por vaga · 15 dias",
    tagline: "Para dar o primeiro passo",
    features: [
      "1 vaga",
      "Duração de 15 dias",
      "Sem destaque",
      "Publicação após aprovação",
    ],
  },
  {
    id: "destaque",
    name: "Destaque",
    price: 49,
    period: "por vaga · 30 dias",
    tagline: "Apareça antes das gratuitas",
    features: [
      "1 vaga",
      "Duração de 30 dias",
      'Badge "Destaque"',
      "Aparece antes das vagas gratuitas",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 149,
    period: "5 vagas · 30 dias",
    tagline: "Para times que contratam muito",
    popular: true,
    features: [
      "5 vagas",
      "Duração de 30 dias",
      "Vagas em destaque",
      "Logo maior",
      "Estatísticas das vagas",
      "Banco de talentos",
    ],
  },
  {
    id: "empresa",
    name: "Empresa",
    price: 299,
    period: "por mês",
    tagline: "Recrutamento completo",
    features: [
      "Vagas ilimitadas",
      "Vagas prioritárias",
      "Acesso ao banco de talentos",
      "Dashboard completo",
      "Estatísticas avançadas",
      "Perfil da empresa",
    ],
  },
];

export function plansWithPermission(plan: Plan | null): {
  canAccessTalents: boolean;
} {
  const canAccessTalents = plan === "pro" || plan === "empresa";
  return { canAccessTalents };
}

export const PLAN_COLORS: Record<Plan, string> = {
  free: "#64748b",
  destaque: "#f59e0b",
  pro: "#6d28d9",
  empresa: "#0ea5e9",
};

/* ---------- DevJobs Premium: tipos do candidato ---------- */

export type ResumeData = {
  fullName: string;
  headline: string;
  email: string;
  phone: string;
  summary: string;
  skills: string[];
  experienceItems: Array<{
    role: string;
    company: string;
    period: string;
    description: string;
    skills: string[];
  }>;
  education: Array<{
    degree: string;
    school: string;
    period: string;
  }>;
  projects: Array<{
    name: string;
    description: string;
    tags: string[];
    url: string;
  }>;
  languages: Array<{ name: string; level: string }>;
};

export type Resume = {
  id: string;
  userId: string;
  title: string;
  data: ResumeData;
  createdAt: string;
  updatedAt: string;
};

export type Alert = {
  id: string;
  userId: string;
  name: string;
  query: string;
  location: string | null;
  remote: boolean;
  type: JobType | null;
  salaryMin: number | null;
  tags: string[];
  frequency: "daily" | "weekly" | "monthly";
  active: boolean;
  createdAt: string;
  lastRunAt: string | null;
};

export type AppNotification = {
  id: string;
  userId: string;
  type: "info" | "success" | "warning" | "new_job" | "application" | "offer";
  title: string;
  body: string | null;
  jobId: string | null;
  read: boolean;
  createdAt: string;
};

export type Interview = {
  id: string;
  userId: string;
  track: InterviewTrack;
  topic: string;
  questions: string[];
  answers: string[];
  score: number | null;
  metrics: {
    technical: number;
    communication: number;
    clarity: number;
    experience: number;
    problemSolving: number;
  };
  status: "completed";
  createdAt: string;
};

export type AiAnalysis = {
  score: number;
  scoreLabel: string;
  techMatches: Array<{ name: string; present: boolean; level: number }>;
  requirementsMet: string[];
  requirementsMissing: string[];
  strengths: string[];
  weakPoints: string[];
  suggestions: string[];
  summary: string;
};

export type SalaryAnalysis = {
  jobTitle: string;
  level: string;
  modality: string;
  reported: { min: number; max: number } | null;
  averageEstimate: { min: number; max: number };
  vendorP25: number;
  median: number;
  p75: number;
  sampleCount: number;
  comparison: "below" | "within" | "above";
  insights: string[];
};

export type CandidatePlanInfo = {
  id: CandidateTier;
  name: string;
  price: number;
  annualPrice?: number; // preço anual (faturamento único), default = price * 10 (2 meses grátis)
  period: string;
  tagline: string;
  features: string[];
  aiAnalysesPerMonth: number | null; // null = ilimitado
  popular?: boolean;
};

export const CANDIDATE_PLANS: CandidatePlanInfo[] = [
  {
    id: "free",
    name: "Grátis",
    price: 0,
    period: "para sempre",
    tagline: "Comece sua busca",
    features: [
      "Perfil e currículo",
      "Candidaturas e favoritos",
      "2 análises de IA por mês",
      "Alertas (semanal)",
    ],
    aiAnalysesPerMonth: 2,
  },
  {
    id: "premium",
    name: "Premium",
    price: 19,
    annualPrice: 190,
    period: "por mês",
    tagline: "Para acelerar suas chances",
    popular: true,
    features: [
      "Tudo do Grátis",
      "20 análises de IA por mês",
      "Kanban de candidaturas",
      "Entrevistas simuladas",
      "Análise salarial",
      "Badge Premium",
    ],
    aiAnalysesPerMonth: 20,
  },
  {
    id: "pro",
    name: "Pro",
    price: 39,
    annualPrice: 390,
    period: "por mês",
    tagline: "Para quem busca a vaga ideal",
    features: [
      "Tudo do Premium",
      "Análises de IA ilimitadas",
      "Currículos ilimitados",
      "Adaptar currículo por vaga",
      "Suporte prioritário",
    ],
    aiAnalysesPerMonth: null,
  },
];

export const CANDIDATE_TIER_NAMES: Record<CandidateTier, string> = {
  free: "Grátis",
  premium: "Premium",
  pro: "Pro",
};

export const APPLICATION_STAGE_LABELS: Record<string, string> = {
  applied: "Candidatura enviada",
  test: "Teste técnico",
  interview: "Entrevista",
  offer: "Oferta",
  hired: "Contratado",
  rejected: "Recusada",
};

export const INTERVIEW_TRACK_LABELS: Record<InterviewTrack, string> = {
  frontend: "Frontend",
  backend: "Backend",
  fullstack: "Full-stack",
  mobile: "Mobile",
  devops: "DevOps",
  data: "Dados",
  cybersecurity: "Cybersegurança",
  game: "Game dev",
};