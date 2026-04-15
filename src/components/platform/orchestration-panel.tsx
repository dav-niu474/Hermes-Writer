"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { AGENT_DEFINITIONS, type AgentType } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AVAILABLE_MODELS } from "@/lib/ai";
import {
  Bot,
  Wand2,
  Map,
  PenTool,
  SpellCheck,
  Users,
  Globe,
  ClipboardCheck,
  Send,
  XCircle,
  Loader2,
  Sparkles,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Zap,
  ArrowRight,
  Eye,
  EyeOff,
  Copy,
  RotateCcw,
  Lightbulb,
  Brain,
  GitBranch,
  GitCommit,
  Save,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ===== Category Labels for Version Management =====
const CATEGORY_LABELS: Record<string, string> = {
  outline: "大纲",
  characters: "角色设定",
  worldbuilding: "世界观",
  style: "风格指南",
  rules: "规则约束",
};

// ===== Types =====
interface OrchTask {
  id: number;
  agent: AgentType;
  title: string;
  description: string;
  status: "pending" | "running" | "completed" | "failed";
  output: string;
  error?: string;
  streamingContent: string;
  thinking: string;
  streamingThinking: string;
  savedTo: string | null;
}

interface SavedContentEntry {
  taskId: number;
  category: string;
  title: string;
  specId: string;
}

interface OrchState {
  phase: "idle" | "planning" | "executing" | "summarizing" | "completed" | "error";
  analysis: string;
  tasks: OrchTask[];
  summary: string;
  streamingSummary: string;
  errorMessage: string;
  currentTaskIndex: number;
  branchInfo: { id: string; name: string } | null;
  savedContents: SavedContentEntry[];
  proposalInfo: { id: string; title: string } | null;
}

const AGENT_ICONS: Record<AgentType, React.ReactNode> = {
  hermes: <Wand2 className="size-4" />,
  planner: <Map className="size-4" />,
  writer: <PenTool className="size-4" />,
  editor: <SpellCheck className="size-4" />,
  character: <Users className="size-4" />,
  worldbuilder: <Globe className="size-4" />,
  reviewer: <ClipboardCheck className="size-4" />,
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

const AGENT_BG: Record<AgentType, string> = {
  hermes: "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40",
  planner: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40",
  writer: "bg-violet-50 dark:bg-violet-950/20 border-violet-200 dark:border-violet-800/40",
  editor: "bg-sky-50 dark:bg-sky-950/20 border-sky-200 dark:border-sky-800/40",
  character: "bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/40",
  worldbuilder: "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800/40",
  reviewer: "bg-teal-50 dark:bg-teal-950/20 border-teal-200 dark:border-teal-800/40",
};

const AGENT_TEXT: Record<AgentType, string> = {
  hermes: "text-amber-600 dark:text-amber-400",
  planner: "text-emerald-600 dark:text-emerald-400",
  writer: "text-violet-600 dark:text-violet-400",
  editor: "text-sky-600 dark:text-sky-400",
  character: "text-rose-600 dark:text-rose-400",
  worldbuilder: "text-orange-600 dark:text-orange-400",
  reviewer: "text-teal-600 dark:text-teal-400",
};

// ===== Component Props =====
interface OrchestrationPanelProps {
  novelTitle?: string;
  novelGenre?: string;
  novelDescription?: string;
  chapterContent?: string;
  characters?: { name: string; role: string; description: string }[];
  novelId?: string;
  chapterId?: string;
  selectedModel?: string;
  onModelChange?: (model: string) => void;
  onAdoptContent?: (content: string) => void;
}

// ===== Initial State Factory =====
function createInitialOrchState(): OrchState {
  return {
    phase: "idle",
    analysis: "",
    tasks: [],
    summary: "",
    streamingSummary: "",
    errorMessage: "",
    currentTaskIndex: 0,
    branchInfo: null,
    savedContents: [],
    proposalInfo: null,
  };
}

// ===== Main Component =====
export function OrchestrationPanel({
  novelTitle,
  novelGenre,
  novelDescription,
  chapterContent,
  characters,
  novelId,
  chapterId,
  selectedModel: externalModel,
  onModelChange,
  onAdoptContent,
}: OrchestrationPanelProps) {
  const [inputMessage, setInputMessage] = useState("");
  const [model, setModel] = useState(externalModel || "glm-4-7");
  const [orchState, setOrchState] = useState<OrchState>(createInitialOrchState());
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());
  const [collapsedThinking, setCollapsedThinking] = useState<Set<number>>(new Set());
  const [showQuickPrompts, setShowQuickPrompts] = useState(true);

  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isRunning = ["planning", "executing", "summarizing"].includes(orchState.phase);

  // Auto-scroll during execution
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [orchState.tasks, orchState.streamingSummary]);

  // Sync external model
  useEffect(() => {
    if (externalModel) setModel(externalModel);
  }, [externalModel]);

  // Auto-expand thinking section for currently running task, collapse completed
  useEffect(() => {
    setCollapsedThinking((prev) => {
      const next = new Set(prev);
      for (const task of orchState.tasks) {
        if (task.status === "running" && task.streamingThinking) {
          next.delete(task.id);
        }
      }
      return next;
    });
  }, [orchState.tasks]);

  const toggleTaskExpand = (taskId: number) => {
    setExpandedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const toggleThinkingExpand = (taskId: number) => {
    setCollapsedThinking((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  // Parse SSE events from the stream
  const processSSEStream = useCallback(async (reader: ReadableStreamDefaultReader<Uint8Array>) => {
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      let currentEvent = "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("event: ")) {
          currentEvent = trimmed.slice(7);
        } else if (trimmed.startsWith("data: ") && currentEvent) {
          try {
            const data = JSON.parse(trimmed.slice(6));
            handleSSEEvent(currentEvent, data);
          } catch {
            // Skip invalid JSON
          }
          currentEvent = "";
        }
      }
    }
  }, []);

  const handleSSEEvent = useCallback((event: string, data: any) => {
    switch (event) {
      case "phase":
        setOrchState((prev) => ({ ...prev, phase: data.phase }));
        break;

      case "plan":
        setOrchState((prev) => ({
          ...prev,
          analysis: data.analysis || "",
          tasks: (data.tasks || []).map((t: any) => ({
            id: t.id,
            agent: t.agent,
            title: t.title,
            description: t.description || "",
            status: "pending" as const,
            output: "",
            streamingContent: "",
            thinking: "",
            streamingThinking: "",
            savedTo: null,
          })),
        }));
        break;

      case "task_start":
        setOrchState((prev) => ({
          ...prev,
          currentTaskIndex: data.taskId + 1,
          tasks: prev.tasks.map((t) =>
            t.id === data.taskId ? { ...t, status: "running" as const } : t
          ),
        }));
        break;

      case "task_stream":
        setOrchState((prev) => {
          const currentRunning = prev.tasks.findIndex((t) => t.status === "running");
          if (currentRunning === -1) return prev;
          const updatedTasks = [...prev.tasks];
          updatedTasks[currentRunning] = {
            ...updatedTasks[currentRunning],
            streamingContent: updatedTasks[currentRunning].streamingContent + data.content,
          };
          return { ...prev, tasks: updatedTasks };
        });
        break;

      case "task_thinking":
        setOrchState((prev) => {
          const currentRunning = prev.tasks.findIndex((t) => t.status === "running");
          if (currentRunning === -1) return prev;
          const updatedTasks = [...prev.tasks];
          updatedTasks[currentRunning] = {
            ...updatedTasks[currentRunning],
            streamingThinking: updatedTasks[currentRunning].streamingThinking + data.content,
          };
          return { ...prev, tasks: updatedTasks };
        });
        break;

      case "task_complete":
        setOrchState((prev) => ({
          ...prev,
          tasks: prev.tasks.map((t) =>
            t.id === data.taskId
              ? {
                  ...t,
                  status: data.success ? "completed" as const : "failed" as const,
                  output: t.streamingContent || "",
                  streamingContent: "",
                  thinking: t.thinking + t.streamingThinking,
                  streamingThinking: "",
                  error: data.error,
                }
              : t
          ),
        }));
        break;

      case "branch_created":
        setOrchState((prev) => ({
          ...prev,
          branchInfo: { id: data.branchId, name: data.name },
        }));
        break;

      case "content_saved":
        setOrchState((prev) => ({
          ...prev,
          savedContents: [
            ...prev.savedContents,
            {
              taskId: data.taskId,
              category: data.category,
              title: data.title || "",
              specId: data.specId || "",
            },
          ],
          tasks: prev.tasks.map((t) =>
            t.id === data.taskId ? { ...t, savedTo: data.category } : t
          ),
        }));
        break;

      case "proposal_created":
        setOrchState((prev) => ({
          ...prev,
          proposalInfo: { id: data.proposalId, title: data.title },
        }));
        break;

      case "summary_stream":
        setOrchState((prev) => ({
          ...prev,
          streamingSummary: prev.streamingSummary + data.content,
        }));
        break;

      case "done":
        setOrchState((prev) => ({
          ...prev,
          phase: "completed",
          summary: prev.streamingSummary || data.summary || "",
          streamingSummary: "",
          // Finalize any remaining streaming thinking
          tasks: prev.tasks.map((t) =>
            t.streamingThinking
              ? { ...t, thinking: t.thinking + t.streamingThinking, streamingThinking: "" }
              : t
          ),
        }));
        break;

      case "error":
        setOrchState((prev) => ({
          ...prev,
          phase: "error",
          errorMessage: data.message,
        }));
        break;
    }
  }, []);

  const startOrchestration = async () => {
    if (!inputMessage.trim() || isRunning) return;

    // Reset state
    setOrchState({
      ...createInitialOrchState(),
      phase: "planning",
    });
    setExpandedTasks(new Set());
    setCollapsedThinking(new Set());
    setShowQuickPrompts(false);

    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/agents/orchestrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: inputMessage.trim(),
          novelId,
          chapterId,
          novelTitle,
          novelGenre,
          novelDescription,
          chapterContent: chapterContent?.slice(0, 2000),
          characters: characters?.map((c) => `${c.name}(${c.role}): ${c.description}`),
          model,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const errData = await res.json();
        setOrchState((prev) => ({
          ...prev,
          phase: "error",
          errorMessage: errData.error || "Orchestration failed",
        }));
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream reader");

      await processSSEStream(reader);
    } catch (e: any) {
      if (e.name !== "AbortError") {
        setOrchState((prev) => ({
          ...prev,
          phase: "error",
          errorMessage: e.message || "Failed to start orchestration",
        }));
      } else {
        setOrchState((prev) => ({
          ...prev,
          phase: "idle",
        }));
      }
    } finally {
      abortRef.current = null;
    }
  };

  const stopOrchestration = () => {
    abortRef.current?.abort();
  };

  const resetOrchestration = () => {
    setOrchState(createInitialOrchState());
    setExpandedTasks(new Set());
    setCollapsedThinking(new Set());
    setShowQuickPrompts(true);
    setInputMessage("");
    inputRef.current?.focus();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // ===== Quick Prompt Templates =====
  const quickPrompts = [
    { label: "从零开始创作", icon: <Sparkles className="size-3.5" />, prompt: `请帮我从零开始创作一部${novelGenre || "玄幻"}小说。${novelTitle ? `小说名称是《${novelTitle}》` : ""}${novelDescription ? `，核心概念是：${novelDescription}` : ""}。请制定完整的创作计划，包括世界观设定、角色设计、大纲生成和第一章创作。` },
    { label: "生成大纲", icon: <Map className="size-3.5" />, prompt: `请为《${novelTitle || "我的小说"}》生成完整的故事大纲和章节规划。${novelDescription ? `核心概念：${novelDescription}` : ""}` },
    { label: "完善世界观", icon: <Globe className="size-3.5" />, prompt: `请为《${novelTitle || "我的小说"}》设计和完善世界观设定，包括力量体系、地理环境、势力格局和文化背景。${novelDescription ? `核心概念：${novelDescription}` : ""}` },
    { label: "创作新章节", icon: <PenTool className="size-3.5" />, prompt: `请帮我创作《${novelTitle || "我的小说"}》的下一个章节。${chapterContent ? `前文内容参考：${chapterContent.slice(0, 500)}` : "这是第一章。"}` },
    { label: "审核优化", icon: <ClipboardCheck className="size-3.5" />, prompt: `请对《${novelTitle || "我的小说"}》当前的内容进行全面审核和优化。${chapterContent ? `当前章节内容：${chapterContent.slice(0, 1000)}` : ""}` },
    { label: "角色设计", icon: <Users className="size-3.5" />, prompt: `请为《${novelTitle || "我的小说"}》设计核心角色群，包括主角、主要配角和反派。${novelDescription ? `核心概念：${novelDescription}` : ""}` },
  ];

  // ===== Helper: render thinking section for a task =====
  const renderThinkingSection = (task: OrchTask) => {
    const hasThinking = task.thinking || task.streamingThinking;
    if (!hasThinking) return null;

    const isCollapsed = collapsedThinking.has(task.id);
    const isCurrentlyStreaming = task.status === "running" && task.streamingThinking;
    const fullThinkingContent = task.thinking + task.streamingThinking;

    return (
      <div className="ml-14 mt-1.5">
        <button
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors w-full text-left group"
          onClick={(e) => { e.stopPropagation(); toggleThinkingExpand(task.id); }}
        >
          {isCollapsed ? <ChevronRight className="size-3" /> : <ChevronDown className="size-3" />}
          <Lightbulb className="size-3 text-amber-400" />
          <span className="font-medium">思考过程</span>
          {isCollapsed && fullThinkingContent && (
            <span className="text-[9px] text-muted-foreground/60 truncate flex-1 ml-1">
              {fullThinkingContent.slice(0, 60)}...
            </span>
          )}
          {isCurrentlyStreaming && !isCollapsed && (
            <span className="text-[9px] text-amber-500 animate-pulse ml-auto">思考中...</span>
          )}
        </button>
        {!isCollapsed && (
          <div className={cn(
            "mt-1 rounded-lg border p-2.5 max-h-48 overflow-y-auto transition-all",
            "bg-muted/30 border-muted-foreground/10",
            "animate-in fade-in slide-in-from-top-1 duration-200"
          )}>
            <div className="whitespace-pre-wrap text-[11px] leading-relaxed italic text-muted-foreground/80">
              {fullThinkingContent}
              {isCurrentlyStreaming && <span className="animate-pulse text-amber-400">▊</span>}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ===== Helper: render saved-to badge for a task =====
  const renderSavedBadge = (task: OrchTask) => {
    if (!task.savedTo) return null;
    const label = CATEGORY_LABELS[task.savedTo] || task.savedTo;
    return (
      <Badge
        variant="outline"
        className="text-[8px] px-1 py-0 h-4 bg-emerald-50/50 dark:bg-emerald-950/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/30"
      >
        <Save className="size-2.5 mr-0.5" />
        已保存到{label}
      </Badge>
    );
  };

  // ===== Render =====
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-white">
            <Brain className="size-3.5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold leading-tight">Hermes 协同编排</h3>
            <p className="text-[10px] text-muted-foreground">多Agent协同创作引擎</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {orchState.phase !== "idle" && (
            <Button variant="ghost" size="icon" className="size-7" onClick={resetOrchestration}>
              <RotateCcw className="size-3.5" />
            </Button>
          )}
          <Select value={model} onValueChange={(v) => { setModel(v); onModelChange?.(v); }}>
            <SelectTrigger className="h-6 w-[110px] text-[10px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {AVAILABLE_MODELS.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  <span>{m.name}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <ScrollArea className="flex-1" ref={scrollRef}>
          <div className="p-3 space-y-3">
            {/* Idle State: Welcome + Quick Prompts */}
            {orchState.phase === "idle" && (
              <>
                <div className="text-center py-6">
                  <div className="flex items-center justify-center size-14 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 mx-auto mb-3">
                    <Brain className="size-7 text-amber-500" />
                  </div>
                  <h3 className="text-sm font-semibold mb-1">Hermes 协同编排</h3>
                  <p className="text-xs text-muted-foreground max-w-[240px] mx-auto">
                    描述你的创作需求，Hermes 将自动分析并协调多个 Agent 协同完成
                  </p>
                </div>

                {/* Agent Pipeline Preview */}
                <div className="rounded-xl border bg-muted/30 p-3">
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <Zap className="size-3.5 text-amber-500" />
                    <span className="text-[11px] font-semibold">协同流程预览</span>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    {["hermes", "planner", "worldbuilder", "writer", "editor", "reviewer"].map((agent, i, arr) => (
                      <div key={agent} className="flex items-center gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className={cn(
                                "flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium transition-colors",
                                AGENT_BG[agent as AgentType]
                              )}>
                                {AGENT_ICONS[agent as AgentType]}
                                <span>{AGENT_DEFINITIONS.find((a) => a.type === agent)?.name}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-[10px]">{AGENT_DEFINITIONS.find((a) => a.type === agent)?.description}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        {i < arr.length - 1 && <ArrowRight className="size-3 text-muted-foreground flex-shrink-0" />}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick Prompts */}
                {showQuickPrompts && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Lightbulb className="size-3.5 text-amber-500" />
                      <span className="text-[11px] font-semibold">快速指令</span>
                    </div>
                    <div className="grid gap-1.5">
                      {quickPrompts.map((qp, i) => (
                        <button
                          key={i}
                          className="flex items-center gap-2 p-2 rounded-lg border bg-background hover:bg-muted/50 transition-colors text-left group"
                          onClick={() => setInputMessage(qp.prompt)}
                        >
                          <div className="flex items-center justify-center size-7 rounded-md bg-amber-50 dark:bg-amber-900/20 text-amber-600 flex-shrink-0 group-hover:scale-105 transition-transform">
                            {qp.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium">{qp.label}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{qp.prompt.slice(0, 50)}...</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Planning Phase */}
            {orchState.phase === "planning" && (
              <Card className="border-amber-200 dark:border-amber-800/40 bg-amber-50/50 dark:bg-amber-950/10">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-white">
                      <Wand2 className="size-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">Hermes 正在分析需求</p>
                      <p className="text-[10px] text-amber-600/70 dark:text-amber-500/70">理解创作意图，制定执行计划...</p>
                    </div>
                    <Loader2 className="size-4 animate-spin text-amber-500 ml-auto" />
                  </div>
                  <div className="space-y-1">
                    {[1, 2, 3].map((step) => (
                      <div key={step} className="flex items-center gap-2 text-[10px] text-amber-600/60 dark:text-amber-500/50">
                        <Loader2 className="size-2.5 animate-spin" style={{ animationDelay: `${step * 200}ms` }} />
                        <span>
                          {step === 1 ? "分析创作需求..." : step === 2 ? "评估所需 Agent..." : "制定任务计划..."}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Plan Display */}
            {orchState.analysis && orchState.tasks.length > 0 && (
              <Card>
                <CardHeader className="pb-2 pt-3 px-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-500" />
                    <CardTitle className="text-xs">执行计划</CardTitle>
                    <Badge variant="outline" className="text-[9px] ml-auto">{orchState.tasks.length} 个任务</Badge>
                  </div>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  {orchState.analysis && (
                    <div className="mb-2.5 p-2 rounded-lg bg-muted/50 text-[11px] text-muted-foreground leading-relaxed">
                      {orchState.analysis}
                    </div>
                  )}

                  {/* Branch Created Notification */}
                  {orchState.branchInfo && (
                    <div className={cn(
                      "mb-2.5 flex items-center gap-2 p-2 rounded-lg border transition-all",
                      "bg-sky-50/50 dark:bg-sky-950/10 border-sky-200 dark:border-sky-800/30",
                      "animate-in fade-in slide-in-from-top-1 duration-300"
                    )}>
                      <GitBranch className="size-3.5 text-sky-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-medium text-sky-700 dark:text-sky-400">已创建分支</span>
                        <code className="text-[10px] text-sky-600 dark:text-sky-500 ml-1 font-mono truncate">
                          {orchState.branchInfo.name}
                        </code>
                      </div>
                      <Badge variant="outline" className="text-[8px] h-4 px-1 text-sky-500 border-sky-300 dark:border-sky-700">
                        {orchState.branchInfo.id.slice(0, 7)}
                      </Badge>
                    </div>
                  )}

                  {/* Task List with Timeline */}
                  <div className="relative">
                    {orchState.tasks.map((task, i) => (
                      <div key={task.id} className="relative">
                        {/* Timeline connector */}
                        {i > 0 && (
                          <div className="absolute left-[17px] top-0 w-px h-3 bg-gradient-to-b from-muted-foreground/20 to-muted-foreground/5 -translate-y-1.5" />
                        )}

                        {/* Task Card */}
                        <div
                          className={cn(
                            "flex items-center gap-2 p-2 rounded-lg border transition-all animate-in fade-in slide-in-from-bottom-1 duration-300",
                            task.status === "running" && "ring-1 ring-primary/30 bg-primary/5",
                            task.status === "completed" && "bg-emerald-50/50 dark:bg-emerald-950/10",
                            task.status === "failed" && "bg-red-50/50 dark:bg-red-950/10",
                            task.status === "pending" && "opacity-60",
                            AGENT_BG[task.agent]
                          )}
                          style={{ animationDelay: `${i * 60}ms`, animationFillMode: "both" }}
                          onClick={() => (task.status === "completed" || task.status === "running") && toggleTaskExpand(task.id)}
                        >
                          {/* Step Number + Agent Icon */}
                          <div className="flex items-center gap-2 flex-shrink-0 relative">
                            {/* Timeline dot */}
                            <div className={cn(
                              "absolute left-[15px] -bottom-1.5 size-1.5 rounded-full",
                              task.status === "completed" ? "bg-emerald-400" :
                              task.status === "running" ? "bg-primary" :
                              task.status === "failed" ? "bg-red-400" : "bg-muted-foreground/30"
                            )} />
                            <div className={cn(
                              "flex items-center justify-center size-6 rounded-full text-white text-[10px] font-bold",
                              task.status === "completed" ? "bg-emerald-500" : task.status === "running" ? "bg-primary" : task.status === "failed" ? "bg-red-500" : "bg-muted-foreground/30",
                              task.status === "pending" && "bg-gradient-to-br " + AGENT_COLORS[task.agent]
                            )}>
                              {task.status === "completed" ? <CheckCircle2 className="size-3" /> :
                               task.status === "running" ? <Loader2 className="size-3 animate-spin" /> :
                               task.status === "failed" ? <AlertCircle className="size-3" /> : i + 1}
                            </div>
                            <div className={cn("flex items-center justify-center size-5 rounded text-white", "bg-gradient-to-br " + AGENT_COLORS[task.agent])}>
                              {AGENT_ICONS[task.agent]}
                            </div>
                          </div>

                          {/* Task Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Badge variant="outline" className={cn("text-[9px]", AGENT_TEXT[task.agent])}>
                                {AGENT_DEFINITIONS.find((a) => a.type === task.agent)?.name}
                              </Badge>
                              <span className="text-[11px] font-medium truncate">{task.title}</span>
                              {task.status === "running" && task.streamingThinking && (
                                <span className="inline-flex items-center gap-0.5 text-[8px] text-amber-500 animate-pulse">
                                  <Brain className="size-2.5" />思考中
                                </span>
                              )}
                            </div>
                            {task.description && !expandedTasks.has(task.id) && (
                              <p className="text-[9px] text-muted-foreground mt-0.5 truncate">{task.description}</p>
                            )}
                            {task.status === "completed" && task.savedTo && (
                              <div className="mt-1">
                                {renderSavedBadge(task)}
                              </div>
                            )}
                          </div>

                          {/* Status */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {task.status === "completed" && <span className="text-[9px] text-emerald-600 dark:text-emerald-400">完成</span>}
                            {task.status === "failed" && <span className="text-[9px] text-red-600 dark:text-red-400">失败</span>}
                            {task.status === "running" && <span className="text-[9px] text-primary">执行中...</span>}
                            {task.status === "pending" && <span className="text-[9px] text-muted-foreground">等待</span>}
                            {(task.status === "completed" || task.status === "running") && (
                              expandedTasks.has(task.id) ? <ChevronDown className="size-3 text-muted-foreground" /> : <ChevronRight className="size-3 text-muted-foreground" />
                            )}
                          </div>
                        </div>

                        {/* Thinking Section (above output) */}
                        {(expandedTasks.has(task.id) && task.status !== "pending") && renderThinkingSection(task)}

                        {/* Expanded Task Content */}
                        {expandedTasks.has(task.id) && task.status !== "pending" && (
                          <div className="ml-14 mt-1.5 rounded-lg border bg-background p-2.5 max-h-64 overflow-y-auto animate-in fade-in duration-200">
                            {task.status === "running" && task.streamingContent ? (
                              <div className="whitespace-pre-wrap text-[11px] leading-relaxed">
                                {task.streamingContent}<span className="animate-pulse text-primary">▊</span>
                              </div>
                            ) : task.output ? (
                              <>
                                <div className="whitespace-pre-wrap text-[11px] leading-relaxed">{task.output}</div>
                                <div className="flex gap-1 mt-2 pt-2 border-t">
                                  {onAdoptContent && (
                                    <Button variant="ghost" size="sm" className="h-5 text-[9px] px-1.5" onClick={(e) => { e.stopPropagation(); onAdoptContent(task.output); }}>
                                      采纳到正文
                                    </Button>
                                  )}
                                  <Button variant="ghost" size="sm" className="h-5 text-[9px] px-1.5" onClick={() => copyToClipboard(task.output)}>
                                    <Copy className="size-2.5 mr-0.5" />复制
                                  </Button>
                                </div>
                              </>
                            ) : task.error ? (
                              <div className="text-[11px] text-red-500 flex items-center gap-1">
                                <AlertCircle className="size-3" />{task.error}
                              </div>
                            ) : task.status === "running" && !task.streamingContent && !task.streamingThinking ? (
                              <div className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                                <Loader2 className="size-3 animate-spin" />
                                <span>Agent 正在准备输出...</span>
                              </div>
                            ) : null}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Progress Bar (during execution) */}
            {orchState.phase === "executing" && (
              <div className="rounded-lg border bg-muted/30 p-2.5 animate-in fade-in duration-200">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-medium text-muted-foreground">任务进度</span>
                    {orchState.tasks.some((t) => t.status === "running" && t.streamingThinking) && (
                      <span className="inline-flex items-center gap-0.5 text-[8px] text-amber-500">
                        <Brain className="size-2.5 animate-pulse" />Agent 思考中
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {orchState.currentTaskIndex} / {orchState.tasks.length}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-1.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-500 relative"
                    style={{ width: `${(orchState.currentTaskIndex / orchState.tasks.length) * 100}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
                  </div>
                </div>
                {/* Saved contents summary during execution */}
                {orchState.savedContents.length > 0 && (
                  <div className="mt-2 pt-1.5 border-t border-muted-foreground/10">
                    <div className="flex items-center gap-1 flex-wrap">
                      <Save className="size-2.5 text-emerald-500" />
                      <span className="text-[9px] text-muted-foreground">已保存:</span>
                      {orchState.savedContents.map((sc, i) => (
                        <Badge
                          key={`${sc.taskId}-${sc.category}-${i}`}
                          variant="outline"
                          className="text-[8px] px-1 py-0 h-4 bg-emerald-50/50 dark:bg-emerald-950/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/30"
                        >
                          {CATEGORY_LABELS[sc.category] || sc.category}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Summarizing Phase */}
            {orchState.phase === "summarizing" && (
              <Card className="border-amber-200 dark:border-amber-800/40 bg-amber-50/50 dark:bg-amber-950/10">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <Wand2 className="size-4 text-amber-500" />
                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Hermes 正在汇总工作成果</span>
                    <Loader2 className="size-3.5 animate-spin text-amber-500 ml-auto" />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Summary */}
            {(orchState.streamingSummary || orchState.summary) && (
              <Card>
                <CardHeader className="pb-2 pt-3 px-3">
                  <div className="flex items-center gap-2">
                    <Wand2 className="size-4 text-amber-500" />
                    <CardTitle className="text-xs">Hermes 创作总结</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <div className="whitespace-pre-wrap text-[11px] leading-relaxed">
                    {orchState.streamingSummary || orchState.summary}
                    {orchState.phase === "summarizing" && <span className="animate-pulse text-primary">▊</span>}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Error State */}
            {orchState.phase === "error" && (
              <Card className="border-red-200 dark:border-red-800/40 bg-red-50/50 dark:bg-red-950/10">
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="size-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-red-700 dark:text-red-400">编排出错</p>
                      <p className="text-[11px] text-red-600/80 dark:text-red-400/80 mt-0.5">{orchState.errorMessage}</p>
                      <Button variant="outline" size="sm" className="h-6 text-[10px] mt-2" onClick={resetOrchestration}>
                        <RotateCcw className="size-3 mr-1" />重新开始
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Completed State */}
            {orchState.phase === "completed" && (
              <>
                <Card className="border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/50 dark:bg-emerald-950/10">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="size-4 text-emerald-500" />
                      <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">编排完成</span>
                      <span className="text-[10px] text-emerald-600/60 dark:text-emerald-400/60 ml-auto">
                        {orchState.tasks.filter((t) => t.status === "completed").length}/{orchState.tasks.length} 任务成功
                      </span>
                    </div>
                    <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={resetOrchestration}>
                      <RotateCcw className="size-3 mr-1" />开始新的创作
                    </Button>
                  </CardContent>
                </Card>

                {/* Proposal Created Notification */}
                {orchState.proposalInfo && (
                  <div className={cn(
                    "flex items-center gap-2.5 p-3 rounded-lg border transition-all",
                    "bg-violet-50/50 dark:bg-violet-950/10 border-violet-200 dark:border-violet-800/30",
                    "animate-in fade-in slide-in-from-bottom-1 duration-300"
                  )}>
                    <div className="flex items-center justify-center size-8 rounded-lg bg-gradient-to-br from-violet-400 to-purple-500 text-white flex-shrink-0">
                      <GitCommit className="size-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-medium text-violet-700 dark:text-violet-400">变更提案已创建</span>
                      <p className="text-[11px] text-violet-600 dark:text-violet-500 font-medium truncate">
                        {orchState.proposalInfo.title}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[8px] h-4 px-1 text-violet-500 border-violet-300 dark:border-violet-700 flex-shrink-0">
                      {orchState.proposalInfo.id.slice(0, 7)}
                    </Badge>
                  </div>
                )}

                {/* Branch Info (if not shown earlier) */}
                {orchState.branchInfo && !orchState.analysis && (
                  <div className={cn(
                    "flex items-center gap-2 p-2.5 rounded-lg border",
                    "bg-sky-50/50 dark:bg-sky-950/10 border-sky-200 dark:border-sky-800/30"
                  )}>
                    <GitBranch className="size-3.5 text-sky-500 flex-shrink-0" />
                    <span className="text-[10px] text-sky-600 dark:text-sky-400">已创建分支</span>
                    <code className="text-[10px] text-sky-600 dark:text-sky-500 font-mono">{orchState.branchInfo.name}</code>
                  </div>
                )}

                {/* Saved Contents Summary in Completed State */}
                {orchState.savedContents.length > 0 && (
                  <div className={cn(
                    "rounded-lg border p-2.5",
                    "bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-800/30",
                    "animate-in fade-in slide-in-from-bottom-1 duration-300"
                  )}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Save className="size-3 text-emerald-500" />
                      <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">内容已保存到规范库</span>
                    </div>
                    <div className="flex items-center gap-1 flex-wrap">
                      {orchState.savedContents.map((sc, i) => (
                        <div
                          key={`${sc.taskId}-${sc.category}-${i}`}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] bg-emerald-100/50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"
                        >
                          <Save className="size-2.5" />
                          <span>{CATEGORY_LABELS[sc.category] || sc.category}</span>
                          {sc.title && <span className="text-emerald-500/60">· {sc.title}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="p-2 border-t flex-shrink-0">
          {/* User Message Display (during execution) */}
          {isRunning && inputMessage && (
            <div className="mb-2 p-2 rounded-lg bg-primary/10 text-[11px]">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="font-medium text-primary">你的需求</span>
              </div>
              <p className="text-muted-foreground whitespace-pre-wrap">{inputMessage}</p>
            </div>
          )}
          <div className="flex gap-1.5">
            <Textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="描述你的创作需求，Hermes 将自动编排多个 Agent 协同完成..."
              className="min-h-[44px] max-h-[100px] resize-none text-xs"
              rows={2}
              disabled={isRunning}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  startOrchestration();
                }
              }}
            />
            <div className="flex flex-col gap-1">
              {isRunning ? (
                <Button size="icon" className="self-end size-8 bg-destructive text-white hover:bg-destructive/90" onClick={stopOrchestration}>
                  <XCircle className="size-3.5" />
                </Button>
              ) : (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="icon" className="self-end size-8" onClick={startOrchestration} disabled={!inputMessage.trim()}>
                        <Send className="size-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p className="text-[10px]">开始编排 (Ctrl+Enter)</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between mt-0.5">
            <p className="text-[9px] text-muted-foreground">
              Ctrl+Enter 开始编排 · Hermes 将自动分配任务给各 Agent
            </p>
            <p className="text-[9px] text-muted-foreground">{AVAILABLE_MODELS.find((m) => m.id === model)?.name}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
