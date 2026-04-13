import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const novelId = searchParams.get("novelId");

    const tasks = await db.agentTask.findMany({
      where: novelId ? { novelId } : undefined,
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("Failed to fetch agent tasks:", error);
    return NextResponse.json({ error: "Failed to fetch agent tasks" }, { status: 500 });
  }
}
