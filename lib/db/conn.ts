import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import { Pool, type PoolClient } from "pg";

export type Row = Record<string, unknown>;

const DATABASE_URL = process.env.DATABASE_URL;
export const isPostgres = Boolean(DATABASE_URL);

let sqliteDb: DatabaseSync | null = null;
let pgPool: Pool | null = null;
const sqlitePath = path.join(process.cwd(), "data", "devjobs.db");

function getSqlite(): DatabaseSync {
  if (!sqliteDb) {
    fs.mkdirSync(path.dirname(sqlitePath), { recursive: true });
    sqliteDb = new DatabaseSync(sqlitePath);
    sqliteDb.exec("PRAGMA journal_mode = WAL;");
    sqliteDb.exec("PRAGMA foreign_keys = ON;");
  }
  return sqliteDb;
}

function getPg(): Pool {
  if (!pgPool) {
    pgPool = new Pool({ connectionString: DATABASE_URL!, max: 5 });
  }
  return pgPool;
}

// Converte placeholders "?" do SQLite para "$1, $2..." do Postgres.
function toPgParams(sql: string): { sql: string; paramCount: number } {
  let count = 0;
  const converted = sql.replace(/\?/g, () => `$${++count}`);
  return { sql: converted, paramCount: count };
}

type SqlValue = string | number | bigint | boolean | null;

function normalizeParams(params: SqlValue[]): Array<string | number | bigint | null> {
  return params.map((p): string | number | bigint | null =>
    typeof p === "boolean" ? (p ? 1 : 0) : p
  );
}

export async function queryAll(
  sql: string,
  params: SqlValue[] = []
): Promise<Row[]> {
  const values = normalizeParams(params);
  if (isPostgres) {
    const { sql: pgSql } = toPgParams(sql);
    const res = await getPg().query(pgSql, values);
    return res.rows as Row[];
  }
  const stmt = getSqlite().prepare(sql);
  return stmt.all(...values) as Row[];
}

export async function queryOne(
  sql: string,
  params: SqlValue[] = []
): Promise<Row | undefined> {
  const rows = await queryAll(sql, params);
  return rows[0];
}

export async function execute(
  sql: string,
  params: SqlValue[] = []
): Promise<{ changes: number }> {
  const values = normalizeParams(params);
  if (isPostgres) {
    const { sql: pgSql } = toPgParams(sql);
    const res = await getPg().query(pgSql, values);
    return { changes: res.rowCount ?? 0 };
  }
  const stmt = getSqlite().prepare(sql);
  const result = stmt.run(...values);
  return { changes: Number(result.changes) };
}

export async function withTransaction<T>(
  fn: (client: { queryAll: typeof queryAll; execute: typeof execute }) => Promise<T>
): Promise<T> {
  if (isPostgres) {
    const client: PoolClient = await getPg().connect();
    try {
      await client.query("BEGIN");
      const tx = {
        queryAll: async (sql: string, params: SqlValue[] = []) => {
          const { sql: pgSql } = toPgParams(sql);
          const res = await client.query(pgSql, normalizeParams(params));
          return res.rows as Row[];
        },
        execute: async (sql: string, params: SqlValue[] = []) => {
          const { sql: pgSql } = toPgParams(sql);
          const res = await client.query(pgSql, normalizeParams(params));
          return { changes: res.rowCount ?? 0 };
        },
      };
      const result = await fn(tx);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  const db = getSqlite();
  db.exec("BEGIN");
  try {
    const tx = {
      queryAll: async (sql: string, params: SqlValue[] = []) => {
        return db.prepare(sql).all(...normalizeParams(params)) as Row[];
      },
      execute: async (sql: string, params: SqlValue[] = []) => {
        const r = db.prepare(sql).run(...normalizeParams(params));
        return { changes: Number(r.changes) };
      },
    };
    const result = await fn(tx);
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export async function runMigrations(sql: string): Promise<void> {
  const statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (isPostgres) {
    const client = await getPg().connect();
    try {
      for (const stmt of statements) {
        await client.query(stmt);
      }
    } finally {
      client.release();
    }
    return;
  }

  const db = getSqlite();
  db.exec("BEGIN");
  try {
    for (const stmt of statements) {
      db.exec(stmt);
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export async function closeDb(): Promise<void> {
  if (sqliteDb) {
    sqliteDb.close();
    sqliteDb = null;
  }
  if (pgPool) {
    await pgPool.end();
    pgPool = null;
  }
}

export function likeEscape(value: string): string {
  return value.replace(/[\\%_]/g, (m) => `\\${m}`);
}