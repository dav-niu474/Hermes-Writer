/**
 * Database module - Prisma Client with Neon adapter for Vercel Postgres,
 * fallback to SQLite for local dev, no-op stub for safety.
 */

import { randomUUID } from "crypto";

// ============================================================
// Environment detection
// ============================================================

function isPostgresUrl(url: string): boolean {
  return url.startsWith("postgresql://") || url.startsWith("postgres://");
}

/** Try multiple env var names for Postgres URL */
function getPostgresUrl(): string | null {
  // Vercel Supabase Store auto-generates this prefix
  if (process.env.hermersWriter_POSTGRES_PRISMA_URL) return process.env.hermersWriter_POSTGRES_PRISMA_URL;
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
    count: async (_opts?: any) => 0,
    upsert: async (args: any) => ({
      id: args.where?.id || randomUUID(),
      ...args.create,
    }),
  };

  const db: Record<string, any> = {
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
    $executeRaw: async () => 0,
    $executeRawUnsafe: async () => 0,
    $connect: async () => {},
    $disconnect: async () => {},
  };

  return db;
}

// ============================================================
// Lazy database initialization
// ============================================================

let _db: any = null;
let _dbInitialized = false;
let _initPromise: Promise<void> | null = null;

async function initDatabase(): Promise<any> {
  if (_dbInitialized) return _db;

  // Try PostgreSQL (via Prisma Client + Neon adapter) for Vercel
  if (isPostgresAvailable) {
    try {
      const url = getPostgresUrl()!;

      // Dynamic imports for serverless
      const { Pool } = await import("@neondatabase/serverless");
      const { PrismaNeon } = await import("@prisma/adapter-neon");
      const { PrismaClient } = await import("@prisma/client");

      // WebSocket polyfill for Neon serverless in Vercel
      if (typeof globalThis.WebSocket === "undefined") {
        try {
          const ws = await import("ws");
          (globalThis as any).WebSocket = ws.default || ws;
        } catch {
          // ws may not be available in all environments
        }
      }

      const pool = new Pool({ connectionString: url });
      const adapter = new PrismaNeon(pool);
      const prisma = new PrismaClient({ adapter });

      // Auto-create tables on first connection
      try {
        await ensureSchema(pool);
      } catch (schemaErr) {
        console.warn("[db] Schema auto-init warning:", (schemaErr as Error).message?.slice(0, 100));
      }

      _db = prisma;
      _dbInitialized = true;
      console.log("[db] PostgreSQL (Prisma + Neon) connected");
      return _db;
    } catch (err) {
      console.warn("[db] PostgreSQL unavailable:", (err as Error).message?.slice(0, 120));
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

/**
 * Auto-create all tables in Postgres using raw SQL
 */
async function ensureSchema(pool: any): Promise<void> {
  const statements = [
    `CREATE TABLE IF NOT EXISTS "User" (
      "id" TEXT NOT NULL, "email" TEXT NOT NULL, "name" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "User_pkey" PRIMARY KEY ("id")
    )`,
    `DO $$ BEGIN ALTER TABLE "User" ADD CONSTRAINT "User_email_key" UNIQUE ("email"); EXCEPTION WHEN duplicate_object THEN null; END $$`,
    `CREATE TABLE IF NOT EXISTS "Novel" (
      "id" TEXT NOT NULL, "title" TEXT NOT NULL, "description" TEXT NOT NULL DEFAULT '',
      "genre" TEXT NOT NULL DEFAULT '', "coverImage" TEXT NOT NULL DEFAULT '',
      "status" TEXT NOT NULL DEFAULT 'draft', "wordCount" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "Novel_pkey" PRIMARY KEY ("id")
    )`,
    `CREATE TABLE IF NOT EXISTS "Chapter" (
      "id" TEXT NOT NULL, "novelId" TEXT NOT NULL, "title" TEXT NOT NULL DEFAULT '',
      "content" TEXT NOT NULL DEFAULT '', "summary" TEXT NOT NULL DEFAULT '',
      "chapterNumber" INTEGER NOT NULL DEFAULT 1, "status" TEXT NOT NULL DEFAULT 'draft',
      "wordCount" INTEGER NOT NULL DEFAULT 0, "branchId" TEXT NOT NULL DEFAULT 'main',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "Chapter_pkey" PRIMARY KEY ("id")
    )`,
    `DO $$ BEGIN ALTER TABLE "Chapter" ADD CONSTRAINT "Chapter_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$`,
    `CREATE TABLE IF NOT EXISTS "Character" (
      "id" TEXT NOT NULL, "novelId" TEXT NOT NULL, "name" TEXT NOT NULL,
      "role" TEXT NOT NULL DEFAULT 'supporting', "description" TEXT NOT NULL DEFAULT '',
      "personality" TEXT NOT NULL DEFAULT '', "appearance" TEXT NOT NULL DEFAULT '',
      "backstory" TEXT NOT NULL DEFAULT '', "avatarUrl" TEXT NOT NULL DEFAULT '',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
    )`,
    `DO $$ BEGIN ALTER TABLE "Character" ADD CONSTRAINT "Character_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$`,
    `CREATE TABLE IF NOT EXISTS "WorldSetting" (
      "id" TEXT NOT NULL, "novelId" TEXT NOT NULL, "name" TEXT NOT NULL,
      "category" TEXT NOT NULL DEFAULT 'geography', "description" TEXT NOT NULL DEFAULT '',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "WorldSetting_pkey" PRIMARY KEY ("id")
    )`,
    `DO $$ BEGIN ALTER TABLE "WorldSetting" ADD CONSTRAINT "WorldSetting_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$`,
    `CREATE TABLE IF NOT EXISTS "AgentTask" (
      "id" TEXT NOT NULL, "novelId" TEXT NOT NULL, "chapterId" TEXT,
      "agentType" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'pending',
      "input" TEXT NOT NULL DEFAULT '', "output" TEXT NOT NULL DEFAULT '',
      "errorMessage" TEXT NOT NULL DEFAULT '',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "AgentTask_pkey" PRIMARY KEY ("id")
    )`,
    `DO $$ BEGIN ALTER TABLE "AgentTask" ADD CONSTRAINT "AgentTask_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$`,
    `DO $$ BEGIN ALTER TABLE "AgentTask" ADD CONSTRAINT "AgentTask_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$`,
    `CREATE TABLE IF NOT EXISTS "ChangeProposal" (
      "id" TEXT NOT NULL, "novelId" TEXT NOT NULL, "title" TEXT NOT NULL,
      "description" TEXT NOT NULL DEFAULT '', "scope" TEXT NOT NULL DEFAULT '',
      "impact" TEXT NOT NULL DEFAULT '', "tasks" TEXT NOT NULL DEFAULT '',
      "status" TEXT NOT NULL DEFAULT 'draft', "completedAt" TIMESTAMP(3), "archivedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "ChangeProposal_pkey" PRIMARY KEY ("id")
    )`,
    `DO $$ BEGIN ALTER TABLE "ChangeProposal" ADD CONSTRAINT "ChangeProposal_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$`,
    `CREATE TABLE IF NOT EXISTS "NovelSpec" (
      "id" TEXT NOT NULL, "novelId" TEXT NOT NULL, "category" TEXT NOT NULL DEFAULT 'outline',
      "title" TEXT NOT NULL, "content" TEXT NOT NULL DEFAULT '', "version" INTEGER NOT NULL DEFAULT 1,
      "status" TEXT NOT NULL DEFAULT 'active', "parentSpecId" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "NovelSpec_pkey" PRIMARY KEY ("id")
    )`,
    `DO $$ BEGIN ALTER TABLE "NovelSpec" ADD CONSTRAINT "NovelSpec_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$`,
    `CREATE TABLE IF NOT EXISTS "SpecDelta" (
      "id" TEXT NOT NULL, "specId" TEXT NOT NULL, "proposalId" TEXT,
      "operation" TEXT NOT NULL DEFAULT 'ADDED', "description" TEXT NOT NULL DEFAULT '',
      "diffContent" TEXT NOT NULL DEFAULT '', "applied" BOOLEAN NOT NULL DEFAULT false,
      "appliedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "SpecDelta_pkey" PRIMARY KEY ("id")
    )`,
    `DO $$ BEGIN ALTER TABLE "SpecDelta" ADD CONSTRAINT "SpecDelta_specId_fkey" FOREIGN KEY ("specId") REFERENCES "NovelSpec"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$`,
    `DO $$ BEGIN ALTER TABLE "SpecDelta" ADD CONSTRAINT "SpecDelta_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "ChangeProposal"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$`,
    `CREATE TABLE IF NOT EXISTS "ChapterSnapshot" (
      "id" TEXT NOT NULL, "novelId" TEXT NOT NULL, "chapterId" TEXT,
      "chapterNumber" INTEGER NOT NULL DEFAULT 0, "snapshotType" TEXT NOT NULL DEFAULT 'manual',
      "label" TEXT NOT NULL DEFAULT '', "chapterContent" TEXT NOT NULL DEFAULT '',
      "specSnapshot" TEXT NOT NULL DEFAULT '', "metadata" TEXT NOT NULL DEFAULT '',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ChapterSnapshot_pkey" PRIMARY KEY ("id")
    )`,
    `DO $$ BEGIN ALTER TABLE "ChapterSnapshot" ADD CONSTRAINT "ChapterSnapshot_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$`,
    `CREATE TABLE IF NOT EXISTS "Branch" (
      "id" TEXT NOT NULL, "novelId" TEXT NOT NULL, "name" TEXT NOT NULL DEFAULT 'main',
      "description" TEXT NOT NULL DEFAULT '', "parentBranchId" TEXT, "basedOnSnapshotId" TEXT,
      "status" TEXT NOT NULL DEFAULT 'active',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
    )`,
    `DO $$ BEGIN ALTER TABLE "Branch" ADD CONSTRAINT "Branch_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$`,
    // Indexes
    `CREATE INDEX IF NOT EXISTS "Chapter_novelId_idx" ON "Chapter"("novelId")`,
    `CREATE INDEX IF NOT EXISTS "Character_novelId_idx" ON "Character"("novelId")`,
    `CREATE INDEX IF NOT EXISTS "WorldSetting_novelId_idx" ON "WorldSetting"("novelId")`,
    `CREATE INDEX IF NOT EXISTS "AgentTask_novelId_idx" ON "AgentTask"("novelId")`,
    `CREATE INDEX IF NOT EXISTS "NovelSpec_novelId_idx" ON "NovelSpec"("novelId")`,
    `CREATE INDEX IF NOT EXISTS "ChangeProposal_novelId_idx" ON "ChangeProposal"("novelId")`,
    `CREATE INDEX IF NOT EXISTS "ChapterSnapshot_novelId_idx" ON "ChapterSnapshot"("novelId")`,
    `CREATE INDEX IF NOT EXISTS "Branch_novelId_idx" ON "Branch"("novelId")`,
  ];

  for (const sql of statements) {
    try {
      await pool.query(sql);
    } catch (err) {
      console.warn("[db] Schema DDL warning:", (err as Error).message?.slice(0, 80));
    }
  }
}

// ============================================================
// Exported db — starts as no-op, upgrades lazily
// ============================================================

export const db = createNoopDb();

export async function ensureDbInitialized(): Promise<void> {
  if (_dbInitialized) return;
  // Prevent race condition from concurrent cold-start requests
  if (!_initPromise) {
    _initPromise = initDatabase().then((realDb) => {
      if (realDb) {
        Object.assign(db, realDb);
      }
      _dbInitialized = true;
    });
  }
  await _initPromise;
}
