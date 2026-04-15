import { NextResponse } from "next/server";
import { db, ensureDbInitialized } from "@/lib/db";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDbInitialized();
    const { id } = await params;
    const body = await request.json();
    const { name, role, description, personality, appearance, backstory } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const character = await db.character.update({
      where: { id },
      data: {
        name: name.trim(),
        role: role || "supporting",
        description: description?.trim() || "",
        personality: personality?.trim() || "",
        appearance: appearance?.trim() || "",
        backstory: backstory?.trim() || "",
      },
    });

    return NextResponse.json(character);
  } catch (error) {
    console.error("Failed to update character:", error);
    return NextResponse.json({ error: "Failed to update character" }, { status: 500 });
  }
}
