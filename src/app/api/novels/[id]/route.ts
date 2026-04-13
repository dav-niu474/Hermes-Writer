import { NextResponse } from "next/server";
import { db, ensureDbInitialized } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await ensureDbInitialized();
    const novel = await db.novel.findUnique({
      where: { id },
      include: {
        chapters: { orderBy: { chapterNumber: "asc" } },
        characters: { orderBy: { createdAt: "desc" } },
        worldSettings: { orderBy: { createdAt: "desc" } },
        agentTasks: { orderBy: { createdAt: "desc" }, take: 50 },
      },
    });

    if (!novel) {
      return NextResponse.json({ error: "Novel not found" }, { status: 404 });
    }

    return NextResponse.json(novel);
  } catch (error) {
    console.error("Failed to fetch novel:", error);
    return NextResponse.json({ error: "Failed to fetch novel" }, { status: 500 });
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
    const { title, description, genre, status, coverImage } = body;

    const novel = await db.novel.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && { description: description?.trim() || "" }),
        ...(genre !== undefined && { genre: genre || "" }),
        ...(status !== undefined && { status }),
        ...(coverImage !== undefined && { coverImage: coverImage || "" }),
      },
    });

    return NextResponse.json(novel);
  } catch (error) {
    console.error("Failed to update novel:", error);
    return NextResponse.json({ error: "Failed to update novel" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await ensureDbInitialized();
    await db.novel.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete novel:", error);
    return NextResponse.json({ error: "Failed to delete novel" }, { status: 500 });
  }
}
