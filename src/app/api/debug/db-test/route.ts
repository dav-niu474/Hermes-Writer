import { NextResponse } from "next/server";
import { ensureDbInitialized, db } from "@/lib/db";

export async function GET() {
  try {
    await ensureDbInitialized();

    // Test raw query
    const raw = await db.$queryRaw`SELECT current_database(), current_user`;

    // Test INSERT + SELECT in same request
    const testId = crypto.randomUUID();
    await db.$executeRawUnsafe(`INSERT INTO "Novel" ("id", "title", "description", "genre", "coverImage", "status", "wordCount", "createdAt", "updatedAt") VALUES ('${testId}', 'DB Test', 'test', 'test', '', 'draft', 0, NOW(), NOW())`);

    const found = await db.novel.findUnique({ where: { id: testId } });

    // Cleanup
    if (found?.id) {
      await db.novel.delete({ where: { id: testId } });
    }

    return NextResponse.json({
      connection: raw,
      testId,
      found: found ? { id: found.id, title: found.title } : null,
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack?.slice(0, 500) : undefined,
    }, { status: 500 });
  }
}
