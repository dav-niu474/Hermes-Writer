import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const novels = await db.novel.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        _count: {
          select: { chapters: true, characters: true, agentTasks: true },
        },
      },
    });
    return NextResponse.json(novels);
  } catch (error) {
    console.error("Failed to fetch novels:", error);
    return NextResponse.json({ error: "Failed to fetch novels" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description, genre } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const novel = await db.novel.create({
      data: {
        title: title.trim(),
        description: description?.trim() || "",
        genre: genre || "",
        status: "draft",
      },
    });

    return NextResponse.json(novel, { status: 201 });
  } catch (error) {
    console.error("Failed to create novel:", error);
    return NextResponse.json({ error: "Failed to create novel" }, { status: 500 });
  }
}
