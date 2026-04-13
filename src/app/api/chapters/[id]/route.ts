import { NextResponse } from "next/server";
import { db, ensureDbInitialized } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await ensureDbInitialized();

    const chapter = await db.chapter.findUnique({ where: { id } });
    if (!chapter) {
      return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
    }
    return NextResponse.json(chapter);
  } catch (error) {
    console.error("Failed to fetch chapter:", error);
    return NextResponse.json({ error: "Failed to fetch chapter" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await ensureDbInitialized();
    const body = await request.json();
    const { title, content, summary, status } = body;

    const chapter = await db.chapter.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(content !== undefined && {
          content: content,
          wordCount: content.length,
        }),
        ...(summary !== undefined && { summary }),
        ...(status !== undefined && { status }),
      },
    });

    // Update novel word count
    const allChapters = await db.chapter.findMany({ where: { novelId: chapter.novelId } });
    const totalWords = allChapters.reduce((sum, c) => sum + c.wordCount, 0);
    await db.novel.update({
      where: { id: chapter.novelId },
      data: { wordCount: totalWords },
    });

    return NextResponse.json(chapter);
  } catch (error) {
    console.error("Failed to update chapter:", error);
    return NextResponse.json({ error: "Failed to update chapter" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await ensureDbInitialized();

    const chapter = await db.chapter.findUnique({ where: { id } });
    if (!chapter) {
      return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
    }

    await db.chapter.delete({ where: { id } });

    // Update novel word count
    const allChapters = await db.chapter.findMany({ where: { novelId: chapter.novelId } });
    const totalWords = allChapters.reduce((sum, c) => sum + c.wordCount, 0);
    await db.novel.update({
      where: { id: chapter.novelId },
      data: { wordCount: totalWords },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete chapter:", error);
    return NextResponse.json({ error: "Failed to delete chapter" }, { status: 500 });
  }
}
