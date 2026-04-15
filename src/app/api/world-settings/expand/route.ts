import { NextResponse } from "next/server";
import { db, ensureDbInitialized } from "@/lib/db";
import { generateChat } from "@/lib/ai";

export async function POST(request: Request) {
  try {
    await ensureDbInitialized();
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const setting = await db.worldSetting.findUnique({ where: { id } });
    if (!setting) {
      return NextResponse.json({ error: "Setting not found" }, { status: 404 });
    }

    const messages = [
      {
        role: "system" as const,
        content: `你是一位专业的世界观构建大师，擅长创建详细、自洽、富有想象力的世界设定。
请根据用户提供的设定名称和当前描述，生成一份更加详尽和丰富的世界观设定描述。
要求：
1. 保持与原有设定的一致性
2. 补充具体的细节和背景
3. 增加历史、规则、特征等维度的信息
4. 语言生动，富有文学性
5. 使用 Markdown 格式，包含适当的标题和列表
请直接输出扩展后的设定描述，不要加额外注释。`,
      },
      {
        role: "user" as const,
        content: `设定名称：${setting.name}\n分类：${setting.category}\n当前描述：${setting.description || "（暂无描述）"}\n\n请扩展这个世界观设定。`,
      },
    ];

    const expandedDescription = await generateChat(messages, {
      model: "glm-4-7",
      temperature: 0.8,
      maxTokens: 2048,
    });

    const updated = await db.worldSetting.update({
      where: { id },
      data: { description: expandedDescription },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to expand world setting:", error);
    return NextResponse.json({ error: "Failed to expand world setting" }, { status: 500 });
  }
}
