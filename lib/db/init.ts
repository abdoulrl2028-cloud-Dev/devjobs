import { migrateDatabase } from "./schema";
import { seedDatabase } from "./seed";

let initialized = false;
let promise: Promise<void> | null = null;

// Garante que as migrations e seeds rodem uma única vez por processo.
export async function ensureDatabaseReady(): Promise<void> {
  if (initialized) return;
  if (!promise) {
    promise = (async () => {
      try {
        await migrateDatabase();
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