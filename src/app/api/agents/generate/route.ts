import { NextResponse } from "next/server";
import { ensureDbInitialized } from "@/lib/db";
import { generateChat, generateChatStream, createStreamTransformer } from "@/lib/ai";
import type { AgentType } from "@/lib/types";

// Agent type → NovelSpec category mapping
const AGENT_SPEC_CATEGORY: Partial<Record<AgentType, string>> = {
  planner: "outline",
  character: "characters",
  worldbuilder: "worldbuilding",
  editor: "style",
  reviewer: "rules",
};

const AGENT_SPEC_TITLE: Partial<Record<AgentType, string>> = {
  planner: "故事大纲",
  character: "角色设定",
  worldbuilder: "世界观设定",
  editor: "编辑风格指南",
  reviewer: "质量规则",
};

// Auto-save agent output to NovelSpec
async function autoSaveToSpec(
  db: any,
  novelId: string,
  agentType: AgentType,
  output: string,
  specCategory?: string
): Promise<{ specId: string; category: string; title: string } | null> {
  if (!db || !novelId || !output) return null;

  const category = specCategory || AGENT_SPEC_CATEGORY[agentType];
  if (!category) return null;

  const specTitle = AGENT_SPEC_TITLE[agentType] || `${category} 文档`;

  try {
    const existingSpec = await db.novelSpec.findFirst({
      where: { novelId, category },
    });

    let specId: string;
    if (existingSpec) {
      specId = existingSpec.id;
      await db.novelSpec.update({
        where: { id: specId },
        data: {
          content: output,
          version: (existingSpec.version || 1) + 1,
          title: specTitle,
          status: "active",
        },
      });
    } else {
      specId = crypto.randomUUID();
      await db.novelSpec.create({
        data: {
          id: specId,
          novelId,
          category,
          title: specTitle,
          content: output,
          version: 1,
          status: "active",
        },
      });
    }

    console.log(`[agent] Auto-saved output to spec: ${specTitle} (v${existingSpec ? (existingSpec.version || 1) + 1 : 1})`);
    return { specId, category, title: specTitle };
  } catch (err) {
    console.warn("[agent] Failed to auto-save to spec:", err);
    return null;
  }
}

const AGENT_SYSTEM_PROMPTS: Record<AgentType, string> = {
  hermes: `你是 Hermes 主控 Agent，是一个网文创作平台的核心编排器。你负责：
1. 分析用户的创作需求
2. 制定创作计划和步骤
3. 协调各个专业 Agent 的工作
4. 确保整体创作质量和一致性
请用结构化的方式回复，包括：创作建议、下一步行动、需要注意的问题。`,

  planner: `你是一位专业的网文剧情策划师，擅长：
1. 设计引人入胜的故事大纲
2. 规划情节走向和叙事结构
3. 设置悬念和伏笔
4. 设计角色成长弧线
5. 平衡故事节奏
请根据提供的信息，给出详细的剧情规划。格式要求使用 Markdown，包含清晰的章节划分。`,

  writer: `你是一位经验丰富的网文作者，擅长：
1. 生动的场景描写
2. 自然的对话创作
3. 情感的细腻表达
4. 紧凑的情节推进
5. 符合网文风格的文字
请根据提供的大纲和上下文，撰写高质量的章节内容。注意保持与已有内容的一致性。直接输出小说正文内容，不要加额外注释。`,

  editor: `你是一位专业的文字编辑，擅长：
1. 文字润色和优化
2. 修正语法和用词问题
3. 统一写作风格
4. 优化句子节奏和韵律
5. 增强文本表现力
请对提供的内容进行编辑，给出改进建议和润色后的版本。`,

  character: `你是一位角色设计专家，擅长：
1. 创建立体丰满的角色形象
2. 设计角色性格特征
3. 规划角色关系网络
4. 确保角色行为一致性
5. 设计角色成长弧线
请根据提供的信息，进行角色分析和建议。`,

  worldbuilder: `你是一位世界观构建大师，擅长：
1. 设计完整的世界体系
2. 构建自洽的世界规则
3. 设计丰富的文化和历史
4. 创建独特的地理和环境设定
5. 确保世界观的内在逻辑性
请根据提供的信息，完善世界观设定。`,

  reviewer: `你是一位资深网文质量审核员，擅长：
1. 全面评估作品质量
2. 发现逻辑漏洞和不合理之处
3. 评估读者体验
4. 提供改进建议
5. 给出质量评分（1-10分）
请对提供的内容进行全面评审，给出详细的评价和建议。使用以下格式：
## 总体评分：X/10
## 优点
- ...
## 不足
- ...
## 改进建议
- ...
## 详细分析
...`,
};

const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_MAX_TOKENS = 4096;

function buildContextPrompt(
  agentType: AgentType,
  novelInfo: {
    title?: string;
    genre?: string;
    description?: string;
    chapterContent?: string;
    characters?: string[];
  },
  userMessage: string,
  memories?: string[]
): string {
  let context = "";

  if (novelInfo.title) context += `小说标题：《${novelInfo.title}》\n`;
  if (novelInfo.genre) context += `类型：${novelInfo.genre}\n`;
  if (novelInfo.description) context += `简介：${novelInfo.description}\n`;
  if (novelInfo.characters?.length) context += `\n主要角色：\n${novelInfo.characters.join("\n")}\n`;
  if (novelInfo.chapterContent) context += `\n当前章节内容：\n${novelInfo.chapterContent}\n`;

  if (memories && memories.length > 0) {
    context += `\n--- Agent 记忆 ---\n`;
    for (const mem of memories) {
      context += `- ${mem}\n`;
    }
    context += `--- 记忆结束 ---\n`;
  }

  return `${context}\n\n用户指令：${userMessage}`;
}

// POST /api/agents/generate — Generation with optional streaming
export async function POST(request: Request) {
  try {
    // Try to init DB (non-fatal — AI works without DB)
    await ensureDbInitialized().catch(() => {});

    // Dynamic import db to get the real instance
    let db: any;
    try {
      const dbModule = await import("@/lib/db");
      db = dbModule.db;
    } catch {
      db = null;
    }

    const body = await request.json();
    const {
      agentType,
      novelId,
      chapterId,
      message,
      novelTitle,
      novelGenre,
      novelDescription,
      chapterContent,
      characters,
      model,
      stream = false,
      systemPrompt: clientSystemPrompt,
      temperature: clientTemperature,
      maxTokens: clientMaxTokens,
      memories,
      specCategory,
    } = body;

    if (!agentType || !message) {
      return NextResponse.json({ error: "agentType and message are required" }, { status: 400 });
    }

    // Create agent task record (optional — skip if no DB or no novelId)
    let agentTask: any = null;
    if (db && novelId) {
      try {
        agentTask = await db.agentTask.create({
          data: {
            novelId,
            chapterId: chapterId || null,
            agentType: agentType as AgentType,
            status: "running",
            input: message,
          },
        });
      } catch (taskErr) {
        console.warn("[agent] Could not create AgentTask record:", taskErr);
      }
    }

    // Use client-sent systemPrompt or fall back to defaults
    const systemPrompt = clientSystemPrompt || AGENT_SYSTEM_PROMPTS[agentType as AgentType] || AGENT_SYSTEM_PROMPTS.hermes;
    const temperature = clientTemperature ?? DEFAULT_TEMPERATURE;
    const maxTokens = clientMaxTokens ?? DEFAULT_MAX_TOKENS;

    const contextPrompt = buildContextPrompt(
      agentType as AgentType,
      {
        title: novelTitle,
        genre: novelGenre,
        description: novelDescription,
        chapterContent,
        characters,
      },
      message,
      memories
    );

    const messages = [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: contextPrompt },
    ];

    const genOptions = { model, temperature, maxTokens };

    // Streaming mode
    if (stream) {
      try {
        const streamBody = await generateChatStream(messages, genOptions);
        const transformer = createStreamTransformer();
        const readableStream = streamBody.pipeThrough(transformer);

        let fullOutput = "";
        const reader = readableStream.getReader();

        const collectedStream = new ReadableStream<string>({
          async start(controller) {
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                fullOutput += value;
                controller.enqueue(value);
              }
              controller.close();

              // Update task record and auto-save to spec (non-critical)
              if (agentTask?.id && db) {
                try {
                  await db.agentTask.update({
                    where: { id: agentTask.id },
                    data: { status: "completed", output: fullOutput },
                  });
                } catch { /* non-critical */ }
              }
              // Auto-save streaming output to spec
              if (novelId && fullOutput) {
                await autoSaveToSpec(db, novelId, agentType as AgentType, fullOutput, specCategory);
              }
            } catch (err) {
              const errorMsg = err instanceof Error ? err.message : "Stream error";
              if (agentTask?.id && db) {
                try {
                  await db.agentTask.update({
                    where: { id: agentTask.id },
                    data: { status: "failed", errorMessage: errorMsg },
                  });
                } catch { /* non-critical */ }
              }
              controller.error(err);
            }
          },
        });

        const encoder = new TextEncoder();
        const byteStream = new ReadableStream<Uint8Array>({
          async start(controller) {
            const textReader = collectedStream.getReader();
            try {
              while (true) {
                const { done, value } = await textReader.read();
                if (done) break;
                controller.enqueue(encoder.encode(value));
              }
              controller.close();
            } catch (err) {
              controller.error(err);
            }
          },
        });

        return new Response(byteStream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      } catch (aiError) {
        const errorMsg = aiError instanceof Error ? aiError.message : "Unknown error";
        console.error("[agent] Stream generation error:", errorMsg);
        return NextResponse.json({ status: "failed", error: errorMsg }, { status: 500 });
      }
    }

    // Non-streaming mode
    try {
      const output = await generateChat(messages, genOptions);

      if (agentTask?.id && db) {
        try {
          await db.agentTask.update({
            where: { id: agentTask.id },
            data: { status: "completed", output },
          });
        } catch { /* non-critical */ }
      }

      // Auto-save to spec if applicable
      let savedSpec = null;
      if (novelId) {
        savedSpec = await autoSaveToSpec(db, novelId, agentType as AgentType, output, specCategory);
      }

      return NextResponse.json({
        taskId: agentTask?.id,
        agentType,
        status: "completed",
        output,
        model: model || "glm-4-7",
        savedSpec,
      });
    } catch (aiError) {
      const errorMsg = aiError instanceof Error ? aiError.message : "Unknown error";
      console.error("[agent] Generation error:", errorMsg);
      return NextResponse.json({ status: "failed", error: errorMsg }, { status: 500 });
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("[agent] Unhandled error:", errorMsg, error);
    return NextResponse.json({ error: "Failed to process agent request", details: errorMsg }, { status: 500 });
  }
}
