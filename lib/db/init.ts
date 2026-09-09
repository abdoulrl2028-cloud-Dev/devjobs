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