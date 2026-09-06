import { getUserByEmail, createUser } from "./users";
import { createCompany, createSubscription } from "./company";
import { createJob } from "./jobs";
import { upsertProfile } from "./candidates";
import { addApplication } from "./activity";
import { jobs as catalogJobs } from "./jobs-data";
import { queryAll, execute } from "./conn";
import { newId } from "../crypto";

// Cupons promocionais (idempotente, roda antes do seed principal).
async function seedCoupons(): Promise<void> {
  const existing = await queryAll("SELECT COUNT(*) AS total FROM coupons");
  if (Number(existing[0]?.total ?? 0) > 0) return;
  const now = new Date().toISOString();
  const promo = [
    { code: "LANCAMENTO", percent: 20 },
    { code: "BEMVINDO", percent: 15 },
  ];
  for (const c of promo) {
    await execute(
      "INSERT INTO coupons (id, code, percent, active, max_uses, used_count, created_at) VALUES (?, ?, ?, 1, 0, 0, ?)",
      [newId("cop"), c.code, c.percent, now]
    );
  }
}

async function seedCandidateUser(
  email: string,
  name: string
): Promise<string> {
  const existing = await getUserByEmail(email);
  if (existing) return existing.id;
  const user = await createUser({ email, password: "talento123", role: "candidate", name });
  return user.id;
}

export async function seedDatabase(): Promise<void> {
  await seedCoupons();

  // Idempotente: se já existir o admin, nada é re-executado.
  if (await getUserByEmail("admin@devjobs.com")) return;

  // Admin
  const admin = await createUser({
    email: "admin@devjobs.com",
    password: "admin123",
    role: "admin",
    name: "Administrador DevJobs",
  });

  // Empresa demo (para o dashboard / empresas)
  const companyUser = await createUser({
    email: "empresa@devjobs.com",
    password: "empresa123",
    role: "company",
    name: "StartupX",
  });
  const company = await createCompany({
    userId: companyUser.id,
    name: "StartupX",
    logoColor: "#f59e0b",
    website: "https://startupx.example",
    description: "Uma empresa demo para explorar o dashboard de empresas.",
  });
  await createSubscription({ companyId: company.id, plan: "empresa", durationDays: 365 });
  await createJob({
    companyId: company.id,
    title: "Estágio em Desenvolvimento Full Stack",
    description:
      "Oportunidade de estágio para quem quer crescer rápido. Você vai trabalhar em features reais com mentoria de devs seniores e aprender a base do desenvolvimento web.",
    location: "Rio de Janeiro - RJ",
    remote: true,
    type: "internship",
    salaryMin: 1800,
    salaryMax: 2200,
    currency: "BRL",
    tags: ["JavaScript", "Node.js", "React", "SQL"],
    quantity: 2,
    contactEmail: "vagas@startupx.example",
    applyUrl: "https://startupx.example/vagas",
    plan: "empresa",
    status: "active",
    responsibilities: [
      "Desenvolver features no frontend e backend",
      "Participar de code reviews e rituais do time",
      "Escrever e manter testes",
      "Aprender boas práticas de Git, CI e arquitetura",
    ],
    requirements: [
      "Cursando Ciência da Computação, Sistemas de Informação ou áreas afins",
      "Conhecimentos de JavaScript, HTML e CSS",
      "Interesse em Node.js e React",
      "Disponibilidade de 30h semanais",
    ],
    benefits: [
      "Bolsa auxílio competitiva",
      "Mentoria semanal",
      "Vale-transporte",
      "Possibilidade de efetivação",
    ],
  });
  await createJob({
    companyId: company.id,
    title: "Estágio em QA Automação",
    description:
      "Estágio voltado para quem quer aprender automação de testes de ponta a ponta com mentoria dedicada.",
    location: "Rio de Janeiro - RJ",
    remote: true,
    type: "internship",
    salaryMin: 1600,
    salaryMax: 2000,
    currency: "BRL",
    tags: ["QA", "Cypress", "Testes"],
    quantity: 1,
    contactEmail: "vagas@startupx.example",
    applyUrl: null,
    plan: "empresa",
    status: "active",
    responsibilities: ["Aprender e aplicar automação de testes", "Reportar bugs com o time"],
    requirements: [
      "Cursando áreas de tecnologia",
      "Interesse em qualidade de software",
      "Noções de lógica de programação",
    ],
    benefits: ["Mentoria semanal", "Vale-transporte", "Efetivação possível"],
  });

  // Candidata demo (login demo@devjobs.com)
  const anaId = await seedCandidateUser("demo@devjobs.com", "Ana Souza");
  await upsertProfile({
    userId: anaId,
    fullName: "Ana Souza",
    headline: "Desenvolvedora Frontend (React + TypeScript)",
    summary:
      "3 anos de experiência construindo interfaces com React, Next.js e design systems.",
    experience: "3-5",
    location: "São Paulo - SP",
    availableRemote: true,
    skills: ["React", "TypeScript", "Next.js", "Node.js", "CSS"],
  });
  const estagioJob = await getJobByTitle("Estágio em Desenvolvimento Full Stack");
  if (estagioJob) {
    await addApplication(estagioJob.id, anaId);
  }

  // Banco de talentos: candidatos demo em várias áreas.
  await seedCandidates();

  // Catálogo de vagas original (mantém a página inicial idêntica).
  const owners: Record<string, string> = {};
  for (const job of catalogJobs) {
    if (!owners[job.company]) {
      const c = await createCompany({
        userId: admin.id,
        name: job.company,
        logoColor: job.logoColor,
        website: job.companyUrl ?? null,
      });
      owners[job.company] = c.id;
    }
  }

  // Uma empresa principal do catálogo com plano Pro para demonstrar destaque.
  const novaCompanyId = owners["NovaTech"];
  if (novaCompanyId) {
    await createSubscription({ companyId: novaCompanyId, plan: "pro", durationDays: 30 });
  }

  for (const job of catalogJobs) {
    const companyId = owners[job.company]!;
    await createJob({
      companyId,
      title: job.title,
      description: job.description,
      location: job.location,
      remote: job.remote,
      type: job.type,
      salaryMin: job.salary?.min ?? null,
      salaryMax: job.salary?.max ?? null,
      currency: job.salary?.currency ?? "BRL",
      tags: job.tags,
      quantity: 1,
      contactEmail: `vagas@${job.company.toLowerCase().replace(/[^a-z0-9]/g, "")}.example`,
      applyUrl: job.companyUrl ?? null,
      plan: "free",
      status: "active",
      featured: job.featured,
      sponsored: job.id === "mobile-react-native" || job.id === "frontend-pleno",
      responsibilities: job.responsibilities,
      requirements: job.requirements,
      benefits: job.benefits,
    });
  }
}

async function getJobByTitle(title: string) {
  const { queryOne } = await import("./conn");
  const row = await queryOne("SELECT * FROM jobs WHERE title = ?", [title]);
  return row ? { id: String(row.id) } : undefined;
}

async function seedCandidates(): Promise<void> {
  const talentSeeds: Array<{
    name: string;
    headline: string;
    experience: string;
    location: string;
    remote: boolean;
    skills: string[];
    summary: string;
  }> = [
    {
      name: "Bruno Cardoso",
      headline: "Desenvolvedor Backend Node.js Pleno",
      experience: "3-5",
      location: "Belo Horizonte - MG",
      remote: true,
      skills: ["Node.js", "TypeScript", "PostgreSQL", "AWS"],
      summary: "Construo APIs REST escaláveis e pipelines com foco em performance.",
    },
    {
      name: "Camila Reis",
      headline: "Engenheira de Dados (Python, Spark)",
      experience: "5+",
      location: "São Paulo - SP",
      remote: true,
      skills: ["Python", "Spark", "Airflow", "Snowflake"],
      summary: "Experiência em pipelines de dados e data warehouses para analytics.",
    },
    {
      name: "Diego Maia",
      headline: "Desenvolvedor Java Full Stack Sênior",
      experience: "5+",
      location: "Curitiba - PR",
      remote: false,
      skills: ["Java", "Spring Boot", "Kafka", "React"],
      summary: "Mais de 8 anos entre backend Java e frontend React em bancos e fintechs.",
    },
    {
      name: "Elisa Mota",
      headline: "Engenheira DevOps / SRE",
      experience: "3-5",
      location: "Porto Alegre - RS",
      remote: true,
      skills: ["Kubernetes", "Docker", "Terraform", "Prometheus"],
      summary: "Automatizo infraestrutura e garanto disponibilidade com IaC e observabilidade.",
    },
    {
      name: "Felipe Nunes",
      headline: "QA Automation Engineer",
      experience: "3-5",
      location: "Recife - PE",
      remote: true,
      skills: ["Cypress", "Playwright", "CI/CD", "JavaScript"],
      summary: "Construo suítes de testes e2e integradas ao pipeline de deploy.",
    },
    {
      name: "Gabriela Lima",
      headline: "UX/UI Designer",
      experience: "3-5",
      location: "Florianópolis - SC",
      remote: true,
      skills: ["Figma", "UX Research", "Design System", "Prototipação"],
      summary: "Design de produto de ponta a ponta com forte base em acessibilidade.",
    },
    {
      name: "Henrique Alves",
      headline: "Mobile Developer Flutter",
      experience: "1-3",
      location: "Fortaleza - CE",
      remote: true,
      skills: ["Flutter", "Dart", "Firebase", "GetX"],
      summary: "Apps mobile nativos e multiplataforma com foco em experiência fluida.",
    },
  ];

  for (const t of talentSeeds) {
    const userId = await seedCandidateUser(
      slugEmail(t.name),
      t.name
    );
    await upsertProfile({
      userId,
      fullName: t.name,
      headline: t.headline,
      summary: t.summary,
      experience: t.experience,
      location: t.location,
      availableRemote: t.remote,
      skills: t.skills,
    });
  }
}

function slugEmail(name: string): string {
  return `${name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(" ")[0]}@devjobs.com`;
}