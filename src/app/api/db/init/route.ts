import { NextResponse } from "next/server";
import { db, ensureDbInitialized, isPostgresAvailable } from "@/lib/db";

/**
 * POST /api/db/init
 * Initializes the database schema. For SQLite, tables are auto-created.
 * For PostgreSQL, runs CREATE TABLE IF NOT EXISTS statements.
 */
export async function POST() {
  try {
    const results: string[] = [];

    if (!isPostgresAvailable) {
      // SQLite mode: tables are already created in createSqliteDb()
      // Just verify connectivity
      await db.$queryRaw`SELECT 1`;
      results.push("✓ SQLite database ready (tables auto-created on startup)");
      return NextResponse.json({
        success: true,
        mode: "sqlite",
        message: "SQLite database ready — tables are auto-created",
        details: results,
      });
    }

    // PostgreSQL mode: run CREATE TABLE statements
    await ensureDbInitialized();

    const statements = [
      `CREATE TABLE IF NOT EXISTS "User" (
        "id" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "name" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "User_pkey" PRIMARY KEY ("id")
      )`,
      `DO $$ BEGIN ALTER TABLE "User" ADD CONSTRAINT "User_email_key" UNIQUE ("email"); EXCEPTION WHEN duplicate_object THEN null; END $$`,

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
    ];

    for (const sql of statements) {
      try {
        await db.$executeRawUnsafe(sql);
        const tableName = sql.match(/"(\w+)"/)?.[1] || sql.slice(0, 30);
        results.push(`✓ ${tableName}`);
      } catch (err: any) {
        results.push(`✗ ${err.message?.slice(0, 80) || "error"}`);
      }
    }

    return NextResponse.json({
      success: true,
      mode: "postgresql",
      message: "PostgreSQL database schema initialized successfully",
      details: results,
    });
  } catch (error) {
    console.error("Database init failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/db/init — Health check
 */
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "ok",
      database: "connected",
      mode: isPostgresAvailable ? "postgresql" : "sqlite",
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        database: "disconnected",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
