import { NextResponse } from "next/server";
import { db, ensureDbInitialized } from "@/lib/db";

export async function POST(request: Request) {
  try {
    await ensureDbInitialized();
    const body = await request.json();
    const { novelId, name, category, description } = body;

    if (!novelId || !name?.trim()) {
      return NextResponse.json({ error: "novelId and name are required" }, { status: 400 });
    }

    const setting = await db.worldSetting.create({
      data: {
        novelId,
        name: name.trim(),
        category: category || "geography",
        description: description?.trim() || "",
      },
    });

    return NextResponse.json(setting, { status: 201 });
  } catch (error) {
    console.error("Failed to create world setting:", error);
    return NextResponse.json({ error: "Failed to create world setting" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await ensureDbInitialized();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    await db.worldSetting.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete world setting:", error);
    return NextResponse.json({ error: "Failed to delete world setting" }, { status: 500 });
  }
}
