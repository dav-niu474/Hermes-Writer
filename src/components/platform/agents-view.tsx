"use client";

import { useState } from "react";
import { AGENT_DEFINITIONS, AVAILABLE_MODELS } from "@/lib/types";
import type { AgentType, AgentTaskStatus } from "@/lib/types";
import { useAppStore } from "@/lib/store";
import { AgentConfigDialog } from "@/components/platform/agent-config-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bot,
  Wand2,
  Map,
  PenTool,
  SpellCheck,
  Users,
  Globe,
  ClipboardCheck,
  ArrowRight,
  Zap,
  Workflow,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  Settings2,
  Thermometer,
} from "lucide-react";
import { cn } from "@/lib/utils";

const AGENT_ICONS: Record<AgentType, React.ReactNode> = {
  hermes: <Wand2 className="size-5" />,
  planner: <Map className="size-5" />,
  writer: <PenTool className="size-5" />,
  editor: <SpellCheck className="size-5" />,
  character: <Users className="size-5" />,
  worldbuilder: <Globe className="size-5" />,
  reviewer: <ClipboardCheck className="size-5" />,
};

const AGENT_COLORS: Record<AgentType, string> = {
  hermes: "from-amber-400 to-orange-500",
  planner: "from-emerald-400 to-green-500",
  writer: "from-violet-400 to-purple-500",
  editor: "from-sky-400 to-blue-500",
  character: "from-rose-400 to-pink-500",
  worldbuilder: "from-orange-400 to-amber-500",
  reviewer: "from-teal-400 to-cyan-500",
};

const AGENT_BG_COLORS: Record<AgentType, string> = {
  hermes: "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40",
  planner: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40",
  writer: "bg-violet-50 dark:bg-violet-950/20 border-violet-200 dark:border-violet-800/40",
  editor: "bg-sky-50 dark:bg-sky-950/20 border-sky-200 dark:border-sky-800/40",
  character: "bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/40",
  worldbuilder: "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800/40",
  reviewer: "bg-teal-50 dark:bg-teal-950/20 border-teal-200 dark:border-teal-800/40",
};

const AGENT_TEXT_COLORS: Record<AgentType, string> = {
  hermes: "text-amber-600 dark:text-amber-400",
  planner: "text-emerald-600 dark:text-emerald-400",
  writer: "text-violet-600 dark:text-violet-400",
  editor: "text-sky-600 dark:text-sky-400",
  character: "text-rose-600 dark:text-rose-400",
  worldbuilder: "text-orange-600 dark:text-orange-400",
  reviewer: "text-teal-600 dark:text-teal-400",
};

const PIPELINE_STEPS = [
  { from: "hermes", to: "planner", label: "需求分析" },
  { from: "planner", to: "worldbuilder", label: "世界观设计" },
  { from: "planner", to: "character", label: "角色设计" },
  { from: "planner", to: "writer", label: "内容创作" },
  { from: "writer", to: "editor", label: "文字编辑" },
  { from: "editor", to: "reviewer", label: "质量审核" },
];

export function AgentsView() {
  const { agentConfigs } = useAppStore();
  const [configAgentType, setConfigAgentType] = useState<AgentType | null>(null);
  const [configOpen, setConfigOpen] = useState(false);

  const openConfig = (type: AgentType) => {
    setConfigAgentType(type);
    setConfigOpen(true);
  };

  return (
    <div className="flex flex-col gap-6 p-6 overflow-auto max-h-[calc(100vh-2rem)]">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center justify-center size-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg">
            <Bot className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Hermes Agent 系统</h1>
            <p className="text-sm text-muted-foreground">多智能体协同创作引擎</p>
          </div>
        </div>
      </div>

      {/* Architecture Overview */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Workflow className="size-5 text-amber-500" />
            <CardTitle className="text-lg">系统架构</CardTitle>
          </div>
          <CardDescription>
            Hermes Agent 采用分层多智能体架构，通过 Hermes 主控 Agent 编排各个专业 Agent 的协同工作
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {AGENT_DEFINITIONS.map((agent, i) => (
              <div
                key={agent.type}
                className={cn(
                  "relative rounded-xl border p-3 flex flex-col items-center text-center transition-all hover:scale-105 cursor-pointer",
                  AGENT_BG_COLORS[agent.type]
                )}
                onClick={() => openConfig(agent.type)}
              >
                <div className={cn("flex items-center justify-center size-10 rounded-lg bg-gradient-to-br text-white mb-2 shadow-md", AGENT_COLORS[agent.type])}>
                  {AGENT_ICONS[agent.type]}
                </div>
                <p className="text-xs font-semibold mb-0.5">{agent.name}</p>
                <p className="text-[10px] text-muted-foreground line-clamp-2">{agent.description}</p>
                {i === 0 && (
                  <Badge className="absolute -top-2 -right-2 text-[9px] px-1.5 bg-amber-500 text-white">
                    核心
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="pipeline" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pipeline">
            <Workflow className="size-4 mr-1.5" />
            创作流水线
          </TabsTrigger>
          <TabsTrigger value="agents">
            <Bot className="size-4 mr-1.5" />
            Agent 详情
          </TabsTrigger>
          <TabsTrigger value="usage">
            <MessageSquare className="size-4 mr-1.5" />
            使用指南
          </TabsTrigger>
        </TabsList>

        {/* Pipeline Tab */}
        <TabsContent value="pipeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="size-4 text-amber-500" />
                全流程创作流水线
              </CardTitle>
              <CardDescription>
                从创意到成稿的完整创作流程，每个环节由专业 Agent 负责
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { step: 1, agent: "hermes", title: "需求接收与分析", desc: "Hermes 主控 Agent 分析用户的创作需求，制定创作计划，分配任务给各个专业 Agent" },
                  { step: 2, agent: "planner", title: "剧情策划与大纲生成", desc: "剧情策划师根据需求生成故事大纲、章节规划和情节走向" },
                  { step: 3, agent: "worldbuilder", title: "世界观构建", desc: "世界观构建师设计故事的世界体系、规则、历史和文化背景" },
                  { step: 4, agent: "character", title: "角色创建与管理", desc: "角色管家创建角色设定，设计人物关系网络和成长弧线" },
                  { step: 5, agent: "writer", title: "内容创作", desc: "内容创作者根据大纲和设定撰写章节内容" },
                  { step: 6, agent: "editor", title: "文字编辑与润色", desc: "文字编辑对创作内容进行润色优化，确保文字质量" },
                  { step: 7, agent: "reviewer", title: "质量审核与反馈", desc: "质量审核员进行全面评审，提供评分和改进建议" },
                ].map((item) => {
                  const agentDef = AGENT_DEFINITIONS.find((a) => a.type === item.agent);
                  return (
                    <div key={item.step} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={cn("flex items-center justify-center size-8 rounded-full bg-gradient-to-br text-white text-xs font-bold shadow-sm", AGENT_COLORS[item.agent as AgentType])}>
                          {item.step}
                        </div>
                        {item.step < 7 && <div className="w-0.5 flex-1 bg-border mt-1" />}
                      </div>
                      <div className="pb-6 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">{agentDef?.name}</Badge>
                          <h4 className="text-sm font-semibold">{item.title}</h4>
                        </div>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Agents Detail Tab */}
        <TabsContent value="agents" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {AGENT_DEFINITIONS.map((agent) => {
              const config = agentConfigs[agent.type];
              const activeSkillsCount = config?.skills.filter((s) => s.enabled).length ?? 0;
              const modelInfo = AVAILABLE_MODELS.find((m) => m.id === config?.preferredModel);
              const modelName = modelInfo?.name ?? "GLM 4.7";

              return (
                <Card key={agent.type} className={cn("border cursor-pointer transition-all hover:shadow-md", AGENT_BG_COLORS[agent.type])} onClick={() => openConfig(agent.type)}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <div className={cn("flex items-center justify-center size-10 rounded-xl bg-gradient-to-br text-white shadow-lg flex-shrink-0", AGENT_COLORS[agent.type])}>
                        {AGENT_ICONS[agent.type]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base">{agent.name}</CardTitle>
                          <Badge variant="outline" className={cn("text-[9px]", AGENT_TEXT_COLORS[agent.type])}>
                            {modelName}
                          </Badge>
                        </div>
                        <CardDescription className="mt-1">{agent.description}</CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-[10px] gap-1 flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          openConfig(agent.type);
                        }}
                      >
                        <Settings2 className="size-3" />
                        配置
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div>
                      <p className="text-xs font-medium mb-2 text-muted-foreground">核心能力</p>
                      <div className="flex flex-wrap gap-1.5">
                        {agent.capabilities.map((cap) => (
                          <Badge key={cap} variant="secondary" className="text-[10px]">
                            {cap}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Separator className="my-3" />
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium mb-1.5 text-muted-foreground">协作关系</p>
                        <div className="flex flex-wrap gap-1.5">
                          {PIPELINE_STEPS.filter(
                            (p) => p.from === agent.type || p.to === agent.type
                          ).map((p, i) => {
                            const otherAgent = p.from === agent.type ? p.to : p.from;
                            const otherDef = AGENT_DEFINITIONS.find((a) => a.type === otherAgent);
                            return (
                              <Badge key={i} variant="outline" className="text-[10px] gap-1">
                                {p.from === agent.type ? "→" : "←"}
                                {otherDef?.name}
                                <span className="text-muted-foreground">({p.label})</span>
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <div className="flex items-center gap-1">
                          <Zap className={cn("size-3", AGENT_TEXT_COLORS[agent.type])} />
                          <span className="text-[10px] font-medium">{activeSkillsCount} 技能</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Thermometer className={cn("size-3", AGENT_TEXT_COLORS[agent.type])} />
                          <span className="text-[10px] font-medium">T {config?.temperature.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Usage Tab */}
        <TabsContent value="usage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">快速上手指南</CardTitle>
              <CardDescription>三步开始使用 Hermes Agent 创作系统</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex gap-4 items-start">
                <div className="flex items-center justify-center size-10 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 flex-shrink-0 font-bold">
                  1
                </div>
                <div>
                  <h4 className="font-semibold text-sm mb-1">创建作品并进入创作空间</h4>
                  <p className="text-xs text-muted-foreground">
                    在「作品管理」中创建新作品，填写标题、类型和简介，然后进入「创作空间」
                  </p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="flex items-center justify-center size-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex-shrink-0 font-bold">
                  2
                </div>
                <div>
                  <h4 className="font-semibold text-sm mb-1">选择 Agent 开始创作</h4>
                  <p className="text-xs text-muted-foreground">
                    点击右侧「AI 助手」打开 Agent 面板，选择对应的 Agent（如剧情策划师、内容创作者等），发送创作指令
                  </p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="flex items-center justify-center size-10 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 flex-shrink-0 font-bold">
                  3
                </div>
                <div>
                  <h4 className="font-semibold text-sm mb-1">多 Agent 协同创作</h4>
                  <p className="text-xs text-muted-foreground">
                    在不同 Agent 之间切换，利用各自的专业能力完成从大纲到成稿的全流程创作。你可以将 Agent 生成的内容采纳到正文中
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Agent 使用技巧</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2">
                {[
                  { agent: "hermes", tip: "先向 Hermes 描述你的整体创作需求，它会帮你制定创作计划" },
                  { agent: "planner", tip: "提供你想要的核心冲突和故事走向，Planner 会生成详细大纲" },
                  { agent: "writer", tip: "将大纲和当前章节内容作为上下文，Writer 能生成更连贯的内容" },
                  { agent: "editor", tip: "对已写好的内容使用 Editor 进行润色，可以显著提升文字质量" },
                  { agent: "character", tip: "在创作过程中定期使用 Character Agent 检查角色行为一致性" },
                  { agent: "worldbuilder", tip: "在开始写作前先用 WorldBuilder 建立世界观，能让后续创作更顺畅" },
                  { agent: "reviewer", tip: "每完成几个章节后使用 Reviewer 进行质量检查，及时发现问题" },
                ].map((item) => {
                  const agentDef = AGENT_DEFINITIONS.find((a) => a.type === item.agent);
                  return (
                    <div key={item.agent} className="flex gap-2 p-3 rounded-lg bg-muted/50">
                      <div className={cn("flex items-center justify-center size-6 rounded-md bg-gradient-to-br text-white flex-shrink-0", AGENT_COLORS[item.agent as AgentType])}>
                        {AGENT_ICONS[item.agent as AgentType]}
                      </div>
                      <div>
                        <p className="text-xs font-medium">{agentDef?.name}</p>
                        <p className="text-[11px] text-muted-foreground">{item.tip}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Agent Config Dialog */}
      <AgentConfigDialog
        agentType={configAgentType}
        open={configOpen}
        onOpenChange={setConfigOpen}
      />
    </div>
  );
}
