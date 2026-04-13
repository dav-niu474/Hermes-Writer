import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/snapshots/[id] — get a single snapshot
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const snapshot = await db.chapterSnapshot.findUnique({
      where: { id },
    });

    if (!snapshot) {
      return NextResponse.json({ error: "Snapshot not found" }, { status: 404 });
    }

    return NextResponse.json(snapshot);
  } catch (error) {
    console.error("Failed to fetch snapshot:", error);
    return NextResponse.json({ error: "Failed to fetch snapshot" }, { status: 500 });
  }
}

// DELETE /api/snapshots/[id] — delete a snapshot
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const snapshot = await db.chapterSnapshot.findUnique({ where: { id } });
    if (!snapshot) {
      return NextResponse.json({ error: "Snapshot not found" }, { status: 404 });
    }

    await db.chapterSnapshot.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete snapshot:", error);
    return NextResponse.json({ error: "Failed to delete snapshot" }, { status: 500 });
  }
}
