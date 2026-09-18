import { migrateDatabase } from "./schema";
import { seedDatabase } from "./seed";
import { execute } from "./conn";

let initialized = false;
let promise: Promise<void> | null = null;

// Migrações incrementais para bancos criados antes da adição de novos campos.
async function applyIncrementalMigrations(): Promise<void> {
  const migrations: Array<() => Promise<void>> = [
    // payments.coupon_code
    async () => {
      try {
        await execute("ALTER TABLE payments ADD COLUMN coupon_code TEXT");
      } catch {
        // Coluna já existente (SQLite/PG lançam erro neste caso).
      }
    },
    // users.google_id, users.facebook_id, users.avatar_url (login social)
    async () => {
      const columns = [
        "google_id TEXT",
        "facebook_id TEXT",
        "avatar_url TEXT",
      ];
      for (const column of columns) {
        try {
          await execute(`ALTER TABLE users ADD COLUMN ${column}`);
        } catch {
          // Coluna já existente.
        }
      }
    },
    // users.candidate_tier (planos do candidato: free | premium | pro)
    async () => {
      try {
        await execute("ALTER TABLE users ADD COLUMN candidate_tier TEXT DEFAULT 'free'");
      } catch {
        // Coluna já existente.
      }
    },
    // applications.stage (pipeline/kanban do candidato)
    async () => {
      try {
        await execute("ALTER TABLE applications ADD COLUMN stage TEXT DEFAULT 'applied'");
      } catch {
        // Coluna já existente.
      }
    },
    // applications.notes (observações do candidato sobre a aplicação)
    async () => {
      try {
        await execute("ALTER TABLE applications ADD COLUMN notes TEXT");
      } catch {
        // Coluna já existente.
      }
    },
    // candidate_subscriptions.cadence (mensal | anual)
    async () => {
      try {
        await execute("ALTER TABLE candidate_subscriptions ADD COLUMN cadence TEXT NOT NULL DEFAULT 'monthly'");
      } catch {
        // Coluna já existente.
      }
    },
    // jobs internacionais (feed externo): país, cidade, região, fonte, id externo,
    // empregador de origem e data de publicação da fonte.
    async () => {
      const columns = [
        "country TEXT",
        "city TEXT",
        "region TEXT",
        "source TEXT",
        "external_id TEXT",
        "source_company TEXT",
        "posted_at_ref TEXT",
      ];
      for (const column of columns) {
        try {
          await execute(`ALTER TABLE jobs ADD COLUMN ${column}`);
        } catch {
          // Coluna já existente.
        }
      }
      // Índices só são criados após a coluna existir (a tabela já existia em
      // bases legadas; migrar antes de indexar evita erro de coluna ausente).
      await execute("CREATE INDEX IF NOT EXISTS idx_jobs_country ON jobs(country)");
      await execute("CREATE INDEX IF NOT EXISTS idx_jobs_source ON jobs(source)");
      await execute("CREATE INDEX IF NOT EXISTS idx_jobs_external ON jobs(source, external_id)");
    },
    // resumes: arquivo PDF anexado (currículo) para download pela empresa.
    async () => {
      const columns = [
        "filename TEXT",
        "file_mime TEXT",
        "file_size INTEGER",
        "file_data TEXT",
      ];
      for (const column of columns) {
        try {
          await execute(`ALTER TABLE resumes ADD COLUMN ${column}`);
        } catch {
          // Coluna já existente.
        }
      }
    },
    // applications: candidatura com IA (currículo usado, score da análise,
    // entrevista por vaga e origem da candidatura).
    async () => {
      const columns = [
        "resume_id TEXT",
        "analysis_score INTEGER",
        "interview_id TEXT",
        "applied_via TEXT DEFAULT 'manual'",
      ];
      for (const column of columns) {
        try {
          await execute(`ALTER TABLE applications ADD COLUMN ${column}`);
        } catch {
          // Coluna já existente.
        }
      }
    },
  ];
  for (const migration of migrations) {
    await migration();
  }
}

// Garante que as migrations e seeds rodem uma única vez por processo.
export async function ensureDatabaseReady(): Promise<void> {
  if (initialized) return;
  if (!promise) {
    promise = (async () => {
      try {
        await migrateDatabase();
        await applyIncrementalMigrations();
        await seedDatabase();
        initialized = true;
      } catch (error) {
        promise = null;
        console.error("[db] Falha ao inicializar banco de dados:", error);
        throw error;
      }
    })();
  }
  await promise;
}