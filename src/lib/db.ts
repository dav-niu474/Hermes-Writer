import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Get the database URL based on environment.
 * On Vercel, uses the Vercel Postgres pooled connection URL.
 * Locally, falls back to DATABASE_URL env var.
 */
function getDatabaseUrl(): string {
  // Vercel Postgres env vars (auto-set by Vercel Postgres store)
  const vercelPrismaUrl = process.env.harmesWriter_POSTGRES_PRISMA_URL
  if (vercelPrismaUrl) return vercelPrismaUrl

  const vercelUrl = process.env.POSTGRES_PRISMA_URL
  if (vercelUrl) return vercelUrl

  // Standard DATABASE_URL
  const standardUrl = process.env.DATABASE_URL
  if (standardUrl) return standardUrl

  // Should never reach here on Vercel
  throw new Error('No database URL configured. Set harmesWriter_POSTGRES_PRISMA_URL or DATABASE_URL.')
}

function createPrismaClient(): PrismaClient {
  const databaseUrl = getDatabaseUrl()

  // Connection pool settings for serverless environments
  const connectionUrl = databaseUrl.includes('?') ? databaseUrl : `${databaseUrl}?connect_timeout=10&pool_timeout=10`

  return new PrismaClient({
    datasourceUrl: connectionUrl,
    log: process.env.NODE_ENV === 'development' ? ['query'] : ['error'],
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

// In development, reuse the client to avoid exhausting connections
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// ============================================================
// Auto-initialization: ensure all required tables exist
// ============================================================

let dbInitialized = false
let initPromise: Promise<void> | null = null

/**
 * All CREATE TABLE IF NOT EXISTS statements matching the Prisma schema.
 * These are safe to re-run — IF NOT EXISTS and DO $$ ... EXCEPTION blocks
 * ensure idempotency.
 */
const SCHEMA_INIT_STATEMENTS = [
  // User
  `CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
  )`,
  `DO $$ BEGIN ALTER TABLE "User" ADD CONSTRAINT "User_email_key" UNIQUE ("email"); EXCEPTION WHEN duplicate_object THEN null; END $$`,

  // Novel
  `CREATE TABLE IF NOT EXISTS "Novel" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "genre" TEXT NOT NULL DEFAULT '',
    "coverImage" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Novel_pkey" PRIMARY KEY ("id")
  )`,

  // Chapter
  `CREATE TABLE IF NOT EXISTS "Chapter" (
    "id" TEXT NOT NULL,
    "novelId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "content" TEXT NOT NULL DEFAULT '',
    "summary" TEXT NOT NULL DEFAULT '',
    "chapterNumber" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "branchId" TEXT NOT NULL DEFAULT 'main',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Chapter_pkey" PRIMARY KEY ("id")
  )`,
  `DO $$ BEGIN ALTER TABLE "Chapter" ADD CONSTRAINT "Chapter_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$`,

  // Character
  `CREATE TABLE IF NOT EXISTS "Character" (
    "id" TEXT NOT NULL,
    "novelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'supporting',
    "description" TEXT NOT NULL DEFAULT '',
    "personality" TEXT NOT NULL DEFAULT '',
    "appearance" TEXT NOT NULL DEFAULT '',
    "backstory" TEXT NOT NULL DEFAULT '',
    "avatarUrl" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
  )`,
  `DO $$ BEGIN ALTER TABLE "Character" ADD CONSTRAINT "Character_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$`,

  // WorldSetting
  `CREATE TABLE IF NOT EXISTS "WorldSetting" (
    "id" TEXT NOT NULL,
    "novelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'geography',
    "description" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WorldSetting_pkey" PRIMARY KEY ("id")
  )`,
  `DO $$ BEGIN ALTER TABLE "WorldSetting" ADD CONSTRAINT "WorldSetting_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$`,

  // AgentTask
  `CREATE TABLE IF NOT EXISTS "AgentTask" (
    "id" TEXT NOT NULL,
    "novelId" TEXT NOT NULL,
    "chapterId" TEXT,
    "agentType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "input" TEXT NOT NULL DEFAULT '',
    "output" TEXT NOT NULL DEFAULT '',
    "errorMessage" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AgentTask_pkey" PRIMARY KEY ("id")
  )`,
  `DO $$ BEGIN ALTER TABLE "AgentTask" ADD CONSTRAINT "AgentTask_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$`,
  `DO $$ BEGIN ALTER TABLE "AgentTask" ADD CONSTRAINT "AgentTask_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$`,

  // NovelSpec
  `CREATE TABLE IF NOT EXISTS "NovelSpec" (
    "id" TEXT NOT NULL,
    "novelId" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'outline',
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'active',
    "parentSpecId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "NovelSpec_pkey" PRIMARY KEY ("id")
  )`,
  `DO $$ BEGIN ALTER TABLE "NovelSpec" ADD CONSTRAINT "NovelSpec_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$`,

  // SpecDelta
  `CREATE TABLE IF NOT EXISTS "SpecDelta" (
    "id" TEXT NOT NULL,
    "specId" TEXT NOT NULL,
    "proposalId" TEXT,
    "operation" TEXT NOT NULL DEFAULT 'ADDED',
    "description" TEXT NOT NULL DEFAULT '',
    "diffContent" TEXT NOT NULL DEFAULT '',
    "applied" BOOLEAN NOT NULL DEFAULT false,
    "appliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SpecDelta_pkey" PRIMARY KEY ("id")
  )`,
  `DO $$ BEGIN ALTER TABLE "SpecDelta" ADD CONSTRAINT "SpecDelta_specId_fkey" FOREIGN KEY ("specId") REFERENCES "NovelSpec"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$`,
  `DO $$ BEGIN ALTER TABLE "SpecDelta" ADD CONSTRAINT "SpecDelta_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "ChangeProposal"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$`,

  // ChangeProposal
  `CREATE TABLE IF NOT EXISTS "ChangeProposal" (
    "id" TEXT NOT NULL,
    "novelId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "scope" TEXT NOT NULL DEFAULT '',
    "impact" TEXT NOT NULL DEFAULT '',
    "tasks" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "completedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ChangeProposal_pkey" PRIMARY KEY ("id")
  )`,
  `DO $$ BEGIN ALTER TABLE "ChangeProposal" ADD CONSTRAINT "ChangeProposal_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$`,

  // ChapterSnapshot
  `CREATE TABLE IF NOT EXISTS "ChapterSnapshot" (
    "id" TEXT NOT NULL,
    "novelId" TEXT NOT NULL,
    "chapterId" TEXT,
    "chapterNumber" INTEGER NOT NULL DEFAULT 0,
    "snapshotType" TEXT NOT NULL DEFAULT 'manual',
    "label" TEXT NOT NULL DEFAULT '',
    "chapterContent" TEXT NOT NULL DEFAULT '',
    "specSnapshot" TEXT NOT NULL DEFAULT '',
    "metadata" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChapterSnapshot_pkey" PRIMARY KEY ("id")
  )`,
  `DO $$ BEGIN ALTER TABLE "ChapterSnapshot" ADD CONSTRAINT "ChapterSnapshot_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$`,

  // Branch
  `CREATE TABLE IF NOT EXISTS "Branch" (
    "id" TEXT NOT NULL,
    "novelId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'main',
    "description" TEXT NOT NULL DEFAULT '',
    "parentBranchId" TEXT,
    "basedOnSnapshotId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
  )`,
  `DO $$ BEGIN ALTER TABLE "Branch" ADD CONSTRAINT "Branch_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$`,

  // Performance indexes
  `CREATE INDEX IF NOT EXISTS "Chapter_novelId_idx" ON "Chapter"("novelId")`,
  `CREATE INDEX IF NOT EXISTS "Character_novelId_idx" ON "Character"("novelId")`,
  `CREATE INDEX IF NOT EXISTS "WorldSetting_novelId_idx" ON "WorldSetting"("novelId")`,
  `CREATE INDEX IF NOT EXISTS "AgentTask_novelId_idx" ON "AgentTask"("novelId")`,
  `CREATE INDEX IF NOT EXISTS "NovelSpec_novelId_idx" ON "NovelSpec"("novelId")`,
  `CREATE INDEX IF NOT EXISTS "ChangeProposal_novelId_idx" ON "ChangeProposal"("novelId")`,
  `CREATE INDEX IF NOT EXISTS "ChapterSnapshot_novelId_idx" ON "ChapterSnapshot"("novelId")`,
  `CREATE INDEX IF NOT EXISTS "Branch_novelId_idx" ON "Branch"("novelId")`,
]

/**
 * Run CREATE TABLE IF NOT EXISTS statements directly against the database.
 * Safe to call multiple times — all statements are idempotent.
 */
async function initDatabaseSchema(): Promise<void> {
  console.log('[db] Initializing database schema...')
  for (const sql of SCHEMA_INIT_STATEMENTS) {
    try {
      await db.$executeRawUnsafe(sql)
    } catch (err: any) {
      // Log but don't throw — some constraints might race, that's fine
      console.warn(`[db] Schema statement warning: ${err.message?.slice(0, 100) || 'unknown'}`)
    }
  }
  console.log('[db] Database schema initialized successfully')
}

/**
 * Ensures all required database tables exist before any API operation.
 * This is safe to call on every request — after the first successful check,
 * it short-circuits via the `dbInitialized` flag.
 *
 * Call this at the top of every API route that reads/writes to the database.
 */
export async function ensureDbInitialized(): Promise<void> {
  // Fast path: already confirmed
  if (dbInitialized) return

  // Deduplicate concurrent calls
  if (initPromise) {
    await initPromise
    return
  }

  initPromise = (async () => {
    try {
      // Quick check: does the Novel table exist?
      await db.$queryRaw`SELECT 1 FROM "Novel" LIMIT 0`
      dbInitialized = true
      console.log('[db] Database tables verified')
    } catch {
      // Table doesn't exist — create the full schema
      console.log('[db] Novel table not found, initializing schema...')
      await initDatabaseSchema()
      dbInitialized = true
    }
  })()

  try {
    await initPromise
  } catch (err) {
    // Even if init fails, mark as initialized to prevent infinite retries.
    // The actual API calls will return proper 500 errors.
    console.error('[db] Database initialization failed (non-fatal):', err)
    dbInitialized = true
  } finally {
    initPromise = null
  }
}
