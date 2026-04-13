import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Valid branch status transitions
const BRANCH_STATUS_TRANSITIONS: Record<string, string[]> = {
  active: ["merged", "abandoned"],
  merged: ["active"],
  abandoned: ["active"],
};

// GET /api/branches/[id] — get a single branch
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const branch = await db.branch.findUnique({
      where: { id },
    });

    if (!branch) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }

    return NextResponse.json(branch);
  } catch (error) {
    console.error("Failed to fetch branch:", error);
    return NextResponse.json({ error: "Failed to fetch branch" }, { status: 500 });
  }
}

// PUT /api/branches/[id] — update branch (status transitions like merge/abandon)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, status } = body;

    // Verify the branch exists
    const existing = await db.branch.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }

    // Validate status transition
    if (status && status !== existing.status) {
      const allowed = BRANCH_STATUS_TRANSITIONS[existing.status];
      if (!allowed || !allowed.includes(status)) {
        return NextResponse.json(
          {
            error: `Invalid branch transition from "${existing.status}" to "${status}". Allowed: ${allowed?.join(", ") || "none"}`,
          },
          { status: 400 }
        );
      }
    }

    // Build the update payload
    const updateData: Record<string, unknown> = {};

    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || "";
    if (status !== undefined) updateData.status = status;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const branch = await db.branch.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(branch);
  } catch (error) {
    console.error("Failed to update branch:", error);
    return NextResponse.json({ error: "Failed to update branch" }, { status: 500 });
  }
}

// DELETE /api/branches/[id] — delete a branch
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const branch = await db.branch.findUnique({ where: { id } });
    if (!branch) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }

    // Prevent deleting the main branch
    if (branch.name === "main") {
      return NextResponse.json(
        { error: "Cannot delete the main branch" },
        { status: 400 }
      );
    }

    await db.branch.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete branch:", error);
    return NextResponse.json({ error: "Failed to delete branch" }, { status: 500 });
  }
}
