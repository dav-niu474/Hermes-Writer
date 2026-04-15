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
    const { name, category, description } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const setting = await db.worldSetting.update({
      where: { id },
      data: {
        name: name.trim(),
        category: category || "geography",
        description: description?.trim() || "",
      },
    });

    return NextResponse.json(setting);
  } catch (error) {
    console.error("Failed to update world setting:", error);
    return NextResponse.json({ error: "Failed to update world setting" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDbInitialized();
    const { id } = await params;
    await db.worldSetting.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete world setting:", error);
    return NextResponse.json({ error: "Failed to delete world setting" }, { status: 500 });
  }
}
