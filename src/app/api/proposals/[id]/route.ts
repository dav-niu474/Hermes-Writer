import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Valid status transitions map: currentStatus → [allowed next statuses]
const STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ["validated", "archived"],
  validated: ["in_progress", "draft", "archived"],
  in_progress: ["completed", "validated", "archived"],
  completed: ["archived", "in_progress"],
  archived: ["draft"],
};

// GET /api/proposals/[id] — get a single proposal with its spec deltas
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const proposal = await db.changeProposal.findUnique({
      where: { id },
      include: {
        specDeltas: {
          orderBy: { createdAt: "desc" },
          include: {
            spec: {
              select: { id: true, title: true, category: true, version: true },
            },
          },
        },
      },
    });

    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    return NextResponse.json(proposal);
  } catch (error) {
    console.error("Failed to fetch proposal:", error);
    return NextResponse.json({ error: "Failed to fetch proposal" }, { status: 500 });
  }
}

// PUT /api/proposals/[id] — update proposal fields and transition status
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, description, scope, impact, tasks, status } = body;

    // Verify the proposal exists
    const existing = await db.changeProposal.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    // Validate status transition if status is being changed
    if (status && status !== existing.status) {
      const allowedTransitions = STATUS_TRANSITIONS[existing.status];
      if (!allowedTransitions || !allowedTransitions.includes(status)) {
        return NextResponse.json(
          {
            error: `Invalid status transition from "${existing.status}" to "${status}". Allowed: ${allowedTransitions?.join(", ") || "none"}`,
          },
          { status: 400 }
        );
      }
    }

    // Build the update payload
    const updateData: Record<string, unknown> = {};

    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim() || "";
    if (scope !== undefined) updateData.scope = scope?.trim() || "";
    if (impact !== undefined) updateData.impact = impact?.trim() || "";
    if (tasks !== undefined) {
      updateData.tasks = typeof tasks === "string" ? tasks : JSON.stringify(tasks);
    }

    // Handle status transition with timestamps
    if (status !== undefined && status !== existing.status) {
      updateData.status = status;
      if (status === "completed") {
        updateData.completedAt = new Date();
      }
      if (status === "archived") {
        updateData.archivedAt = new Date();
      }
      // Un-set timestamps if transitioning away
      if (status !== "completed" && existing.completedAt) {
        updateData.completedAt = null;
      }
      if (status !== "archived" && existing.archivedAt) {
        updateData.archivedAt = null;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const proposal = await db.changeProposal.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(proposal);
  } catch (error) {
    console.error("Failed to update proposal:", error);
    return NextResponse.json({ error: "Failed to update proposal" }, { status: 500 });
  }
}

// DELETE /api/proposals/[id] — delete a proposal
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const proposal = await db.changeProposal.findUnique({ where: { id } });
    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    await db.changeProposal.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete proposal:", error);
    return NextResponse.json({ error: "Failed to delete proposal" }, { status: 500 });
  }
}
