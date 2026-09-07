// Espelha o SQLite local (data/devjobs.db) no Postgres via DATABASE_URL/ PG env.
// Uso: PG=postgresql://... node scripts/sync-neon.mjs
// Não contém credenciais; elas vêm de variável de ambiente.
import { DatabaseSync } from "node:sqlite";
import pg from "pg";

const PG = process.env.PG;
if (!PG) {
  console.error("Defina PG=postgresql://...");
  process.exit(1);
}

const TABLE_ORDER = [
  "users",
  "companies",
  "candidate_profiles",
  "candidate_skills",
  "jobs",
  "favorites",
  "applications",
  "job_views",
  "subscriptions",
  "payments",
  "coupons",
];

const sqlite = new DatabaseSync("data/devjobs.db", { readOnly: true });
const pool = new pg.Pool({ connectionString: PG, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000 });

function sqliteColumns(table) {
  return sqlite.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
}

async function pgColumns(table) {
  const r = await pool.query(
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1",
    [table]
  );
  const map = {};
  for (const row of r.rows) map[row.column_name] = row.data_type.toLowerCase();
  return map;
}

async function syncTable(table) {
  const scols = sqliteColumns(table);
  const pcols = await pgColumns(table);
  const cols = scols.filter((c) => c in pcols);

  const rows = sqlite.prepare(`SELECT * FROM ${table}`).all();

  await pool.query(`TRUNCATE TABLE ${table} CASCADE`);

  if (rows.length === 0) {
    console.log(table.padEnd(22), "0 (igual/vazio)");
    return;
  }

  const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
  const sql = `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${placeholders})`;

  // inserção em lote
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const row of rows) {
      const values = cols.map((c) => {
        let v = row[c];
        if (v === undefined) return null;
        if (pcols[c] === "boolean") return v === 1 || v === true || v === "1" || v === 1n;
        return v;
      });
      await client.query(sql, values);
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
  console.log(table.padEnd(22), rows.length);
}

try {
  for (const t of TABLE_ORDER) {
    await syncTable(t);
  }
  console.log("\nSync concluído.");
} catch (e) {
  console.error("ERRO no sync:", e.message);
  process.exitCode = 1;
} finally {
  await pool.end();
  sqlite.close();
}