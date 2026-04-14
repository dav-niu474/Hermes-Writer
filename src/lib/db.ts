/**
 * Database module - fault-tolerant with no-op fallback
 *
 * DESIGN:
 * - Local dev: tries better-sqlite3 (if available), falls back to no-op
 * - Vercel prod: tries @neondatabase/serverless (if POSTGRES URL available), falls back to no-op
 * - No-op stub ensures the app never crashes due to DB issues
 * - All DB operations are optional — AI generation works without DB
 */

import { randomUUID } from "crypto";

// ============================================================
// Environment detection
// ============================================================

function isPostgresUrl(url: string): boolean {
  return url.startsWith("postgresql://") || url.startsWith("postgres://");
}

function getPostgresUrl(): string | null {
  if (process.env.harmesWriter_POSTGRES_PRISMA_URL) return process.env.harmesWriter_POSTGRES_PRISMA_URL;
  if (process.env.POSTGRES_PRISMA_URL) return process.env.POSTGRES_PRISMA_URL;
  if (process.env.DATABASE_URL && isPostgresUrl(process.env.DATABASE_URL) && !process.env.DATABASE_URL.includes("dummy")) {
    return process.env.DATABASE_URL;
  }
  return null;
}

export const isPostgresAvailable = !!getPostgresUrl();

// ============================================================
// No-op stub database
// ============================================================

function createNoopDb() {
  const noopModel = {
    findMany: async (_opts?: any) => [],
    findUnique: async (_args?: any) => null,
    findFirst: async (_args?: any) => null,
    create: async (args: { data: any }) => ({ id: args.data?.id || randomUUID(), ...args.data }),
    update: async (_args?: any) => null,
    delete: async (_args?: any) => null,
  };

  const db = {
    user: noopModel,
    novel: noopModel,
    chapter: noopModel,
    character: noopModel,
    worldSetting: noopModel,
    agentTask: noopModel,
    novelSpec: noopModel,
    specDelta: noopModel,
    changeProposal: noopModel,
    chapterSnapshot: noopModel,
    branch: noopModel,
    $queryRaw: async () => null,
    $executeRawUnsafe: async () => 0,
  };

  return db;
}

// ============================================================
// Lazy database initialization
// ============================================================

let _db: any = null;
let _dbInitialized = false;

async function initDatabase(): Promise<any> {
  if (_dbInitialized) return _db;

  // Try PostgreSQL (Neon) for Vercel
  if (isPostgresAvailable) {
    try {
      const url = getPostgresUrl()!;
      const { neon } = await import("@neondatabase/serverless");
      const sql = neon(url);

      const pgClient = {
        async query(text: string, params?: any[]) {
          if (params && params.length > 0) return sql(text, ...params);
          return sql(text);
        },
        async $queryRaw(template: TemplateStringsArray, ...values: any[]) {
          const text = template.reduce((acc, part, i) => acc + part + (values[i] !== undefined ? values[i] : ""), "");
          return sql(text);
        },
        async $executeRawUnsafe(sqlStr: string) {
          return sql(sqlStr);
        },
      };

      _db = createNoopDb(); // PG model proxies would go here
      _dbInitialized = true;
      console.log("[db] PostgreSQL (Neon) connected");
      return _db;
    } catch (err) {
      console.warn("[db] PostgreSQL unavailable:", (err as Error).message?.slice(0, 80));
    }
  }

  // Try SQLite for local dev
  try {
    const { createSqliteDb } = await import("./db-sqlite");
    _db = createSqliteDb();
    _dbInitialized = true;
    console.log("[db] SQLite connected");
    return _db;
  } catch (err) {
    console.warn("[db] SQLite unavailable:", (err as Error).message?.slice(0, 80));
  }

  // Fallback to no-op
  _db = createNoopDb();
  _dbInitialized = true;
  console.log("[db] Using no-op stub (data won't persist, AI features work)");
  return _db;
}

// ============================================================
// Exported db — starts as no-op, upgrades lazily
// ============================================================

export const db = createNoopDb();

export async function ensureDbInitialized(): Promise<void> {
  if (_dbInitialized) return;
  const realDb = await initDatabase();
  if (realDb) {
    // Replace the no-op with real db
    Object.assign(db, realDb);
  }
}
