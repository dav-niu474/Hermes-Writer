import { NextRequest, NextResponse } from "next/server";
import { db, ensureDbInitialized } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    await ensureDbInitialized();
    const { searchParams } = new URL(request.url);
    const novelId = searchParams.get("novelId");

    if (!novelId) {
      return NextResponse.json({ error: "novelId is required" }, { status: 400 });
    }

    const characters = await db.character.findMany({
      where: { novelId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(characters);
  } catch (error) {
    console.error("Failed to fetch characters:", error);
    return NextResponse.json({ error: "Failed to fetch characters" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureDbInitialized();
    const body = await request.json();
    const { novelId, name, role, description, personality, appearance, backstory } = body;

    if (!novelId || !name?.trim()) {
      return NextResponse.json({ error: "novelId and name are required" }, { status: 400 });
    }

    const character = await db.character.create({
      data: {
        novelId,
        name: name.trim(),
        role: role || "supporting",
        description: description?.trim() || "",
        personality: personality?.trim() || "",
        appearance: appearance?.trim() || "",
        backstory: backstory?.trim() || "",
      },
    });

    return NextResponse.json(character, { status: 201 });
  } catch (error) {
    console.error("Failed to create character:", error);
    return NextResponse.json({ error: "Failed to create character" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await ensureDbInitialized();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    await db.character.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete character:", error);
    return NextResponse.json({ error: "Failed to delete character" }, { status: 500 });
  }
}
