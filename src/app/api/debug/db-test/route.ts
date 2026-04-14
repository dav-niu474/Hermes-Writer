import { NextResponse } from "next/server";
import { ensureDbInitialized, db, isPostgresAvailable } from "@/lib/db";

export async function GET() {
  try {
    await ensureDbInitialized();

    // Show connection info (masked)
    const envVars: Record<string, string> = {};
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("hermersWriter_POSTGRES") || key === "DATABASE_URL") {
        const val = process.env[key] || "";
        envVars[key] = val.slice(0, 30) + "..." + val.slice(-10);
      }
    }

    // Check what tables exist
    const tables = await db.$executeRawUnsafe(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`
    ) as any[];

    // Check row counts
    const tableCounts: Record<string, number> = {};
    if (Array.isArray(tables)) {
      for (const t of tables) {
        try {
          const result = await db.$executeRawUnsafe(`SELECT COUNT(*)::int as cnt FROM "${t.table_name}"`) as any[];
          tableCounts[t.table_name] = Array.isArray(result) ? result[0]?.cnt || 0 : 0;
        } catch { /* skip */ }
      }
    }

    // Test INSERT + SELECT
    const testId = crypto.randomUUID();
    await db.$executeRawUnsafe(`INSERT INTO "Novel" ("id", "title", "description", "genre", "coverImage", "status", "wordCount", "createdAt", "updatedAt") VALUES ('${testId}', 'DB Test', 'test', 'test', '', 'draft', 0, NOW(), NOW())`);
    const found = await db.novel.findUnique({ where: { id: testId } });
    if (found?.id) {
      await db.novel.delete({ where: { id: testId } });
    }

    return NextResponse.json({
      envVars,
      tables: tableCounts,
      testResult: found ? { id: found.id, title: found.title } : null,
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
