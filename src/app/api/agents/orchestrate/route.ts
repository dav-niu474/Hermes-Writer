import { NextResponse } from "next/server";
import { generateChat, generateChatStream } from "@/lib/ai";
import { ensureDbInitialized } from "@/lib/db";
import type { AgentType } from "@/lib/types";
import { DEFAULT_AGENT_CONFIGS } from "@/lib/types";

// ===== Orchestration Plan Types =====
interface OrchTask {
  agent: AgentType;
  title: string;
  description: string;
  prompt: string;
}

interface OrchPlan {
  analysis: string;
  tasks: OrchTask[];
}

// Agent type → NovelSpec category mapping
const AGENT_SPEC_CATEGORY: Partial<Record<AgentType, string>> = {
  planner: "outline",
  character: "characters",
  worldbuilder: "worldbuilding",
  editor: "style",
  reviewer: "rules",
};

// Agent type → Spec title prefix mapping
const AGENT_SPEC_TITLE: Partial<Record<AgentType, string>> = {
  planner: "故事大纲",
  character: "角色设定",
  worldbuilder: "世界观设定",
  editor: "编辑风格指南",
  reviewer: "质量规则",
};

// ===== SSE helper =====
function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

// ===== Hermes planning prompt =====
function buildPlanningPrompt(userMessage: string, context: {
  novelTitle?: string;
  novelGenre?: string;
  novelDescription?: string;
  chapterContent?: string;
  characters?: string[];
}): string {
  let ctx = "";
  if (context.novelTitle) ctx += `小说标题：《${context.novelTitle}》\n`;
  if (context.novelGenre) ctx += `类型：${context.novelGenre}\n`;
  if (context.novelDescription) ctx += `简介：${context.novelDescription}\n`;
  if (context.characters?.length) ctx += `\n已有角色：\n${context.characters.join("\n")}\n`;
  if (context.chapterContent) ctx += `\n当前章节内容（前500字）：\n${context.chapterContent.slice(0, 500)}\n`;

  return `你正在协调多个专业 Agent 完成一个网文创作任务。请深入分析用户的需求，制定一个详细的分步执行计划。

## 可用 Agent
- **planner**（剧情策划师）：负责大纲、情节规划、章节设计、伏笔设置
- **worldbuilder**（世界观构建师）：负责世界观、规则体系、文化历史设定
- **character**（角色管家）：负责角色创建、性格分析、关系管理、成长弧线
- **writer**（内容创作者）：负责章节撰写、对话创作、场景描写、续写
- **editor**（文字编辑）：负责文字润色、语法修正、风格统一、节奏优化
- **reviewer**（质量审核员）：负责质量评审、逻辑检查、评分建议

## 当前创作上下文
${ctx || "（暂无上下文，从零开始）"}

## 用户请求
${userMessage}

## 输出要求（非常重要！）
请严格按以下 JSON 格式输出，不要输出任何其他文字或 markdown 标记：
{
  "analysis": "对用户需求的深入分析，包括：理解的核心意图、推荐创作方向、需要关注的要点",
  "tasks": [
    {
      "agent": "agent类型（planner/worldbuilder/character/writer/editor/reviewer）",
      "title": "任务简短标题",
      "description": "任务详细描述（1-2句话）",
      "prompt": "给该Agent的完整执行指令（包含所有需要的上下文和要求）"
    }
  ]
}

### 任务分配原则：
1. 根据用户需求智能选择2-5个最适合的Agent
2. 任务之间有逻辑顺序：先规划再创作，先设定再执行
3. 每个任务的prompt要包含足够的上下文，让Agent独立工作
4. 不要分配hermes自身作为任务
5. 优先选择与需求最相关的Agent`;
}

// ===== Get agent system prompt =====
function getAgentSystemPrompt(agentType: AgentType): string {
  const config = DEFAULT_AGENT_CONFIGS[agentType];
  if (config) {
    return config.systemPrompt + config.skills
      .filter((s) => s.enabled)
      .map((s) => s.prompt)
      .join("");
  }
  return "你是一位专业的网文创作助手。";
}

// ===== Parse raw NVIDIA SSE stream manually to separate reasoning from content =====
async function parseRawSSEStream(
  stream: ReadableStream<Uint8Array>,
  onReasoning: (chunk: string) => void,
  onContent: (chunk: string) => void
): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      // Keep the last (potentially incomplete) line in the buffer
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed === "" || trimmed === "data: [DONE]") continue;
        if (trimmed.startsWith("data: ")) {
          try {
            const json = JSON.parse(trimmed.slice(6));
            const delta = json.choices?.[0]?.delta;
            if (delta?.reasoning_content) {
              onReasoning(delta.reasoning_content);
            }
            if (delta?.content) {
              onContent(delta.content);
            }
          } catch {
            // Skip malformed JSON chunks
          }
        }
      }
    }

    // Process any remaining data in the buffer
    if (buffer.trim()) {
      const trimmed = buffer.trim();
      if (trimmed !== "" && trimmed !== "data: [DONE]" && trimmed.startsWith("data: ")) {
        try {
          const json = JSON.parse(trimmed.slice(6));
          const delta = json.choices?.[0]?.delta;
          if (delta?.reasoning_content) {
            onReasoning(delta.reasoning_content);
          }
          if (delta?.content) {
            onContent(delta.content);
          }
        } catch {
          // Skip malformed JSON
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// ===== Execute a single agent task with streaming (thinking + content separated) =====
async function executeAgentTaskStream(
  agentType: AgentType,
  taskPrompt: string,
  model: string | undefined,
  taskId: number,
  send: (event: string, data: unknown) => void
): Promise<{ output: string; thinking: string }> {
  const systemPrompt = getAgentSystemPrompt(agentType);
  const config = DEFAULT_AGENT_CONFIGS[agentType];
  const messages = [
    { role: "system" as const, content: systemPrompt },
    { role: "user" as const, content: taskPrompt },
  ];

  const genOptions = {
    model: model || config?.preferredModel || "glm-4-7",
    temperature: config?.temperature ?? 0.7,
    maxTokens: config?.maxTokens ?? 4096,
  };

  const streamBody = await generateChatStream(messages, genOptions);

  let fullOutput = "";
  let fullThinking = "";

  await parseRawSSEStream(
    streamBody,
    // onReasoning callback
    (chunk: string) => {
      fullThinking += chunk;
      send("task_thinking", { taskId, content: chunk });
    },
    // onContent callback
    (chunk: string) => {
      fullOutput += chunk;
      send("task_stream", { content: chunk });
    }
  );

  return { output: fullOutput, thinking: fullThinking };
}

// ===== Auto-save agent output to NovelSpec =====
async function saveAgentOutputToSpec(
  dbClient: any,
  novelId: string,
  agentType: AgentType,
  taskTitle: string,
  output: string,
  taskId: number,
  send: (event: string, data: unknown) => void
): Promise<void> {
  const category = AGENT_SPEC_CATEGORY[agentType];
  if (!category) return; // e.g. "writer" has no spec mapping

  const specTitle = AGENT_SPEC_TITLE[agentType] || taskTitle;

  try {
    // Check if a spec with this category already exists for this novel
    const existingSpec = await dbClient.novelSpec.findFirst({
      where: { novelId, category },
    });

    let specId: string;

    if (existingSpec) {
      // Update existing spec (increment version)
      specId = existingSpec.id;
      await dbClient.novelSpec.update({
        where: { id: specId },
        data: {
          content: output,
          version: (existingSpec.version || 1) + 1,
          title: specTitle,
          status: "active",
        },
      });
    } else {
      // Create new spec
      specId = crypto.randomUUID();
      await dbClient.novelSpec.create({
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

    send("content_saved", {
      taskId,
      agent: agentType,
      type: "spec",
      category,
      title: specTitle,
      specId,
    });
  } catch (err) {
    console.error(`[orchestrate] Failed to save spec for ${agentType}:`, err);
    // Non-fatal: continue orchestration even if spec save fails
  }
}

// ===== Auto-create branch =====
async function autoCreateBranch(
  dbClient: any,
  novelId: string,
  send: (event: string, data: unknown) => void
): Promise<string | null> {
  try {
    const shortTimestamp = Date.now().toString(36);
    const branchName = `hermes-${shortTimestamp}`;
    const branchId = crypto.randomUUID();

    const branch = await dbClient.branch.create({
      data: {
        id: branchId,
        novelId,
        name: branchName,
        description: "Hermes 编排自动创建的分支",
        status: "active",
      },
    });

    const createdBranchId = branch?.id || branchId;

    send("branch_created", {
      branchId: createdBranchId,
      name: branchName,
    });

    return createdBranchId;
  } catch (err) {
    console.error("[orchestrate] Failed to auto-create branch:", err);
    return null;
  }
}

// ===== Auto-create Change Proposal =====
async function autoCreateProposal(
  dbClient: any,
  novelId: string,
  userMessage: string,
  plan: OrchPlan,
  send: (event: string, data: unknown) => void
): Promise<void> {
  try {
    const proposalId = crypto.randomUUID();
    const title = `Hermes编排: ${userMessage.slice(0, 50)}${userMessage.length > 50 ? "..." : ""}`;

    const scopeDescription = plan.tasks
      .map((t) => `${t.agent}(${t.title})`)
      .join("、");

    await dbClient.changeProposal.create({
      data: {
        id: proposalId,
        novelId,
        title,
        description: plan.analysis,
        scope: scopeDescription,
        impact: "medium",
        tasks: JSON.stringify(
          plan.tasks.map((t) => ({
            agent: t.agent,
            title: t.title,
            description: t.description,
          }))
        ),
        status: "completed",
        completedAt: new Date().toISOString(),
      },
    });

    send("proposal_created", {
      proposalId,
      title,
    });
  } catch (err) {
    console.error("[orchestrate] Failed to auto-create proposal:", err);
    // Non-fatal: continue even if proposal creation fails
  }
}

// ===== POST /api/agents/orchestrate =====
export async function POST(request: Request) {
  try {
    // Try to init DB (non-fatal — AI works without DB)
    await ensureDbInitialized().catch(() => {});

    // Dynamic import db to get the real instance
    let dbClient: any = null;
    try {
      const dbModule = await import("@/lib/db");
      dbClient = dbModule.db;
    } catch {
      dbClient = null;
    }

    const body = await request.json();
    const {
      message,
      novelId,
      chapterId,
      novelTitle,
      novelGenre,
      novelDescription,
      chapterContent,
      characters,
      model,
    } = body;

    if (!message) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    // Create SSE stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (event: string, data: unknown) => {
          controller.enqueue(encoder.encode(sseEvent(event, data)));
        };

        try {
          // ===== Phase 1: Planning =====
          send("phase", { phase: "planning", message: "Hermes 正在分析需求并制定执行计划..." });

          const planningPrompt = buildPlanningPrompt(message, {
            novelTitle,
            novelGenre,
            novelDescription,
            chapterContent,
            characters,
          });

          const planOutput = await generateChat(
            [
              {
                role: "system",
                content: "你是 Hermes 主控 Agent，负责分析创作需求并制定执行计划。你只输出 JSON，不输出其他内容。",
              },
              { role: "user", content: planningPrompt },
            ],
            { model: model || "glm-4-7", temperature: 0.3, maxTokens: 4096 }
          );

          // Parse the plan (handle markdown code block wrapping)
          let planJson = planOutput.trim();
          const jsonMatch = planJson.match(/```(?:json)?\s*([\s\S]*?)```/);
          if (jsonMatch) {
            planJson = jsonMatch[1].trim();
          }

          let plan: OrchPlan;
          try {
            plan = JSON.parse(planJson);
          } catch {
            // If parsing fails, create a simple single-task plan
            plan = {
              analysis: planOutput.slice(0, 300),
              tasks: [
                {
                  agent: "planner",
                  title: "分析创作需求",
                  description: "Hermes 分析结果",
                  prompt: `请根据以下分析，帮助用户完成创作需求：\n\n${planOutput}`,
                },
              ],
            };
          }

          // Validate and filter tasks
          const validAgents: AgentType[] = ["planner", "writer", "editor", "character", "worldbuilder", "reviewer"];
          plan.tasks = (plan.tasks || []).filter(
            (t) => t.agent && t.title && t.prompt && validAgents.includes(t.agent as AgentType)
          );

          if (plan.tasks.length === 0) {
            plan.tasks = [
              {
                agent: "planner",
                title: "制定创作计划",
                description: "根据用户需求制定创作方案",
                prompt: message,
              },
            ];
          }

          send("plan", {
            analysis: plan.analysis,
            tasks: plan.tasks.map((t, i) => ({
              id: i,
              agent: t.agent,
              title: t.title,
              description: t.description,
            })),
          });

          // ===== Auto-Create Branch (after planning, if novelId provided) =====
          let branchId: string | null = null;
          if (novelId && dbClient) {
            branchId = await autoCreateBranch(dbClient, novelId, send);
          }

          // ===== Phase 2: Execute Tasks =====
          const taskResults: { agent: string; title: string; output: string; thinking: string }[] = [];

          for (let i = 0; i < plan.tasks.length; i++) {
            const task = plan.tasks[i];
            send("phase", {
              phase: "executing",
              currentTask: i + 1,
              totalTasks: plan.tasks.length,
            });
            send("task_start", {
              taskId: i,
              agent: task.agent,
              title: task.title,
              description: task.description,
            });

            try {
              const { output, thinking } = await executeAgentTaskStream(
                task.agent as AgentType,
                task.prompt,
                model,
                i,
                send
              );

              taskResults.push({ agent: task.agent, title: task.title, output, thinking });
              send("task_complete", { taskId: i, agent: task.agent, title: task.title, success: true });

              // ===== Auto-Save Agent Output to Spec (if novelId and dbClient provided) =====
              if (novelId && dbClient && output) {
                await saveAgentOutputToSpec(dbClient, novelId, task.agent as AgentType, task.title, output, i, send);
              }
            } catch (taskErr) {
              const errMsg = taskErr instanceof Error ? taskErr.message : "Unknown error";
              send("task_complete", { taskId: i, agent: task.agent, title: task.title, success: false, error: errMsg });
            }
          }

          // ===== Auto-Create Change Proposal (after all tasks, if novelId and dbClient provided) =====
          if (novelId && dbClient) {
            await autoCreateProposal(dbClient, novelId, message, plan, send);
          }

          // ===== Phase 3: Summary =====
          send("phase", { phase: "summarizing", message: "Hermes 正在汇总各 Agent 的工作成果..." });

          const summaryPrompt = `你已完成了一次多Agent协同创作任务的协调。请汇总各Agent的工作成果，给出简洁的总结和后续建议。

## 各Agent执行结果
${taskResults.map((r, i) => `### ${i + 1}. ${r.title} (${r.agent})\n${r.output.slice(0, 1000)}...`).join("\n\n")}

## 用户原始需求
${message}

请输出：
1. 📋 任务完成总结（已完成的工作、主要产出物）
2. ⭐ 关键成果亮点（最值得关注的2-3个成果）
3. 🎯 后续建议（接下来可以做什么）`;

          const summaryStream = await generateChatStream(
            [
              {
                role: "system",
                content: "你是 Hermes 主控 Agent，负责汇总和协调。请用清晰简洁的方式总结。",
              },
              { role: "user", content: summaryPrompt },
            ],
            { model: model || "glm-4-7", temperature: 0.4, maxTokens: 2048 }
          );

          let fullSummary = "";
          await parseRawSSEStream(
            summaryStream,
            // Summary reasoning (if any) → also stream as thinking
            (chunk: string) => {
              send("task_thinking", { taskId: -1, content: chunk });
            },
            // Summary content
            (chunk: string) => {
              fullSummary += chunk;
              send("summary_stream", { content: chunk });
            }
          );

          // ===== Done =====
          send("done", {
            status: "completed",
            summary: fullSummary,
            taskCount: plan.tasks.length,
            branchId: branchId || undefined,
            timestamp: new Date().toISOString(),
          });
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : "Unknown error";
          send("error", { message: errorMsg });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Orchestration failed", details: errorMsg }, { status: 500 });
  }
}
