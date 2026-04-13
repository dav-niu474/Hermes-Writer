import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/specs/[id] — get a single spec with its deltas
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const spec = await db.novelSpec.findUnique({
      where: { id },
      include: {
        specDeltas: {
          orderBy: { createdAt: "desc" },
          include: {
            proposal: {
              select: { id: true, title: true, status: true },
            },
          },
        },
      },
    });

    if (!spec) {
      return NextResponse.json({ error: "Spec not found" }, { status: 404 });
    }

    return NextResponse.json(spec);
  } catch (error) {
    console.error("Failed to fetch spec:", error);
    return NextResponse.json({ error: "Failed to fetch spec" }, { status: 500 });
  }
}

// PUT /api/specs/[id] — update spec content and bump version
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, content, category, status, parentSpecId } = body;

    // Verify the spec exists
    const existing = await db.novelSpec.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Spec not found" }, { status: 404 });
    }

    // Build the update payload — only include fields that are provided
    const updateData: Record<string, unknown> = {};

    if (title !== undefined) updateData.title = title.trim();
    if (category !== undefined) updateData.category = category;
    if (status !== undefined) updateData.status = status;
    if (parentSpecId !== undefined) updateData.parentSpecId = parentSpecId || null;

    // If content changed, bump the version
    if (content !== undefined && content !== existing.content) {
      updateData.content = content.trim();
      updateData.version = existing.version + 1;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const spec = await db.novelSpec.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(spec);
  } catch (error) {
    console.error("Failed to update spec:", error);
    return NextResponse.json({ error: "Failed to update spec" }, { status: 500 });
  }
}

// DELETE /api/specs/[id] — delete a spec
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const spec = await db.novelSpec.findUnique({ where: { id } });
    if (!spec) {
      return NextResponse.json({ error: "Spec not found" }, { status: 404 });
    }

    await db.novelSpec.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete spec:", error);
    return NextResponse.json({ error: "Failed to delete spec" }, { status: 500 });
  }
}
