import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import fs from "node:fs";
import path from "node:path";
import type { DatabaseSync } from "node:sqlite";
import type { Pool, PoolClient } from "pg";

// Two interchangeable backends behind one async API:
//   - Postgres (Neon) when DATABASE_URL is set — used on Vercel, where the
//     filesystem is not persistent.
//   - SQLite file (data/app.db) otherwise — zero-setup local development.
// SQL is written once in the common dialect with "?" placeholders.

export const DATA_DIR = path.join(/*turbopackIgnore: true*/ process.cwd(), "data");
export const UPLOAD_DIR = path.join(/*turbopackIgnore: true*/ DATA_DIR, "uploads");

const SCHEMA = `

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cvs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_file TEXT,
  source_type TEXT NOT NULL,
  raw_text TEXT NOT NULL,
  parsed_content TEXT NOT NULL,
  version INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  employer TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  raw_text TEXT NOT NULL,
  source_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Saved',
  deadline TEXT,
  applied_at TEXT,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS job_images (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  storage_key TEXT NOT NULL,
  sequence INTEGER NOT NULL,
  ocr_text TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS analyses (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL UNIQUE REFERENCES jobs(id) ON DELETE CASCADE,
  cv_id TEXT,
  data TEXT NOT NULL,
  engine TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cv_tailorings (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  source_cv_id TEXT NOT NULL,
  recommendations TEXT NOT NULL,
  tailored_content TEXT,
  version INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS applications (
  job_id TEXT PRIMARY KEY REFERENCES jobs(id) ON DELETE CASCADE,
  tailoring_id TEXT,
  message_fi TEXT NOT NULL DEFAULT '',
  message_en TEXT NOT NULL DEFAULT '',
  form_answers TEXT NOT NULL DEFAULT '[]',
  interview TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS usage (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  free_analyses_used INTEGER NOT NULL DEFAULT 0,
  total_analyses INTEGER NOT NULL DEFAULT 0,
  plan TEXT NOT NULL DEFAULT 'free'
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL,
  payment_customer_id TEXT NOT NULL,
  subscription_id TEXT NOT NULL,
  status TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL,
  card_last4 TEXT,
  started_at TEXT NOT NULL,
  renewal_date TEXT NOT NULL,
  cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
  canceled_at TEXT
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL,
  description TEXT NOT NULL,
  paid_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_jobs_user ON jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_cvs_user ON cvs(user_id);
CREATE INDEX IF NOT EXISTS idx_tailor_job ON cv_tailorings(job_id);
`;

type Param = string | number | null;
type Row = Record<string, unknown>;

interface Driver {
  query(sql: string, params: Param[]): Promise<Row[]>;
  transaction<T>(fn: () => Promise<T>): Promise<T>;
}

export const usingPostgres = () => Boolean(process.env.DATABASE_URL?.trim());

// ───────── Postgres ─────────

const pgTx = new AsyncLocalStorage<PoolClient>();

function toPg(sql: string) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

async function postgresDriver(): Promise<Driver> {
  const { Pool } = await import("pg");
  const pool: Pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 10_000,
    ssl: /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL ?? "") ? undefined : { rejectUnauthorized: false },
  });
  // Initial schema + additive migrations (idempotent).
  await pool.query(SCHEMA);
  await pool.query("ALTER TABLE cv_tailorings ADD COLUMN IF NOT EXISTS meta TEXT");
  return {
    async query(sql, params) {
      const client = pgTx.getStore() ?? pool;
      const res = await client.query(toPg(sql), params);
      return res.rows as Row[];
    },
    async transaction(fn) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const out = await pgTx.run(client, fn);
        await client.query("COMMIT");
        return out;
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    },
  };
}

// ───────── SQLite ─────────

async function sqliteDriver(): Promise<Driver> {
  const { DatabaseSync } = await import("node:sqlite");
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const conn: DatabaseSync = new DatabaseSync(path.join(/*turbopackIgnore: true*/ DATA_DIR, "app.db"));
  conn.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  conn.exec(SCHEMA);
  const cols = (conn.prepare("PRAGMA table_info(cv_tailorings)").all() as { name: string }[]).map((c) => c.name);
  if (!cols.includes("meta")) conn.exec("ALTER TABLE cv_tailorings ADD COLUMN meta TEXT");
  let chain: Promise<unknown> = Promise.resolve();
  return {
    async query(sql, params) {
      const stmt = conn.prepare(sql);
      if (/^\s*(select|with)\b/i.test(sql) || /\breturning\b/i.test(sql)) return stmt.all(...params) as Row[];
      stmt.run(...params);
      return [];
    },
    // Serialise transactions so interleaved async work can't nest BEGINs.
    async transaction(fn) {
      const run = chain.then(async () => {
        conn.exec("BEGIN");
        try {
          const out = await fn();
          conn.exec("COMMIT");
          return out;
        } catch (e) {
          conn.exec("ROLLBACK");
          throw e;
        }
      });
      chain = run.catch(() => undefined);
      return run;
    },
  };
}

const g = globalThis as unknown as { __jhDriver?: Promise<Driver>; __jhDriverKind?: string };

function driver(): Promise<Driver> {
  const kind = usingPostgres() ? "pg" : "sqlite";
  if (!g.__jhDriver || g.__jhDriverKind !== kind) {
    g.__jhDriverKind = kind;
    g.__jhDriver = (kind === "pg" ? postgresDriver() : sqliteDriver()).catch((e) => {
      g.__jhDriver = undefined; // retry on next call
      throw e;
    });
  }
  return g.__jhDriver;
}

export function now() {
  return new Date().toISOString();
}

export function uid(prefix = "") {
  return prefix + crypto.randomUUID().replace(/-/g, "").slice(0, 20);
}

export async function get<T = Row>(sql: string, ...params: Param[]): Promise<T | undefined> {
  const rows = await (await driver()).query(sql, params);
  return rows[0] as T | undefined;
}

export async function all<T = Row>(sql: string, ...params: Param[]): Promise<T[]> {
  return (await (await driver()).query(sql, params)) as T[];
}

export async function run(sql: string, ...params: Param[]): Promise<void> {
  await (await driver()).query(sql, params);
}

/** Runs fn in a transaction; get/all/run inside it use the same connection. */
export async function tx<T>(fn: () => Promise<T>): Promise<T> {
  return (await driver()).transaction(fn);
}
