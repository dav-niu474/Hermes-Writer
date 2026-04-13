import { NextResponse } from "next/server";
import { db, ensureDbInitialized } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: novelId } = await params;
    await ensureDbInitialized();
    const chapters = await db.chapter.findMany({
      where: { novelId },
      orderBy: { chapterNumber: "asc" },
    });
    return NextResponse.json(chapters);
  } catch (error) {
    console.error("Failed to fetch chapters:", error);
    return NextResponse.json({ error: "Failed to fetch chapters" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: novelId } = await params;
    await ensureDbInitialized();
    const body = await request.json();
    const { title, content, summary } = body;

    // Get next chapter number
    const lastChapter = await db.chapter.findFirst({
      where: { novelId },
      orderBy: { chapterNumber: "desc" },
    });
    const nextNumber = (lastChapter?.chapterNumber || 0) + 1;

    const chapter = await db.chapter.create({
      data: {
        novelId,
        title: title?.trim() || `第${nextNumber}章`,
        content: content || "",
        summary: summary || "",
        chapterNumber: nextNumber,
        status: "draft",
        wordCount: (content || "").length,
      },
    });

    // Update novel word count
    const allChapters = await db.chapter.findMany({ where: { novelId } });
    const totalWords = allChapters.reduce((sum, c) => sum + c.wordCount, 0);
    await db.novel.update({
      where: { id: novelId },
      data: { wordCount: totalWords },
    });

    return NextResponse.json(chapter, { status: 201 });
  } catch (error) {
    console.error("Failed to create chapter:", error);
    return NextResponse.json({ error: "Failed to create chapter" }, { status: 500 });
  }
}
