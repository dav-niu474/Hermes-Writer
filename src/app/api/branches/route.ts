import { NextResponse } from "next/server";
import { db, ensureDbInitialized } from "@/lib/db";

const VALID_STATUSES = ["active", "merged", "abandoned"];

// GET /api/branches?novelId=xxx&status=xxx — list branches for a novel
export async function GET(request: Request) {
  try {
    await ensureDbInitialized();
    const { searchParams } = new URL(request.url);
    const novelId = searchParams.get("novelId");
    const status = searchParams.get("status");

    if (!novelId) {
      return NextResponse.json({ error: "novelId is required" }, { status: 400 });
    }

    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    const where: Record<string, unknown> = { novelId };

    if (status) {
      where.status = status;
    }

    const branches = await db.branch.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(branches);
  } catch (error) {
    console.error("Failed to fetch branches:", error);
    return NextResponse.json({ error: "Failed to fetch branches" }, { status: 500 });
  }
}

// POST /api/branches — create a new branch
export async function POST(request: Request) {
  try {
    await ensureDbInitialized();
    const body = await request.json();
    const { novelId, name, description, parentBranchId, basedOnSnapshotId } = body;

    if (!novelId?.trim()) {
      return NextResponse.json({ error: "novelId is required" }, { status: 400 });
    }

    const branchName = name?.trim() || "main";

    // Check for duplicate branch name within the same novel
    const existing = await db.branch.findFirst({
      where: {
        novelId: novelId.trim(),
        name: branchName,
        status: "active",
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Branch "${branchName}" already exists and is active` },
        { status: 409 }
      );
    }

    // Validate that basedOnSnapshotId exists if provided
    if (basedOnSnapshotId?.trim()) {
      const snapshot = await db.chapterSnapshot.findUnique({
        where: { id: basedOnSnapshotId.trim() },
      });
      if (!snapshot) {
        return NextResponse.json({ error: "Referenced snapshot not found" }, { status: 400 });
      }
    }

    // Validate that parentBranchId exists if provided
    if (parentBranchId?.trim()) {
      const parent = await db.branch.findUnique({
        where: { id: parentBranchId.trim() },
      });
      if (!parent) {
        return NextResponse.json({ error: "Parent branch not found" }, { status: 400 });
      }
    }

    const branch = await db.branch.create({
      data: {
        novelId: novelId.trim(),
        name: branchName,
        description: description?.trim() || "",
        parentBranchId: parentBranchId?.trim() || null,
        basedOnSnapshotId: basedOnSnapshotId?.trim() || null,
        status: "active",
      },
    });

    return NextResponse.json(branch, { status: 201 });
  } catch (error) {
    console.error("Failed to create branch:", error);
    return NextResponse.json({ error: "Failed to create branch" }, { status: 500 });
  }
}
