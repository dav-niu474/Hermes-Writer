import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const novelId = searchParams.get("novelId");
    const format = searchParams.get("format") || "txt";

    if (!novelId) {
      return NextResponse.json({ error: "novelId is required" }, { status: 400 });
    }

    const novel = await db.novel.findUnique({
      where: { id: novelId },
      include: {
        chapters: { orderBy: { chapterNumber: "asc" } },
      },
    });

    if (!novel) {
      return NextResponse.json({ error: "Novel not found" }, { status: 404 });
    }

    let content = "";
    let filename = "";
    let contentType = "";

    if (format === "md" || format === "markdown") {
      content = `# ${novel.title}\n\n`;
      if (novel.description) content += `> ${novel.description}\n\n`;
      if (novel.genre) content += `**类型：** ${novel.genre}\n\n`;
      content += `---\n\n`;

      for (const ch of novel.chapters) {
        content += `## ${ch.title}\n\n`;
        if (ch.content) content += `${ch.content}\n\n`;
        content += `---\n\n`;
      }
      filename = `${novel.title}.md`;
      contentType = "text/markdown; charset=utf-8";
    } else {
      content = `${novel.title}\n${"=".repeat(novel.title.length * 2)}\n\n`;
      if (novel.description) content += `【简介】${novel.description}\n\n`;
      if (novel.genre) content += `【类型】${novel.genre}\n\n`;
      content += `${"=".repeat(40)}\n\n`;

      for (const ch of novel.chapters) {
        content += `${ch.title}\n${"-".repeat(30)}\n\n`;
        if (ch.content) content += `${ch.content}\n\n`;
        content += `${"=".repeat(40)}\n\n`;
      }
      filename = `${novel.title}.txt`;
      contentType = "text/plain; charset=utf-8";
    }

    // Add BOM for better Chinese encoding support
    const bom = "\uFEFF";

    return new NextResponse(bom + content, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (error) {
    console.error("Export failed:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
