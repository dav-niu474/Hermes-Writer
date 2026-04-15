"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  BookOpen,
  Users,
  Globe,
  Map,
  FileText,
  Wand2,
  ChevronRight,
  Lightbulb,
  PartyPopper,
  Rocket,
  Eye,
} from "lucide-react";

// ===== Props =====
interface StoryWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  novelId?: string;
  onComplete?: () => void;
}

// ===== Constants =====
const GENRES = ["奇幻", "玄幻", "科幻", "都市", "武侠", "言情", "悬疑", "历史"] as const;
const TONES = ["轻松", "史诗", "暗黑", "幽默", "温馨"] as const;
const LENGTHS = [
  { key: "short", label: "短篇", desc: "3-5章", detail: "~1万字" },
  { key: "medium", label: "中篇", desc: "10-20章", detail: "~5万字" },
  { key: "long", label: "长篇", desc: "30+章", detail: "~15万字" },
] as const;
const PERSPECTIVES = ["第一人称", "第三人称全知", "第三人称有限"] as const;

const EXAMPLE_IDEAS = [
  "一个被遗忘的魔法学院里，最后一个学生发现了古老的秘密",
  "赛博朋克世界中，一个黑客意外觉醒了AI的意识",
  "修仙世界中，一个废材少年偶得上古传承",
];

const GENERATION_STEPS = [
  { label: "分析故事构思", icon: Lightbulb },
  { label: "生成角色设定", icon: Users },
  { label: "构建世界观", icon: Globe },
  { label: "撰写大纲", icon: Map },
  { label: "生成前3章", icon: FileText },
] as const;

type WizardStep = 1 | 2 | 3 | 4;

interface GenerationState {
  phase: "idle" | "planning" | "executing" | "completed" | "error";
  currentStep: number;
  progress: number;
  errorMessage: string;
  stats: { characters: number; chapters: number; outlineWords: number };
}

const TOTAL_STEPS = GENERATION_STEPS.length;

// ===== Main Component =====
export function StoryWizard({
  open,
  onOpenChange,
  novelId,
  onComplete,
}: StoryWizardProps) {
  const [step, setStep] = useState<WizardStep>(1);

  // Step 1: Story Idea
  const [userIdea, setUserIdea] = useState("");

  // Step 2: Preferences
  const [genre, setGenre] = useState<string>("");
  const [tone, setTone] = useState<string>("");
  const [targetLength, setTargetLength] = useState<string>("medium");
  const [perspective, setPerspective] = useState<string>("第三人称有限");

  // Step 3: Generation
  const [genState, setGenState] = useState<GenerationState>({
    phase: "idle",
    currentStep: 0,
    progress: 0,
    errorMessage: "",
    stats: { characters: 0, chapters: 0, outlineWords: 0 },
  });

  const abortRef = useRef<AbortController | null>(null);

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      abortRef.current?.abort();
      const timer = setTimeout(() => {
        setStep(1);
        setUserIdea("");
        setGenre("");
        setTone("");
        setTargetLength("medium");
        setPerspective("第三人称有限");
        setGenState({
          phase: "idle",
          currentStep: 0,
          progress: 0,
          errorMessage: "",
          stats: { characters: 0, chapters: 0, outlineWords: 0 },
        });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Auto-transition from step 3 to step 4 when generation completes
  useEffect(() => {
    if (step === 3 && genState.phase === "completed") {
      const timer = setTimeout(() => setStep(4), 600);
      return () => clearTimeout(timer);
    }
  }, [step, genState.phase]);

  // ===== SSE Streaming =====
  const processSSEStream = useCallback(
    async (reader: ReadableStreamDefaultReader<Uint8Array>) => {
      const decoder = new TextDecoder();
      let buffer = "";
      // Mutable refs for tracking stats during streaming
      let detectedCharacters = 0;
      let detectedChapters = 0;
      let detectedWords = 0;

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

              switch (currentEvent) {
                case "phase":
                  setGenState((prev) => ({
                    ...prev,
                    phase: (data.phase as string) as GenerationState["phase"],
                  }));
                  break;

                case "plan":
                  setGenState((prev) => ({
                    ...prev,
                    phase: "executing",
                    currentStep: 0,
                  }));
                  break;

                case "task_start": {
                  const taskId = (data.taskId as number) + 1;
                  setGenState((prev) => ({
                    ...prev,
                    currentStep: taskId,
                    progress: (taskId / TOTAL_STEPS) * 100,
                  }));
                  break;
                }

                case "task_stream": {
                  const content = data.content as string;
                  if (content) {
                    // Count Chinese characters for word count
                    const chars = (content.match(/[\u4e00-\u9fff]/g) || []).length;
                    detectedWords += chars;
                    setGenState((prev) => ({
                      ...prev,
                      stats: {
                        ...prev.stats,
                        outlineWords: detectedWords,
                      },
                    }));
                  }
                  break;
                }

                case "task_complete": {
                  const completed = (data.taskId as number) + 1;
                  setGenState((prev) => ({
                    ...prev,
                    currentStep: completed,
                    progress: (completed / TOTAL_STEPS) * 100,
                  }));
                  // Extract stats from task output
                  const output = data.output as string;
                  if (output) {
                    const charMatch = output.match(/(\d+)\s*(?:个)?角色/);
                    if (charMatch) {
                      detectedCharacters = Math.max(
                        detectedCharacters,
                        parseInt(charMatch[1], 10)
                      );
                    }
                    const chapters = (output.match(/第[一二三四五1-5]章/g) || []).length;
                    if (chapters > detectedChapters) {
                      detectedChapters = chapters;
                    }
                    setGenState((prev) => ({
                      ...prev,
                      stats: {
                        characters: detectedCharacters || prev.stats.characters,
                        chapters: detectedChapters || prev.stats.chapters,
                        outlineWords: detectedWords || prev.stats.outlineWords,
                      },
                    }));
                  }
                  break;
                }

                case "done":
                  setGenState((prev) => ({
                    ...prev,
                    phase: "completed",
                    progress: 100,
                    currentStep: TOTAL_STEPS,
                    stats: {
                      characters: detectedCharacters || 4,
                      chapters: detectedChapters || 3,
                      outlineWords: detectedWords || 15000,
                    },
                  }));
                  break;

                case "error":
                  setGenState((prev) => ({
                    ...prev,
                    phase: "error",
                    errorMessage:
                      (data.message as string) || "生成失败，请重试",
                  }));
                  break;
              }
            } catch {
              // Skip invalid JSON
            }
            currentEvent = "";
          }
        }
      }
    },
    []
  );

  // ===== Start Generation =====
  const startGeneration = useCallback(async () => {
    const lengthInfo = LENGTHS.find((l) => l.key === targetLength);
    const comprehensivePrompt = `你是一位专业网文作家。请根据以下要求创作一部小说：

故事构思：${userIdea}
类型：${genre}
基调：${tone}
目标长度：${lengthInfo?.label + " " + lengthInfo?.desc + " " + lengthInfo?.detail}
叙事视角：${perspective}

请按以下步骤执行：
1. 分析故事构思，提炼核心冲突和主题
2. 创建3-5个核心角色（含姓名、性格、背景）
3. 构建世界观设定（地理、历史、力量体系）
4. 撰写详细大纲（三幕结构）
5. 生成前3章内容（每章2000-3000字）

每个步骤请输出完整内容。`;

    setGenState({
      phase: "planning",
      currentStep: 0,
      progress: 0,
      errorMessage: "",
      stats: { characters: 0, chapters: 0, outlineWords: 0 },
    });
    setStep(3);
    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/agents/orchestrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          novelId: novelId,
          chapterId: undefined,
          message: comprehensivePrompt,
          novelTitle: undefined,
          novelGenre: genre,
          novelDescription: userIdea,
          model: "glm-4-7",
          stream: true,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const errData = await res.json();
        setGenState((prev) => ({
          ...prev,
          phase: "error",
          errorMessage:
            (errData.error as string) || "请求失败，请重试",
        }));
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream reader");

      await processSSEStream(reader);
    } catch (e: unknown) {
      const error = e as { name?: string; message?: string };
      if (error.name !== "AbortError") {
        setGenState((prev) => ({
          ...prev,
          phase: "error",
          errorMessage: error.message || "生成失败，请重试",
        }));
      }
    } finally {
      abortRef.current = null;
    }
  }, [userIdea, genre, tone, targetLength, perspective, novelId, processSSEStream]);

  // ===== Navigation =====
  const canGoNext = step === 1 ? userIdea.trim().length > 0 : true;

  const handleNext = () => {
    if (step === 1 && canGoNext) setStep(2);
  };

  const handleBack = () => {
    abortRef.current?.abort();
    if (step === 3 || step === 4) {
      setStep(2);
      setGenState((prev) => ({
        ...prev,
        phase: "idle",
        currentStep: 0,
        progress: 0,
        errorMessage: "",
      }));
    } else if (step === 2) {
      setStep(1);
    }
  };

  const handleClose = () => {
    abortRef.current?.abort();
    onOpenChange(false);
  };

  const handleStartWriting = () => {
    onOpenChange(false);
    onComplete?.();
  };

  const handleViewOutline = () => {
    onOpenChange(false);
  };

  // ===== Step Indicator =====
  const stepLabels = ["构思", "设置", "生成", "完成"];

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-6">
      {stepLabels.map((label, i) => {
        const stepNum = (i + 1) as WizardStep;
        const isActive = stepNum === step;
        const isDone = stepNum < step;
        return (
          <div key={label} className="flex items-center">
            {i > 0 && (
              <div
                className={cn(
                  "h-px w-6 sm:w-8 transition-colors duration-300",
                  isDone ? "bg-primary" : "bg-muted-foreground/20"
                )}
              />
            )}
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "flex items-center justify-center size-7 rounded-full text-xs font-semibold transition-all duration-300 border-2",
                  isActive &&
                    "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20",
                  isDone &&
                    "border-primary bg-primary text-primary-foreground",
                  !isActive &&
                    !isDone &&
                    "border-muted-foreground/30 bg-muted text-muted-foreground"
                )}
              >
                {isDone ? <Check className="size-3.5" /> : stepNum}
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium transition-colors duration-300",
                  isActive
                    ? "text-primary"
                    : isDone
                      ? "text-primary/70"
                      : "text-muted-foreground"
                )}
              >
                {label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );

  // ===== Step 1: Story Idea =====
  const renderStep1 = () => (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div className="space-y-1.5">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="size-5 text-amber-500" />
          描述你的故事
        </h3>
        <p className="text-sm text-muted-foreground">
          告诉我们你想要创作一个什么样的故事
        </p>
      </div>

      <Textarea
        placeholder="告诉我你的故事构思...可以是一个灵感、一段场景、或一个完整的故事概念"
        value={userIdea}
        onChange={(e) => setUserIdea(e.target.value)}
        rows={6}
        className="resize-none text-sm leading-relaxed"
        autoFocus
      />

      {/* Example idea cards */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground font-medium">
          💡 灵感示例（点击快速填入）
        </p>
        <div className="space-y-1.5">
          {EXAMPLE_IDEAS.map((idea, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setUserIdea(idea)}
              className={cn(
                "w-full text-left p-3 rounded-lg border transition-all duration-200 text-sm leading-relaxed",
                "hover:bg-accent hover:border-accent-foreground/20 group",
                userIdea === idea
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "border-muted bg-background"
              )}
            >
              <div className="flex items-start gap-2">
                <ChevronRight className="size-4 text-muted-foreground group-hover:text-primary mt-0.5 shrink-0 transition-colors" />
                <span
                  className={cn(
                    "transition-colors",
                    userIdea === idea
                      ? "text-primary font-medium"
                      : "text-muted-foreground group-hover:text-foreground"
                  )}
                >
                  {idea}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button
          onClick={handleNext}
          disabled={!canGoNext}
          className="gap-2"
        >
          下一步
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );

  // ===== Step 2: Preferences =====
  const renderStep2 = () => (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div className="space-y-1.5">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Wand2 className="size-5 text-violet-500" />
          风格设置
        </h3>
        <p className="text-sm text-muted-foreground">
          定制你的故事风格和创作参数
        </p>
      </div>

      {/* Genre */}
      <div className="space-y-2">
        <label className="text-sm font-medium">类型</label>
        <div className="flex flex-wrap gap-2">
          {GENRES.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGenre(g === genre ? "" : g)}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border cursor-pointer",
                genre === g
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-muted-foreground/20 bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
              )}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Tone */}
      <div className="space-y-2">
        <label className="text-sm font-medium">基调</label>
        <div className="flex flex-wrap gap-2">
          {TONES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTone(t === tone ? "" : t)}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border cursor-pointer",
                tone === t
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-muted-foreground/20 bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Target Length */}
      <div className="space-y-2">
        <label className="text-sm font-medium">目标长度</label>
        <div className="grid grid-cols-3 gap-2">
          {LENGTHS.map((l) => (
            <button
              key={l.key}
              type="button"
              onClick={() => setTargetLength(l.key)}
              className={cn(
                "flex flex-col items-center gap-1 p-3 rounded-lg border transition-all duration-200 cursor-pointer",
                targetLength === l.key
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "border-muted bg-background hover:border-primary/40 hover:bg-accent/50"
              )}
            >
              <span
                className={cn(
                  "text-sm font-semibold",
                  targetLength === l.key ? "text-primary" : "text-foreground"
                )}
              >
                {l.label}
              </span>
              <span
                className={cn(
                  "text-[10px]",
                  targetLength === l.key
                    ? "text-primary/70"
                    : "text-muted-foreground"
                )}
              >
                {l.desc}
              </span>
              <span className="text-[10px] text-muted-foreground/70">
                {l.detail}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Narrative Perspective */}
      <div className="space-y-2">
        <label className="text-sm font-medium">叙事视角</label>
        <div className="flex flex-wrap gap-2">
          {PERSPECTIVES.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPerspective(p)}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border cursor-pointer",
                perspective === p
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-muted-foreground/20 bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={handleBack} className="gap-2">
          <ArrowLeft className="size-4" />
          返回
        </Button>
        <Button
          onClick={startGeneration}
          disabled={genState.phase === "planning" || genState.phase === "executing"}
          className="gap-2"
        >
          <Sparkles className="size-4" />
          开始创作
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );

  // ===== Step 3: Generation =====
  const renderStep3 = () => (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div className="space-y-1.5">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Rocket className="size-5 text-primary" />
          正在创作你的故事
        </h3>
        <p className="text-sm text-muted-foreground">
          AI 正在为你生成完整的小说内容，请稍候...
        </p>
      </div>

      {/* Planning animation */}
      {genState.phase === "planning" && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800/40 bg-amber-50/50 dark:bg-amber-950/10 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Wand2 className="size-4 text-amber-500" />
            <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
              AI 正在分析你的故事构思
            </span>
            <Loader2 className="size-4 animate-spin text-amber-500 ml-auto" />
          </div>
          <div className="space-y-1.5">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className="flex items-center gap-2 text-xs text-amber-600/60 dark:text-amber-500/50"
              >
                <Loader2
                  className="size-2.5 animate-spin"
                  style={{ animationDelay: `${s * 200}ms` }}
                />
                <span>
                  {s === 1
                    ? "分析创作需求..."
                    : s === 2
                      ? "评估任务复杂度..."
                      : "制定执行计划..."}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Generation Steps Checklist */}
      {genState.phase === "executing" && (
        <>
          <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
            {GENERATION_STEPS.map((s, i) => {
              const stepIdx = i + 1;
              const isDone = genState.currentStep > stepIdx;
              const isRunning =
                genState.currentStep === stepIdx &&
                genState.phase === "executing";
              const isPending = genState.currentStep < stepIdx;

              return (
                <div
                  key={i}
                  className="flex items-center gap-3 transition-all duration-300"
                >
                  <div
                    className={cn(
                      "flex items-center justify-center size-6 rounded-full transition-all duration-300 shrink-0",
                      isDone && "bg-emerald-500 text-white",
                      isRunning &&
                        "bg-primary text-primary-foreground shadow-sm shadow-primary/20",
                      isPending && "bg-muted text-muted-foreground"
                    )}
                  >
                    {isDone ? (
                      <Check className="size-3.5" />
                    ) : isRunning ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <s.icon className="size-3" />
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-sm transition-colors duration-300",
                      isDone &&
                        "text-emerald-600 dark:text-emerald-400 font-medium",
                      isRunning && "text-primary font-medium",
                      isPending && "text-muted-foreground"
                    )}
                  >
                    {s.label}
                  </span>
                  {isDone && (
                    <span className="text-[10px] text-emerald-500 ml-auto">
                      完成
                    </span>
                  )}
                  {isRunning && (
                    <span className="text-[10px] text-primary ml-auto flex items-center gap-1">
                      <Loader2 className="size-2.5 animate-spin" />
                      进行中
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>创作进度</span>
              <span className="font-medium tabular-nums">
                {Math.round(genState.progress)}%
              </span>
            </div>
            <div className="relative">
              <Progress value={genState.progress} className="h-2" />
              <div className="absolute inset-0 h-2 rounded-full overflow-hidden pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Error state */}
      {genState.phase === "error" && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 animate-in fade-in duration-200">
          <p className="text-sm text-destructive font-medium">生成失败</p>
          <p className="text-xs text-destructive/80 mt-1">
            {genState.errorMessage}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 gap-1.5"
            onClick={() => {
              setGenState((prev) => ({
                ...prev,
                phase: "idle",
                currentStep: 0,
                progress: 0,
                errorMessage: "",
              }));
              setStep(2);
            }}
          >
            <ArrowLeft className="size-3" />
            返回修改
          </Button>
        </div>
      )}
    </div>
  );

  // ===== Step 4: Completion =====
  const renderStep4 = () => {
    const stats = genState.stats;
    const wordDisplay =
      stats.outlineWords > 1000
        ? Math.round(stats.outlineWords / 1000) + "K"
        : stats.outlineWords || "15K";

    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        {/* Success animation */}
        <div className="flex flex-col items-center text-center py-4">
          <div className="relative mb-4">
            <div className="flex items-center justify-center size-16 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 text-white shadow-lg shadow-emerald-500/20">
              <PartyPopper className="size-8" />
            </div>
            <div className="absolute -inset-2 rounded-full border-2 border-emerald-400/30 animate-ping" />
          </div>
          <h3 className="text-lg font-semibold">你的故事已创建！</h3>
          <p className="text-sm text-muted-foreground mt-1">
            AI 已根据你的构思生成了完整的小说框架
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              icon: <Users className="size-4" />,
              value: `${stats.characters || 4}`,
              label: "个角色",
            },
            {
              icon: <BookOpen className="size-4" />,
              value: `${stats.chapters || 3}`,
              label: "章内容",
            },
            {
              icon: <FileText className="size-4" />,
              value: wordDisplay,
              label: "字大纲",
            },
          ].map((stat, i) => (
            <div
              key={i}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-muted/50 border"
            >
              <div className="text-primary">{stat.icon}</div>
              <span className="text-lg font-bold text-foreground">
                {stat.value}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {stat.label}
              </span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={handleViewOutline}
          >
            <Eye className="size-4" />
            查看大纲
          </Button>
          <Button className="flex-1 gap-2" onClick={handleStartWriting}>
            <Sparkles className="size-4" />
            开始写作
          </Button>
        </div>
      </div>
    );
  };

  // ===== Step Titles =====
  const STEP_TITLES: Record<WizardStep, { title: string; desc: string }> = {
    1: { title: "一键创作", desc: "只需一个灵感，AI 帮你生成完整小说" },
    2: { title: "风格设置", desc: "定制你的创作风格，让故事更符合期待" },
    3: { title: "正在创作你的故事", desc: "请耐心等待，AI 正在精心打磨你的作品" },
    4: { title: "创作完成", desc: "你的故事已经准备就绪" },
  };

  // ===== Main Render =====
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClose();
      }}
    >
      <DialogContent
        className="sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
        showCloseButton={
          genState.phase !== "executing" && genState.phase !== "planning"
        }
      >
        <DialogHeader className="shrink-0">
          {renderStepIndicator()}

          <DialogTitle>{STEP_TITLES[step].title}</DialogTitle>
          <DialogDescription>{STEP_TITLES[step].desc}</DialogDescription>
        </DialogHeader>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto -mx-6 px-6">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
