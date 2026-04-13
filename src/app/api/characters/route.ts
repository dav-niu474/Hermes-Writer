import { NextResponse } from "next/server";
import { db, ensureDbInitialized } from "@/lib/db";

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
