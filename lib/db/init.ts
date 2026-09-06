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