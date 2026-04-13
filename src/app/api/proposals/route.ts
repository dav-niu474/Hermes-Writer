import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const VALID_STATUSES = ["draft", "validated", "in_progress", "completed", "archived"];

// GET /api/proposals?novelId=xxx&status=xxx — list proposals for a novel
export async function GET(request: Request) {
  try {
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

    const proposals = await db.changeProposal.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: {
        _count: {
          select: { specDeltas: true },
        },
      },
    });

    return NextResponse.json(proposals);
  } catch (error) {
    console.error("Failed to fetch proposals:", error);
    return NextResponse.json({ error: "Failed to fetch proposals" }, { status: 500 });
  }
}

// POST /api/proposals — create a new change proposal
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { novelId, title, description, scope, impact, tasks } = body;

    if (!novelId?.trim()) {
      return NextResponse.json({ error: "novelId is required" }, { status: 400 });
    }

    if (!title?.trim()) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    const proposal = await db.changeProposal.create({
      data: {
        novelId: novelId.trim(),
        title: title.trim(),
        description: description?.trim() || "",
        scope: scope?.trim() || "",
        impact: impact?.trim() || "",
        tasks: typeof tasks === "string" ? tasks : JSON.stringify(tasks || []),
        status: "draft",
      },
    });

    return NextResponse.json(proposal, { status: 201 });
  } catch (error) {
    console.error("Failed to create proposal:", error);
    return NextResponse.json({ error: "Failed to create proposal" }, { status: 500 });
  }
}
