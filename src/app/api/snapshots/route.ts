import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const VALID_SNAPSHOT_TYPES = ["manual", "auto_pre_write", "auto_post_write"];

// GET /api/snapshots?novelId=xxx&type=xxx — list snapshots for a novel
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const novelId = searchParams.get("novelId");
    const type = searchParams.get("type");

    if (!novelId) {
      return NextResponse.json({ error: "novelId is required" }, { status: 400 });
    }

    if (type && !VALID_SNAPSHOT_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${VALID_SNAPSHOT_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    const where: Record<string, unknown> = { novelId };

    if (type) {
      where.snapshotType = type;
    }

    const snapshots = await db.chapterSnapshot.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(snapshots);
  } catch (error) {
    console.error("Failed to fetch snapshots:", error);
    return NextResponse.json({ error: "Failed to fetch snapshots" }, { status: 500 });
  }
}

// POST /api/snapshots — create a new chapter snapshot
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      novelId,
      chapterId,
      chapterNumber,
      snapshotType,
      label,
      chapterContent,
      specSnapshot,
      metadata,
    } = body;

    if (!novelId?.trim()) {
      return NextResponse.json({ error: "novelId is required" }, { status: 400 });
    }

    if (snapshotType && !VALID_SNAPSHOT_TYPES.includes(snapshotType)) {
      return NextResponse.json(
        { error: `Invalid snapshotType. Must be one of: ${VALID_SNAPSHOT_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    const snapshot = await db.chapterSnapshot.create({
      data: {
        novelId: novelId.trim(),
        chapterId: chapterId?.trim() || null,
        chapterNumber: typeof chapterNumber === "number" ? chapterNumber : 0,
        snapshotType: snapshotType || "manual",
        label: label?.trim() || "",
        chapterContent: typeof chapterContent === "string" ? chapterContent : "",
        specSnapshot: typeof specSnapshot === "string" ? specSnapshot : JSON.stringify(specSnapshot || {}),
        metadata: typeof metadata === "string" ? metadata : JSON.stringify(metadata || {}),
      },
    });

    return NextResponse.json(snapshot, { status: 201 });
  } catch (error) {
    console.error("Failed to create snapshot:", error);
    return NextResponse.json({ error: "Failed to create snapshot" }, { status: 500 });
  }
}
