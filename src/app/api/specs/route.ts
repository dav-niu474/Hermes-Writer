import { NextResponse } from "next/server";
import { db, ensureDbInitialized } from "@/lib/db";

const VALID_CATEGORIES = ["characters", "worldbuilding", "outline", "rules", "style"];

// GET /api/specs?novelId=xxx&category=xxx — list specs for a novel
export async function GET(request: Request) {
  try {
    await ensureDbInitialized();
    const { searchParams } = new URL(request.url);
    const novelId = searchParams.get("novelId");
    const category = searchParams.get("category");

    if (!novelId) {
      return NextResponse.json({ error: "novelId is required" }, { status: 400 });
    }

    if (category && !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(", ")}` },
        { status: 400 }
      );
    }

    const where: Record<string, unknown> = { novelId };

    if (category) {
      where.category = category;
    }

    const specs = await db.novelSpec.findMany({
      where,
      orderBy: [{ category: "asc" }, { updatedAt: "desc" }],
      include: {
        _count: {
          select: { specDeltas: true },
        },
      },
    });

    return NextResponse.json(specs);
  } catch (error) {
    console.error("Failed to fetch specs:", error);
    return NextResponse.json({ error: "Failed to fetch specs" }, { status: 500 });
  }
}

// POST /api/specs — create a new spec
export async function POST(request: Request) {
  try {
    await ensureDbInitialized();
    const body = await request.json();
    const { novelId, category, title, content, parentSpecId } = body;

    if (!novelId?.trim()) {
      return NextResponse.json({ error: "novelId is required" }, { status: 400 });
    }

    if (!title?.trim()) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    if (category && !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(", ")}` },
        { status: 400 }
      );
    }

    const spec = await db.novelSpec.create({
      data: {
        novelId: novelId.trim(),
        category: category || "outline",
        title: title.trim(),
        content: content?.trim() || "",
        version: 1,
        status: "active",
        parentSpecId: parentSpecId?.trim() || null,
      },
    });

    return NextResponse.json(spec, { status: 201 });
  } catch (error) {
    console.error("Failed to create spec:", error);
    return NextResponse.json({ error: "Failed to create spec" }, { status: 500 });
  }
}
