import { NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import { db } from "@/lib/db";
import type { AgentType } from "@/lib/types";

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
请根据提供的大纲和上下文，撰写高质量的章节内容。注意保持与已有内容的一致性。`,

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
5. 给出质量评分
请对提供的内容进行全面评审，给出详细的评价和建议。`,
};

async function getZAI() {
  return await ZAI.create();
}

function buildContextPrompt(agentType: AgentType, novelInfo: { title?: string; genre?: string; description?: string; chapterContent?: string; characters?: string[] }, userMessage: string): string {
  let context = "";
  
  if (novelInfo.title) context += `小说标题：《${novelInfo.title}》\n`;
  if (novelInfo.genre) context += `类型：${novelInfo.genre}\n`;
  if (novelInfo.description) context += `简介：${novelInfo.description}\n`;
  if (novelInfo.characters?.length) context += `\n主要角色：\n${novelInfo.characters.join("\n")}\n`;
  if (novelInfo.chapterContent) context += `\n当前章节内容：\n${novelInfo.chapterContent}\n`;

  return `${context}\n\n用户指令：${userMessage}`;
}

export async function POST(request: Request) {
  try {
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
    } = body;

    if (!agentType || !message) {
      return NextResponse.json({ error: "agentType and message are required" }, { status: 400 });
    }

    // Create agent task record
    const agentTask = await db.agentTask.create({
      data: {
        novelId: novelId || "default",
        chapterId: chapterId || null,
        agentType: agentType as AgentType,
        status: "running",
        input: message,
      },
    });

    try {
      const zai = await getZAI();
      const systemPrompt = AGENT_SYSTEM_PROMPTS[agentType as AgentType] || AGENT_SYSTEM_PROMPTS.hermes;
      const contextPrompt = buildContextPrompt(
        agentType as AgentType,
        {
          title: novelTitle,
          genre: novelGenre,
          description: novelDescription,
          chapterContent,
          characters,
        },
        message
      );

      const completion = await zai.chat.completions.create({
        messages: [
          { role: "assistant", content: systemPrompt },
          { role: "user", content: contextPrompt },
        ],
        thinking: { type: "disabled" },
      });

      const output = completion.choices[0]?.message?.content || "抱歉，生成失败，请重试。";

      // Update task record
      await db.agentTask.update({
        where: { id: agentTask.id },
        data: { status: "completed", output },
      });

      return NextResponse.json({
        taskId: agentTask.id,
        agentType,
        status: "completed",
        output,
      });
    } catch (aiError) {
      const errorMsg = aiError instanceof Error ? aiError.message : "Unknown error";
      
      // Update task record as failed
      await db.agentTask.update({
        where: { id: agentTask.id },
        data: { status: "failed", errorMessage: errorMsg },
      });

      return NextResponse.json({
        taskId: agentTask.id,
        agentType,
        status: "failed",
        error: errorMsg,
      }, { status: 500 });
    }
  } catch (error) {
    console.error("Agent generation error:", error);
    return NextResponse.json({ error: "Failed to process agent request" }, { status: 500 });
  }
}
