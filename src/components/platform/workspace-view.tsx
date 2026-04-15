"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAppStore } from "@/lib/store";
import {
  CHAPTER_STATUS_MAP,
  type Chapter,
  type Character,
  type WorldSetting,
  type AgentType,
  type WorldSettingCategory,
} from "@/lib/types";
import {
  Button,
} from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Loader2,
  Sparkles,
  BookOpen,
  Save,
  ArrowLeft,
  Download,
  FileText,
  Globe,
  Users,
  GitBranch,
  PenLine,
  MessageSquare,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Stub imports — these components will be fully implemented by other agents
import { CharacterSheet } from "@/components/platform/character-sheet";
import { WorldSheet } from "@/components/platform/world-sheet";
import { VersionSheet } from "@/components/platform/version-sheet";
import { AiAssistantDrawer } from "@/components/platform/ai-assistant-drawer";
import { StoryWizard } from "@/components/platform/story-wizard";

export function WorkspaceView() {
  const {
    selectedNovelId,
    selectedChapterId,
    setSelectedNovel,
    setSelectedChapter,
    currentNovel,
    setCurrentNovel,
    chapters,
    setChapters,
    characters,
    setCharacters,
    worldSettings,
    setWorldSettings,
    isAgentRunning,
    setIsAgentRunning,
    setIsCreatingNovel,
    setCurrentView,
    agentConfigs,
  } = useAppStore();

  // Core editor state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [chapterTitle, setChapterTitle] = useState("");
  const [chapterContent, setChapterContent] = useState("");
  const [chapterSummary, setChapterSummary] = useState("");
  const [chapterStatus, setChapterStatus] = useState<string>("draft");

  // AI agent state
  const [aiMessage, setAiMessage] = useState("");
  const [aiMessages, setAiMessages] = useState<{ role: string; content: string; agentType?: string }[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<AgentType>("hermes");
  const [selectedModel, setSelectedModel] = useState("glm-4-7");
  const [streamingText, setStreamingText] = useState("");
  const aiEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Dialog & panel state
  const [creatingChapter, setCreatingChapter] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [showCharacterDialog, setShowCharacterDialog] = useState(false);
  const [showWorldDialog, setShowWorldDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [charForm, setCharForm] = useState({ name: "", role: "supporting" as const, description: "", personality: "", appearance: "", backstory: "" });
  const [worldForm, setWorldForm] = useState({ name: "", category: "geography" as WorldSettingCategory, description: "" });

  // Sheet panels & new UI state
  const [showCharacterSheet, setShowCharacterSheet] = useState(false);
  const [showWorldSheet, setShowWorldSheet] = useState(false);
  const [showVersionSheet, setShowVersionSheet] = useState(false);
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [showStoryWizard, setShowStoryWizard] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ===== Data Loading =====
  const loadNovelData = useCallback(async () => {
    if (!selectedNovelId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/novels/${selectedNovelId}`);
      if (res.ok) {
        const data = await res.json();
        setCurrentNovel(data);
        setChapters(data.chapters || []);
        setCharacters(data.characters || []);
        setWorldSettings(data.worldSettings || []);
        if (data.chapters?.length > 0 && !selectedChapterId) {
          const first = data.chapters[0];
          setSelectedChapter(first.id);
          setChapterTitle(first.title);
          setChapterContent(first.content);
          setChapterSummary(first.summary);
          setChapterStatus(first.status);
        }
      }
    } catch (e) {
      console.error("Failed to load novel:", e);
    } finally {
      setLoading(false);
    }
  }, [selectedNovelId, selectedChapterId, setCurrentNovel, setChapters, setCharacters, setWorldSettings, setSelectedChapter]);

  useEffect(() => {
    loadNovelData();
  }, [loadNovelData]);

  useEffect(() => {
    if (!selectedChapterId) return;
    const ch = chapters.find((c) => c.id === selectedChapterId);
    if (ch) {
      setChapterTitle(ch.title);
      setChapterContent(ch.content);
      setChapterSummary(ch.summary);
      setChapterStatus(ch.status);
    }
  }, [selectedChapterId, chapters]);

  useEffect(() => {
    aiEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiMessages, streamingText]);

  // ===== Chapter Operations =====
  async function saveChapter() {
    if (!selectedChapterId) return;
    setSaving(true);
    try {
      await fetch(`/api/chapters/${selectedChapterId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: chapterTitle, content: chapterContent, summary: chapterSummary, status: chapterStatus }),
      });
    } catch (e) { console.error("Save failed:", e); }
    finally { setSaving(false); }
  }

  function handleContentChange(value: string) {
    setChapterContent(value);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => saveChapter(), 2000);
  }

  async function createChapter() {
    if (!selectedNovelId) return;
    try {
      const res = await fetch(`/api/novels/${selectedNovelId}/chapters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newChapterTitle || undefined }),
      });
      if (res.ok) {
        const ch = await res.json();
        setCreatingChapter(false);
        setNewChapterTitle("");
        setSelectedChapter(ch.id);
        loadNovelData();
      }
    } catch (e) { console.error("Failed:", e); }
  }

  async function deleteChapter(chId: string) {
    if (!confirm("确认删除此章节？")) return;
    try {
      await fetch(`/api/chapters/${chId}`, { method: "DELETE" });
      if (selectedChapterId === chId) {
        setSelectedChapter(null);
        setChapterTitle("");
        setChapterContent("");
        setChapterSummary("");
      }
      loadNovelData();
    } catch (e) { console.error("Failed:", e); }
  }

  // ===== Character & World CRUD =====
  async function saveCharacter() {
    if (!selectedNovelId || !charForm.name.trim()) return;
    try {
      await fetch("/api/characters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...charForm, novelId: selectedNovelId }),
      });
      setShowCharacterDialog(false);
      setCharForm({ name: "", role: "supporting", description: "", personality: "", appearance: "", backstory: "" });
      loadNovelData();
    } catch (e) { console.error("Failed:", e); }
  }

  async function saveWorldSetting() {
    if (!selectedNovelId || !worldForm.name.trim()) return;
    try {
      await fetch("/api/world-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...worldForm, novelId: selectedNovelId }),
      });
      setShowWorldDialog(false);
      setWorldForm({ name: "", category: "geography", description: "" });
      loadNovelData();
    } catch (e) { console.error("Failed:", e); }
  }

  // ===== Export =====
  function handleExport(format: string) {
    if (!selectedNovelId) return;
    const url = `/api/export?novelId=${selectedNovelId}&format=${format}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentNovel?.title || "novel"}.${format}`;
    a.click();
    setShowExportDialog(false);
    setShowExportMenu(false);
  }

  // ===== AI Agent Streaming =====
  async function sendToAgent() {
    if (!aiMessage.trim() || isAgentRunning) return;
    setIsAgentRunning(true);
    const userMsg = aiMessage;
    setAiMessage("");
    setAiMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setStreamingText("");
    setAiMessages((prev) => [...prev, { role: "assistant", content: "", agentType: selectedAgent }]);
    abortControllerRef.current = new AbortController();

    try {
      const agentConfig = agentConfigs[selectedAgent];
      const effectiveSystemPrompt = agentConfig
        ? agentConfig.systemPrompt + agentConfig.skills.filter((s) => s.enabled).map((s) => s.prompt).join("")
        : undefined;
      const temperature = agentConfig?.temperature;
      const maxTokens = agentConfig?.maxTokens;
      const memories = agentConfig?.memories?.map((m) => m.content).filter(Boolean);

      const res = await fetch("/api/agents/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentType: selectedAgent,
          novelId: selectedNovelId,
          chapterId: selectedChapterId,
          message: userMsg,
          novelTitle: currentNovel?.title,
          novelGenre: currentNovel?.genre,
          novelDescription: currentNovel?.description,
          chapterContent: ["writer", "editor", "reviewer"].includes(selectedAgent) ? chapterContent : undefined,
          characters: characters.map((c) => `${c.name}(${c.role}): ${c.description}`),
          model: selectedModel,
          stream: true,
          systemPrompt: effectiveSystemPrompt,
          temperature,
          maxTokens,
          memories,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!res.ok) {
        const errData = await res.json();
        setAiMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: `错误: ${errData.error || "生成失败"}` };
          return updated;
        });
        setIsAgentRunning(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No reader");
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;
        setStreamingText(fullText);
        setAiMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: fullText, agentType: selectedAgent };
          return updated;
        });
      }
      setStreamingText("");
    } catch (e: any) {
      if (e.name !== "AbortError") {
        setAiMessages((prev) => {
          const updated = [...prev];
          if (updated[updated.length - 1]?.role === "assistant" && !updated[updated.length - 1]?.content) {
            updated[updated.length - 1] = { role: "assistant", content: "生成出错，请重试" };
          }
          return updated;
        });
      }
    } finally {
      setIsAgentRunning(false);
      abortControllerRef.current = null;
    }
  }

  // ===== Derived State =====
  const currentChapter = chapters.find((c) => c.id === selectedChapterId);
  const wordCount = chapterContent.length;
  const totalWords = chapters.reduce((sum, c) => sum + c.wordCount, 0) + chapterContent.length;

  // ===== No novel selected: beautiful landing =====
  if (!selectedNovelId) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 p-6">
        <div className="size-20 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 flex items-center justify-center">
          <BookOpen className="size-10 text-amber-500" />
        </div>
        <div className="text-center max-w-sm">
          <h2 className="text-lg font-semibold mb-2">开始你的创作之旅</h2>
          <p className="text-sm text-muted-foreground mb-6">
            选择一个已有作品继续创作，或创建一部新作品开始你的网文之旅
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => setIsCreatingNovel(true)}>
              <Plus className="size-4 mr-2" />创建新作品
            </Button>
            <Button variant="outline" onClick={() => setCurrentView("novels")}>
              <BookOpen className="size-4 mr-2" />查看作品列表
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ===== Loading state =====
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-col h-[calc(100vh-3.5rem)]">
        {/* ===== Top Toolbar (44px) ===== */}
        <header className="flex items-center justify-between h-11 px-2 flex-shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          {/* Left: Back + Novel Info */}
          <div className="flex items-center gap-2 min-w-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 flex-shrink-0"
                  onClick={() => setCurrentView("novels")}
                >
                  <ArrowLeft className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>返回作品列表</TooltipContent>
            </Tooltip>

            <div className="min-w-0 flex items-center gap-2">
              <h2 className="text-sm font-semibold truncate max-w-[200px]">
                {currentNovel?.title}
              </h2>
              {currentChapter && (
                <>
                  <span className="text-muted-foreground/50">·</span>
                  <span className="text-xs text-muted-foreground truncate">
                    {currentChapter.title}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Right: Tool buttons */}
          <div className="flex items-center gap-0.5">
            <ToolbarButton icon={<Users className="size-4" />} tooltip="角色管理" onClick={() => setShowCharacterSheet(true)} />
            <ToolbarButton icon={<Globe className="size-4" />} tooltip="世界观管理" onClick={() => setShowWorldSheet(true)} />
            <ToolbarButton icon={<GitBranch className="size-4" />} tooltip="版本管理" onClick={() => setShowVersionSheet(true)} />
            <ToolbarButton icon={<MessageSquare className="size-4" />} tooltip="AI 助手" onClick={() => setShowAiAssistant(true)} />

            <div className="w-px h-5 bg-border mx-1" />

            {/* Export dropdown */}
            <DropdownMenu open={showExportMenu} onOpenChange={setShowExportMenu}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8">
                  <Download className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport("txt")}>
                  <FileText className="size-3.5 mr-2" />纯文本 (.txt)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("md")}>
                  <FileText className="size-3.5 mr-2" />Markdown (.md)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("json")}>
                  <FileText className="size-3.5 mr-2" />JSON (.json)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Save button */}
            <ToolbarButton
              icon={saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              tooltip={saving ? "保存中..." : "保存"}
              onClick={saveChapter}
              disabled={saving || !selectedChapterId}
            />
          </div>
        </header>

        {/* ===== Main Content Area ===== */}
        <main className="flex-1 overflow-hidden">
          {currentChapter ? (
            <div className="flex flex-col h-full">
              {/* Chapter editor: centered, beautiful typography */}
              <div className="flex-1 overflow-y-auto">
                <div className="max-w-3xl mx-auto px-6 py-10 md:py-16">
                  {/* Status chip */}
                  <div className="mb-6">
                    <span className={cn(
                      "inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium",
                      chapterStatus === "completed" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
                      chapterStatus === "writing" && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                      chapterStatus === "review" && "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
                      chapterStatus === "draft" && "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
                    )}>
                      {CHAPTER_STATUS_MAP[chapterStatus as keyof typeof CHAPTER_STATUS_MAP]?.label || "草稿"}
                    </span>
                  </div>

                  {/* Chapter title (inline-editable) */}
                  <Input
                    value={chapterTitle}
                    onChange={(e) => setChapterTitle(e.target.value)}
                    onBlur={saveChapter}
                    className="text-2xl md:text-3xl font-bold border-none shadow-none px-0 h-auto focus-visible:ring-0 bg-transparent placeholder:text-muted-foreground/40 mb-8"
                    placeholder="章节标题"
                  />

                  {/* Chapter body */}
                  <Textarea
                    value={chapterContent}
                    onChange={(e) => handleContentChange(e.target.value)}
                    className="min-h-[60vh] w-full resize-none border-none shadow-none bg-transparent text-base leading-[1.8] font-serif focus-visible:ring-0 placeholder:text-muted-foreground/40 selection:bg-primary/20"
                    placeholder="开始写作..."
                    rows={40}
                  />
                </div>
              </div>
            </div>
          ) : (
            /* ===== Empty State: No chapter selected ===== */
            <div className="flex flex-col items-center justify-center h-full gap-6">
              <div className="size-20 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/20 dark:to-orange-900/20 flex items-center justify-center">
                <PenLine className="size-9 text-amber-500" />
              </div>
              <div className="text-center max-w-md">
                <h3 className="text-lg font-semibold mb-2">开始你的创作</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  选择章节继续写作，或使用 AI 一键生成
                </p>
                <div className="flex gap-3 justify-center">
                  <Button size="lg" onClick={() => setShowStoryWizard(true)}>
                    <Sparkles className="size-4 mr-2" />一键创作
                  </Button>
                  <Button size="lg" variant="outline" onClick={() => setCreatingChapter(true)}>
                    <Plus className="size-4 mr-2" />新建章节
                  </Button>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* ===== Bottom Chapter Bar (48px, glass-morphism) ===== */}
        <footer className="flex items-center h-12 px-2 gap-2 flex-shrink-0 bg-background/80 backdrop-blur-lg border-t">
          {/* Chapter pills: horizontal scrollable */}
          <div className="flex items-center gap-1 flex-1 overflow-x-auto no-scrollbar">
            {chapters.map((ch) => (
              <button
                key={ch.id}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap flex-shrink-0",
                  selectedChapterId === ch.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
                onClick={() => setSelectedChapter(ch.id)}
              >
                <span>{ch.chapterNumber}</span>
                <span className="max-w-[80px] truncate">{ch.title}</span>
              </button>
            ))}

            {/* Add chapter button */}
            <button
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all flex-shrink-0"
              onClick={() => setCreatingChapter(true)}
            >
              <Plus className="size-3" />
            </button>
          </div>

          {/* Word count + auto-save */}
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-shrink-0">
            {currentChapter && (
              <span>{wordCount.toLocaleString()} 字</span>
            )}
            <span className="flex items-center gap-1">
              {saving ? (
                <>
                  <Loader2 className="size-3 animate-spin" />
                  <span>保存中</span>
                </>
              ) : (
                <span>已保存</span>
              )}
            </span>
          </div>
        </footer>

        {/* ===== Sheet Panels ===== */}
        <Sheet open={showCharacterSheet} onOpenChange={setShowCharacterSheet}>
          <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
            <SheetHeader>
              <SheetTitle>角色管理</SheetTitle>
              <SheetDescription>管理作品中的角色设定</SheetDescription>
            </SheetHeader>
            <CharacterSheet novelId={selectedNovelId!} />
          </SheetContent>
        </Sheet>

        <Sheet open={showWorldSheet} onOpenChange={setShowWorldSheet}>
          <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
            <SheetHeader>
              <SheetTitle>世界观管理</SheetTitle>
              <SheetDescription>管理作品的世界观设定</SheetDescription>
            </SheetHeader>
            <WorldSheet novelId={selectedNovelId!} />
          </SheetContent>
        </Sheet>

        <Sheet open={showVersionSheet} onOpenChange={setShowVersionSheet}>
          <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
            <SheetHeader>
              <SheetTitle>版本管理</SheetTitle>
              <SheetDescription>查看和管理作品版本</SheetDescription>
            </SheetHeader>
            <VersionSheet novelId={selectedNovelId!} />
          </SheetContent>
        </Sheet>

        {/* AI Assistant Drawer (bottom) */}
        <Sheet open={showAiAssistant} onOpenChange={setShowAiAssistant}>
          <SheetContent side="bottom" className="h-[70vh] rounded-t-2xl">
            <SheetHeader>
              <SheetTitle>AI 助手</SheetTitle>
              <SheetDescription>智能写作辅助</SheetDescription>
            </SheetHeader>
            <AiAssistantDrawer novelId={selectedNovelId!} chapterId={selectedChapterId} />
          </SheetContent>
        </Sheet>

        {/* Story Wizard */}
        <StoryWizard open={showStoryWizard} onOpenChange={setShowStoryWizard} novelId={selectedNovelId!} onComplete={() => { setShowStoryWizard(false); loadNovelData(); }} />

        {/* ===== Existing Dialogs ===== */}

        {/* Create Character Dialog */}
        <Dialog open={showCharacterDialog} onOpenChange={setShowCharacterDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>添加角色</DialogTitle><DialogDescription>为新作品创建角色设定</DialogDescription></DialogHeader>
            <div className="grid gap-3 py-3">
              <div><label className="text-xs text-muted-foreground mb-1 block">角色名称 *</label><Input value={charForm.name} onChange={(e) => setCharForm({ ...charForm, name: e.target.value })} placeholder="如：李明" /></div>
              <div><label className="text-xs text-muted-foreground mb-1 block">角色定位 *</label>
                <Select value={charForm.role} onValueChange={(v: any) => setCharForm({ ...charForm, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="protagonist">主角</SelectItem>
                    <SelectItem value="antagonist">反派</SelectItem>
                    <SelectItem value="supporting">配角</SelectItem>
                    <SelectItem value="minor">龙套</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><label className="text-xs text-muted-foreground mb-1 block">角色描述</label><Textarea value={charForm.description} onChange={(e) => setCharForm({ ...charForm, description: e.target.value })} rows={2} placeholder="简要描述角色特征..." /></div>
              <div><label className="text-xs text-muted-foreground mb-1 block">性格特点</label><Textarea value={charForm.personality} onChange={(e) => setCharForm({ ...charForm, personality: e.target.value })} rows={2} placeholder="性格关键词，逗号分隔..." /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setShowCharacterDialog(false)}>取消</Button><Button onClick={saveCharacter} disabled={!charForm.name.trim()}>添加</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create World Setting Dialog */}
        <Dialog open={showWorldDialog} onOpenChange={setShowWorldDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>添加世界观设定</DialogTitle><DialogDescription>创建世界观的组成要素</DialogDescription></DialogHeader>
            <div className="grid gap-3 py-3">
              <div><label className="text-xs text-muted-foreground mb-1 block">设定名称 *</label><Input value={worldForm.name} onChange={(e) => setWorldForm({ ...worldForm, name: e.target.value })} placeholder="如：天玄大陆" /></div>
              <div><label className="text-xs text-muted-foreground mb-1 block">分类 *</label>
                <Select value={worldForm.category} onValueChange={(v: any) => setWorldForm({ ...worldForm, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="geography">地理环境</SelectItem>
                    <SelectItem value="history">历史纪年</SelectItem>
                    <SelectItem value="culture">文化风俗</SelectItem>
                    <SelectItem value="magic">魔法体系</SelectItem>
                    <SelectItem value="technology">科技设定</SelectItem>
                    <SelectItem value="other">其他</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><label className="text-xs text-muted-foreground mb-1 block">详细描述</label><Textarea value={worldForm.description} onChange={(e) => setWorldForm({ ...worldForm, description: e.target.value })} rows={3} placeholder="描述这个设定的详细内容..." /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setShowWorldDialog(false)}>取消</Button><Button onClick={saveWorldSetting} disabled={!worldForm.name.trim()}>添加</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Chapter Dialog */}
        <Dialog open={creatingChapter} onOpenChange={setCreatingChapter}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader><DialogTitle>创建新章节</DialogTitle><DialogDescription>为作品添加新章节</DialogDescription></DialogHeader>
            <div className="grid gap-3 py-3">
              <div><label className="text-xs text-muted-foreground mb-1 block">章节标题（可选）</label><Input value={newChapterTitle} onChange={(e) => setNewChapterTitle(e.target.value)} placeholder="留空自动编号" onKeyDown={(e) => { if (e.key === "Enter") createChapter(); }} /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setCreatingChapter(false)}>取消</Button><Button onClick={createChapter}>创建</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Export Dialog */}
        <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader><DialogTitle>导出作品</DialogTitle><DialogDescription>选择导出格式</DialogDescription></DialogHeader>
            <div className="grid gap-2 py-3">
              <Button variant="outline" className="justify-start gap-2" onClick={() => handleExport("txt")}><FileText className="size-4" />纯文本 (.txt)</Button>
              <Button variant="outline" className="justify-start gap-2" onClick={() => handleExport("md")}><FileText className="size-4" />Markdown (.md)</Button>
              <Button variant="outline" className="justify-start gap-2" onClick={() => handleExport("json")}><FileText className="size-4" />JSON (.json)</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

// ===== Toolbar Button Helper =====
function ToolbarButton({
  icon,
  tooltip,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  tooltip: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={onClick}
          disabled={disabled}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{tooltip}</TooltipContent>
    </Tooltip>
  );
}
