export type UserRole = "candidate" | "company" | "admin";

export type Plan = "free" | "destaque" | "pro" | "empresa";

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
  appliedAt: string;
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