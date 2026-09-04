export type JobType = "full-time" | "part-time" | "contract" | "internship";

export type Job = {
  id: string;
  title: string;
  company: string;
  companyUrl?: string;
  location: string;
  remote: boolean;
  type: JobType;
  salary: { min: number; max: number; currency: string } | null;
  tags: string[];
  postedAt: string;
  featured: boolean;
  logoColor: string;
  description: string;
  responsibilities: string[];
  requirements: string[];
  benefits: string[];
};

export const jobs: Job[] = [
  {
    id: "frontend-pleno",
    title: "Frontend Developer (React)",
    company: "NovaTech",
    companyUrl: "https://novatech.dev",
    location: "Remoto",
    remote: true,
    type: "full-time",
    salary: { min: 9000, max: 13000, currency: "BRL" },
    tags: ["React", "TypeScript", "Next.js", "CSS"],
    postedAt: "2026-08-28",
    featured: true,
    logoColor: "#6366f1",
    description:
      "Você será responsável por desenvolver interfaces modernas e performáticas para nossos produtos SaaS. Trabalhamos com React + TypeScript e entregamos com qualidade e testes.",
    responsibilities: [
      "Desenvolver novas funcionalidades com React, TypeScript e Next.js",
      "Manter e evoluir o design system da plataforma",
      "Colaborar com o time de design para prototipar e validar fluxos",
      "Escrever testes unitários e de integração",
      "Participar de code reviews e mentoria de devs júnior",
    ],
    requirements: [
      "3+ anos de experiência com React e TypeScript",
      "Sólidos conhecimentos de HTML, CSS e responsividade",
      "Experiência com Next.js ou SPAs modernas",
      "Conhecimento de Git e ferramentas de CI",
    ],
    benefits: [
      "Plano de saúde e odontológico",
      "Home-office com auxílio de R$ 300/mês",
      "Horário flexível",
      "Gympass",
    ],
  },
  {
    id: "backend-senior",
    title: "Backend Engineer (Node.js)",
    company: "DataFlow",
    companyUrl: "https://dataflow.io",
    location: "São Paulo - SP",
    remote: true,
    type: "full-time",
    salary: { min: 14000, max: 18000, currency: "BRL" },
    tags: ["Node.js", "TypeScript", "AWS", "PostgreSQL"],
    postedAt: "2026-08-30",
    featured: true,
    logoColor: "#0891b2",
    description:
      "Buscamos um engenheiro de backend para escalar nossa plataforma de processamento de dados. Você vai desenhar APIs REST robustas e serviços de alta disponibilidade.",
    responsibilities: [
      "Projetar e construir APIs REST escaláveis em Node.js e TypeScript",
      "Modelar bancos de dados relacionais (PostgreSQL)",
      "Implementar filas e processamento assíncrono",
      "Monitorar e otimizar performance dos serviços",
    ],
    requirements: [
      "5+ anos de experiência em backend",
      "Domínio de Node.js, TypeScript e PostgreSQL",
      "Experiência com AWS (EC2, S3, Lambda, SQS)",
      "Conhecimento de princípios de segurança e boas práticas",
    ],
    benefits: [
      "Stock options",
      "Plano de saúde premium",
      "Auxílio educação de R$ 500/mês",
      "13º e bônus anual",
    ],
  },
  {
    id: "ux-ui-designer",
    title: "UX/UI Designer",
    company: "PixelLab",
    location: "Remoto",
    remote: true,
    type: "contract",
    salary: { min: 6500, max: 8500, currency: "BRL" },
    tags: ["Figma", "UX", "Design System", "Prototipação"],
    postedAt: "2026-09-01",
    featured: false,
    logoColor: "#db2777",
    description:
      "Você vai cuidar da experiência de ponta a ponta dos nossos produtos, criando interfaces bonitas, acessíveis e consistentes com o Figma e design tokens.",
    responsibilities: [
      "Criar wireframes, protótipos e fluxos de alta fidelidade",
      "Construir e manter o design system em Figma",
      "Conduzir testes de usabilidade com usuários",
      "Trabalhar em parceria com o time de produto",
    ],
    requirements: [
      "Experiência comprovada com design de produto",
      "Portfólio com casos reais",
      "Domínio do Figma e design tokens",
      "Conhecimento de acessibilidade (WCAG)",
    ],
    benefits: [
      "Projeto 100% remoto",
      "Contrato flexível B2B",
      "Feedback quinzenal com a liderança",
    ],
  },
  {
    id: "mobile-react-native",
    title: "Mobile Developer (React Native)",
    company: "AppWise",
    location: "Remoto",
    remote: true,
    type: "full-time",
    salary: { min: 11000, max: 15000, currency: "BRL" },
    tags: ["React Native", "TypeScript", "iOS", "Android"],
    postedAt: "2026-09-02",
    featured: false,
    logoColor: "#7c3aed",
    description:
      "Desenvolva apps mobile de alta qualidade com React Native para milhares de usuários. Atuamos com CI/CD automatizado e publicamos em ambas as lojas.",
    responsibilities: [
      "Desenvolver features em React Native e TypeScript",
      "Integrar com APIs REST e notificações push",
      "Publicar e acompanhar releases nas lojas",
      "Otimizar performance dos aplicativos",
    ],
    requirements: [
      "3+ anos com desenvolvimento mobile",
      "Experiência com React Native e TypeScript",
      "Conhecimento do ciclo de publicação (App Store/Play)",
      "Familiaridade com testes automatizados",
    ],
    benefits: [
      "Plano de saúde",
      "Home-office híbrido",
      "30 dias de férias",
      "Equipamento de qualidade",
    ],
  },
  {
    id: "devops-sre",
    title: "DevOps / SRE",
    company: "CloudNine",
    location: "São Paulo - SP",
    remote: false,
    type: "full-time",
    salary: { min: 13000, max: 17000, currency: "BRL" },
    tags: ["Kubernetes", "Docker", "Terraform", "Prometheus"],
    postedAt: "2026-08-25",
    featured: false,
    logoColor: "#ea580c",
    description:
      "Será o guardião da nossa infraestrutura. Você vai automatizar o deploy, garantir disponibilidade e escalar os serviços com IaC e Kubernetes.",
    responsibilities: [
      "Gerenciar clusters Kubernetes em produção",
      "Automatizar infraestrutura com Terraform",
      "Implementar monitoramento e alertas com Prometheus/Grafana",
      "Responder a incidentes e fazer post-mortem",
    ],
    requirements: [
      "Experiência sólida com Kubernetes e Docker",
      "Conhecimento de Terraform ou Pulumi",
      "Familiaridade com CI/CD (GitHub Actions/GitLab CI)",
      "Conhecimento de redes e Linux",
    ],
    benefits: [
      "Plano de saúde",
      "Auxílio refeição",
      "Onboarding presencial",
      "Bônus de disponibilidade",
    ],
  },
  {
    id: "qa-automation",
    title: "QA Automation Engineer",
    company: "QualiTech",
    location: "Remoto",
    remote: true,
    type: "full-time",
    salary: { min: 8000, max: 11000, currency: "BRL" },
    tags: ["Cypress", "Playwright", "CI/CD", "Testes"],
    postedAt: "2026-08-22",
    featured: false,
    logoColor: "#16a34a",
    description:
      "Vai garantir a qualidade dos nossos produtos construindo suites de testes automatizados end-to-end e integrados ao pipeline de deploy.",
    responsibilities: [
      "Criar e manter testes automatizados (e2e, API, integração)",
      "Integrar testes ao pipeline de CI/CD",
      "Reportar e acompanhar bugs com o time",
      "Promover boas práticas de qualidade no desenvolvimento",
    ],
    requirements: [
      "Experiência com Cypress ou Playwright",
      "Conhecimento de testes de API (RestAssured/Supertest)",
      "Noções de CI/CD e Docker",
      "Boa comunicação e senso crítico",
    ],
    benefits: [
      "Remoto total",
      "Plano de saúde",
      "Horário flexível",
      "Auxílio home-office",
    ],
  },
  {
    id: "data-engineer",
    title: "Data Engineer",
    company: "Insight Co.",
    location: "Belo Horizonte - MG",
    remote: true,
    type: "full-time",
    salary: { min: 12000, max: 16000, currency: "BRL" },
    tags: ["Python", "Spark", "Airflow", "Snowflake"],
    postedAt: "2026-08-20",
    featured: false,
    logoColor: "#0d9488",
    description:
      "Construa pipelines de dados escaláveis que alimentam dashboards e modelos de machine learning em toda a empresa.",
    responsibilities: [
      "Projetar e manter pipelines de dados (Python, Airflow)",
      "Modelar data warehouses (Snowflake)",
      "Processar grandes volumes com Spark",
      "Garantir qualidade e observabilidade dos dados",
    ],
    requirements: [
      "Experiência com Python e SQL avançado",
      "Conhecimento de Spark e Airflow",
      "Experiência com cloud (GCP ou AWS)",
      "Conhecimento de modelagem dimensional",
    ],
    benefits: [
      "Plano de saúde",
      "Auxílio educação",
      "Remoto com opção de escritório",
      "Wellness box mensal",
    ],
  },
  {
    id: "estagio-desenvolvimento",
    title: "Estágio em Desenvolvimento Full Stack",
    company: "StartupX",
    location: "Rio de Janeiro - RJ",
    remote: true,
    type: "internship",
    salary: { min: 1800, max: 2200, currency: "BRL" },
    tags: ["JavaScript", "Node.js", "React", "SQL"],
    postedAt: "2026-09-03",
    featured: false,
    logoColor: "#f59e0b",
    description:
      "Oportunidade de estágio para quem quer crescer rápido. Você vai trabalhar em features reais com mentoria de devs seniores e aprender a base do desenvolvimento web.",
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
  },
  {
    id: "security-engineer",
    title: "Application Security Engineer",
    company: "SecureLab",
    location: "Remoto",
    remote: true,
    type: "full-time",
    salary: { min: 15000, max: 19000, currency: "BRL" },
    tags: ["OWASP", "Pentest", "DevSecOps", "Cloud"],
    postedAt: "2026-08-18",
    featured: true,
    logoColor: "#dc2626",
    description:
      "Atue na vanguarda da segurança de aplicações. Você fará threat modeling, revisões de código e irá integrar segurança ao pipeline de desenvolvimento.",
    responsibilities: [
      "Realizar threat modeling e revisões de segurança",
      "Automatizar varreduras de segurança no CI/CD",
      "Conduzir pentests internos e coordenar externos",
      "Treinar devs em segurança ofensiva e defensiva",
    ],
    requirements: [
      "Experiência com segurança de aplicações web",
      "Conhecimento de OWASP Top 10",
      "Experiência com Cloud (AWS security)",
      "Certificações (OSCP, CEH, CISSP) são diferenciais",
    ],
    benefits: [
      "Alto salário + bônus",
      "Plano de saúde top",
      "Budgets para treinamento",
      "Remoto total",
    ],
  },
  {
    id: "tech-lead-platform",
    title: "Tech Lead de Plataforma",
    company: "Orbit Systems",
    location: "Curitiba - PR",
    remote: false,
    type: "full-time",
    salary: { min: 20000, max: 26000, currency: "BRL" },
    tags: ["Go", "Microservices", "Liderança", "gRPC"],
    postedAt: "2026-08-15",
    featured: false,
    logoColor: "#2563eb",
    description:
      "Lidere um time de engenheiros que construirá a próxima geração da nossa plataforma de orquestração e processamento em Go.",
    responsibilities: [
      "Liderar tecnicamente um time de 6 devs",
      "Definir arquitetura de microserviços em Go",
      "Garantir qualidade, testes e boas práticas",
      "Colaborar com product managers na roadmap",
    ],
    requirements: [
      "Experiência como tech lead ou senior engineer",
      "Domínio de Go ou outra linguagem de sistemas",
      "Experiência com microserviços e comunicação gRPC",
      "Excelente comunicação e mentoria",
    ],
    benefits: [
      "Stock options",
      "Bônus anual generoso",
      "Plano de saúde premium",
      "Auxílio moradia para relocação",
    ],
  },
  {
    id: "fullstack-nextjs",
    title: "Full Stack Developer (Next.js + Node)",
    company: "VendaPro",
    companyUrl: "https://vendapro.com.br",
    location: "Remoto",
    remote: true,
    type: "full-time",
    salary: { min: 10000, max: 14000, currency: "BRL" },
    tags: ["Next.js", "Node.js", "PostgreSQL", "Prisma"],
    postedAt: "2026-08-12",
    featured: false,
    logoColor: "#059669",
    description:
      "Venha construir o e-commerce que milhões de lojistas usam diariamente. Buscamos alguém com perfil full stack que ame entregar valor de ponta a ponta.",
    responsibilities: [
      "Desenvolver features de ponta a ponta (Next.js + Node)",
      "Modelar banco de dados e otimizar queries",
      "Construir integrações com gateways de pagamento",
      "Manter qualidade com testes e code reviews",
    ],
    requirements: [
      "Experiência com Next.js ou React",
      "Sólido conhecimento em Node.js e bancos relacionais",
      "Familiaridade com ORMs (Prisma/TypeORM)",
      "Experiência com APIs REST",
    ],
    benefits: [
      "Remoto total",
      "Plano de saúde e dental",
      "Auxílio home-office",
      "Bônus semestral",
    ],
  },
  {
    id: "react-native-mid",
    title: "Desenvolvedor React Native Pleno",
    company: "FinTech Link",
    location: "São Paulo - SP",
    remote: true,
    type: "full-time",
    salary: { min: 9500, max: 12500, currency: "BRL" },
    tags: ["React Native", "TypeScript", "Fintech", "Animação"],
    postedAt: "2026-09-04",
    featured: false,
    logoColor: "#14b8a6",
    description:
      "Junte-se ao time que está transformando o mercado financeiro digital. Você desenvolverá o app usado por mais de 2 milhões de clientes.",
    responsibilities: [
      "Construir telas e fluxos de alta qualidade com React Native",
      "Integrar com APIs de pagamento e banco",
      "Implementar animações e micro-interações",
      "Otimizar performance e experiência do usuário",
    ],
    requirements: [
      "2+ anos com React Native",
      "Conhecimento de state management (Zustand/Redux)",
      "Experiência com APIs REST",
      "Atenção a detalhes e qualidade visual",
    ],
    benefits: [
      "Plano de saúde",
      "Auxílio refeição",
      "Horário flexível",
      "Dia do aniversário off",
    ],
  },
];

export function getLocations(): string[] {
  const set = new Set(jobs.map((j) => j.location));
  return Array.from(set).sort();
}

export function searchJobs(params: {
  q?: string | null;
  location?: string | null;
  type?: string | null;
  remote?: string | null;
}): Job[] {
  const q = params.q?.trim().toLowerCase() ?? "";
  const location = params.location?.trim().toLowerCase() ?? "";
  const type = params.type ?? "";

  return jobs.filter((job) => {
    if (q) {
      const haystack = [job.title, job.company, job.tags.join(" ")].join(" ").toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (location && !job.location.toLowerCase().includes(location)) return false;
    if (type && job.type !== type) return false;
    if (params.remote === "true" && !job.remote) return false;
    return true;
  });
}

export function getJobById(id: string): Job | undefined {
  return jobs.find((job) => job.id === id);
}