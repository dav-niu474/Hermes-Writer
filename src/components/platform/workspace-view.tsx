"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAppStore, type WorkspaceTab } from "@/lib/store";
import {
  AGENT_DEFINITIONS,
  CHAPTER_STATUS_MAP,
  type Chapter,
  type Character,
  type WorldSetting,
  type AgentType,
  type WorldSettingCategory,
} from "@/lib/types";
import { AVAILABLE_MODELS } from "@/lib/ai";
import { OrchestrationPanel } from "@/components/platform/orchestration-panel";
import { OutlineCanvas } from "@/components/workspace/outline-canvas";
import { CharacterArchive } from "@/components/workspace/character-archive";
import { WorldviewGallery } from "@/components/workspace/worldview-gallery";
import { VersionCenter } from "@/components/workspace/version-center";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Progress } from "@/components/ui/progress";
import {
  Plus,
  Trash2,
  Bot,
  Send,
  Loader2,
  Sparkles,
  BookOpen,
  Save,
  Wand2,
  ArrowLeft,
  Download,
  FileText,
  Globe,
  Users,
  History,
  BarChart3,
  CheckCircle2,
  Brain,
  Map,
  Copy,
  ChevronDown,
  GitBranch,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ===== Creative Layer Tab Definitions =====
const CREATIVE_TABS: { id: WorkspaceTab; label: string; icon: React.ReactNode; color: string }[] = [
  { id: "outline", label: "大纲", icon: <Map className="size-3.5" />, color: "text-amber-500" },
  { id: "characters", label: "角色", icon: <Users className="size-3.5" />, color: "text-rose-500" },
  { id: "worldview", label: "世界观", icon: <Globe className="size-3.5" />, color: "text-orange-500" },
];

const ENGINEERING_TAB: { id: WorkspaceTab; label: string; icon: React.ReactNode; color: string } = {
  id: "version", label: "版本管理", icon: <GitBranch className="size-3.5" />, color: "text-teal-500"
};

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
    workspaceTab,
    setWorkspaceTab,
    engineeringCollapsed,
    setEngineeringCollapsed,
  } = useAppStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [chapterTitle, setChapterTitle] = useState("");
  const [chapterContent, setChapterContent] = useState("");
  const [chapterSummary, setChapterSummary] = useState("");
  const [chapterStatus, setChapterStatus] = useState<string>("draft");
  const [aiMessage, setAiMessage] = useState("");
  const [aiMessages, setAiMessages] = useState<{ role: string; content: string; agentType?: string }[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<AgentType>("hermes");
  const [selectedModel, setSelectedModel] = useState("glm-4-7");
  const [agentMode, setAgentMode] = useState<"chat" | "orchestrate">("orchestrate");
  const [showAgentPanel, setShowAgentPanel] = useState(false);
  const [creatingChapter, setCreatingChapter] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [showCharacterDialog, setShowCharacterDialog] = useState(false);
  const [showWorldDialog, setShowWorldDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showStatsPanel, setShowStatsPanel] = useState(false);
  const [charForm, setCharForm] = useState({ name: "", role: "supporting" as const, description: "", personality: "", appearance: "", backstory: "" });
  const [worldForm, setWorldForm] = useState({ name: "", category: "geography" as WorldSettingCategory, description: "" });
  const [specs, setSpecs] = useState<any[]>([]);
  const [streamingText, setStreamingText] = useState("");
  const [prevCreativeTab, setPrevCreativeTab] = useState<WorkspaceTab>("outline");
  const aiEndRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load novel data
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

  // Auto-save chapter
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

  // Character CRUD
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

  // World settings CRUD
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

  // Export
  function handleExport(format: string) {
    if (!selectedNovelId) return;
    const url = `/api/export?novelId=${selectedNovelId}&format=${format}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentNovel?.title || "novel"}.${format}`;
    a.click();
    setShowExportDialog(false);
  }

  // Agent interaction with streaming
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

  // Stats
  const totalWords = chapters.reduce((sum, c) => sum + c.wordCount, 0) + chapterContent.length;
  const completedChapters = chapters.filter((c) => c.status === "completed").length;
  const avgWordsPerChapter = chapters.length > 0 ? Math.round(totalWords / chapters.length) : 0;

  // No novel selected state
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

  if (loading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>;
  }

  const currentChapter = chapters.find((c) => c.id === selectedChapterId);
  const wordCount = chapterContent.length;

  // Determine what to show in main content area
  // If a chapter is selected AND the workspace tab is a creative tab, show chapter editor with option to see full view
  // Otherwise show the full workspace view for the selected tab
  const showFullPageView = workspaceTab === "version";
  const showChapterEditor = selectedChapterId && !showFullPageView;

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* ===== Top Bar ===== */}
      <div className="flex items-center justify-between border-b px-3 py-1.5 flex-shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-2 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 flex-shrink-0"
            onClick={() => {
              if (showFullPageView) {
                setWorkspaceTab(prevCreativeTab);
                setEngineeringCollapsed(true);
              } else {
                setCurrentView("novels");
              }
            }}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold truncate">{currentNovel?.title}</h2>
            <p className="text-[11px] text-muted-foreground truncate">
              {showFullPageView
                ? "版本管理中心"
                : currentChapter
                  ? `${currentChapter.title} · ${wordCount.toLocaleString()} 字`
                  : `${chapters.length} 章 · ${totalWords.toLocaleString()} 字 · ${characters.length} 角色`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setShowExportDialog(true)}>
                  <Download className="size-3.5" /><span className="hidden sm:inline">导出</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>导出作品</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setShowStatsPanel(!showStatsPanel)}>
                  <BarChart3 className="size-3.5" /><span className="hidden sm:inline">统计</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>写作统计</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant={showAgentPanel ? "default" : "outline"} size="sm" className="h-7 text-xs gap-1" onClick={() => setShowAgentPanel(!showAgentPanel)}>
                  {showAgentPanel && agentMode === "orchestrate" ? <Brain className="size-3.5" /> : <Bot className="size-3.5" />}
                  <span className="hidden sm:inline">{showAgentPanel && agentMode === "orchestrate" ? "协同编排" : "AI 助手"}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>打开 AI 助手</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {!showFullPageView && (
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={saveChapter} disabled={saving || !selectedChapterId}>
              <Save className="size-3.5" /><span className="hidden sm:inline">{saving ? "保存中" : "保存"}</span>
            </Button>
          )}
        </div>
      </div>

      {/* ===== Stats Bar ===== */}
      {showStatsPanel && (
        <div className="flex items-center gap-4 px-4 py-2 border-b bg-muted/30 text-xs flex-shrink-0 overflow-x-auto">
          <div className="flex items-center gap-1.5"><FileText className="size-3.5 text-muted-foreground" /><span>{chapters.length} 章</span></div>
          <div className="flex items-center gap-1.5"><FileText className="size-3.5 text-muted-foreground" /><span>{totalWords.toLocaleString()} 字</span></div>
          <div className="flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-emerald-500" /><span>{completedChapters} 章完成</span></div>
          <div className="flex items-center gap-1.5"><Users className="size-3.5 text-rose-400" /><span>{characters.length} 角色</span></div>
          <div className="flex items-center gap-1.5"><Globe className="size-3.5 text-orange-400" /><span>{worldSettings.length} 设定</span></div>
          <div className="flex items-center gap-1.5 text-muted-foreground"><span>平均 {avgWordsPerChapter} 字/章</span></div>
          <Progress value={chapters.length > 0 ? (completedChapters / chapters.length) * 100 : 0} className="h-1.5 w-24" />
          <span className="text-muted-foreground">{chapters.length > 0 ? Math.round((completedChapters / chapters.length) * 100) : 0}%</span>
        </div>
      )}

      {/* ===== Full Page View (Version Center) ===== */}
      {showFullPageView && (
        <div className="flex-1 overflow-hidden">
          <VersionCenter novelId={selectedNovelId} />
        </div>
      )}

      {/* ===== Main Content with Double-Layer Navigation ===== */}
      {!showFullPageView && (
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          {/* ===== Left Sidebar: Double-Layer Navigation ===== */}
          <ResizablePanel defaultSize={18} minSize={14} maxSize={28}>
            <div className="flex flex-col h-full border-r">
              {/* Creative Layer Tabs */}
              <div className="flex-shrink-0">
                <div className="px-2 py-1.5">
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider px-1">创作层</p>
                </div>
                <div className="flex gap-0.5 px-1.5 pb-1">
                  {CREATIVE_TABS.map((tab) => (
                    <button
                      key={tab.id}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-[11px] font-medium transition-all",
                        workspaceTab === tab.id
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      )}
                      onClick={() => setWorkspaceTab(tab.id)}
                    >
                      {tab.icon}
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Left Content: Context-Aware List */}
              <ScrollArea className="flex-1">
                {/* Outline tab: show spec list summary */}
                {workspaceTab === "outline" && (
                  <div className="p-1.5 space-y-1">
                    {specs.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground text-xs">
                        <Map className="size-5 mx-auto mb-1.5 text-amber-400" />
                        <p className="font-medium">暂无大纲</p>
                        <p className="text-[10px] mt-0.5">使用 AI 自动生成</p>
                      </div>
                    ) : (
                      specs.filter(s => s.category === "outline").map((spec) => (
                        <div key={spec.id} className="rounded-md px-2 py-1.5 hover:bg-muted cursor-pointer transition-colors" onClick={() => {}}>
                          <div className="flex items-center gap-2">
                            <div className="size-5 rounded bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                              <Map className="size-3 text-amber-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{spec.title}</p>
                              <p className="text-[9px] text-muted-foreground">v{spec.version} · {spec.content?.length || 0} 字</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Characters tab: show character list */}
                {workspaceTab === "characters" && (
                  <div className="p-1.5 space-y-1">
                    {characters.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground text-xs">
                        <Users className="size-5 mx-auto mb-1.5 text-rose-400" />
                        <p className="font-medium">暂无角色</p>
                        <Button size="sm" variant="ghost" className="mt-2 h-6 text-[10px] gap-1" onClick={() => setShowCharacterDialog(true)}>
                          <Plus className="size-3" />添加角色
                        </Button>
                      </div>
                    ) : (
                      characters.map((char) => (
                        <div key={char.id} className="rounded-md px-2 py-1.5 hover:bg-muted cursor-pointer transition-colors">
                          <div className="flex items-center gap-2">
                            <div className="size-5 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white text-[9px] font-medium flex-shrink-0">
                              {char.name[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-[11px] truncate">{char.name}</p>
                              <p className="text-[9px] text-muted-foreground">
                                {char.role === "protagonist" ? "主角" : char.role === "antagonist" ? "反派" : char.role === "supporting" ? "配角" : "龙套"}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                    <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground text-xs h-7" onClick={() => setShowCharacterDialog(true)}>
                      <Plus className="size-3 mr-1" />添加角色
                    </Button>
                  </div>
                )}

                {/* Worldview tab: show settings list */}
                {workspaceTab === "worldview" && (
                  <div className="p-1.5 space-y-1">
                    {worldSettings.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground text-xs">
                        <Globe className="size-5 mx-auto mb-1.5 text-orange-400" />
                        <p className="font-medium">暂无设定</p>
                        <Button size="sm" variant="ghost" className="mt-2 h-6 text-[10px] gap-1" onClick={() => setShowWorldDialog(true)}>
                          <Plus className="size-3" />添加设定
                        </Button>
                      </div>
                    ) : (
                      worldSettings.map((ws) => (
                        <div key={ws.id} className="rounded-md px-2 py-1.5 hover:bg-muted cursor-pointer transition-colors">
                          <div className="flex items-center gap-2">
                            <div className="size-5 rounded bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                              <Globe className="size-3 text-orange-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-[11px] truncate">{ws.name}</p>
                              <p className="text-[9px] text-muted-foreground truncate">
                                {ws.category === "geography" ? "地理" : ws.category === "history" ? "历史" : ws.category === "culture" ? "文化" : ws.category === "magic" ? "魔法" : ws.category === "technology" ? "科技" : "其他"}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                    <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground text-xs h-7" onClick={() => setShowWorldDialog(true)}>
                      <Plus className="size-3 mr-1" />添加设定
                    </Button>
                  </div>
                )}
              </ScrollArea>

              {/* Engineering Layer (Collapsible) */}
              <div className="flex-shrink-0 border-t">
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => {
                    if (engineeringCollapsed) {
                      setPrevCreativeTab(workspaceTab);
                      setEngineeringCollapsed(false);
                      setWorkspaceTab("version");
                    } else {
                      setEngineeringCollapsed(true);
                      setWorkspaceTab(prevCreativeTab);
                    }
                  }}
                >
                  <ChevronDown className={cn("size-3 transition-transform", engineeringCollapsed ? "-rotate-90" : "")} />
                  <GitBranch className={cn("size-3.5", ENGINEERING_TAB.color)} />
                  <span>{ENGINEERING_TAB.label}</span>
                  <Layers className="size-3 ml-auto text-muted-foreground/50" />
                </button>
              </div>

              {/* Chapter List (Always visible at bottom) */}
              <div className="flex-shrink-0 border-t">
                <div className="flex items-center justify-between px-3 py-1.5">
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">章节 ({chapters.length})</p>
                  <Button variant="ghost" size="icon" className="size-5" onClick={() => setCreatingChapter(true)}>
                    <Plus className="size-3" />
                  </Button>
                </div>
                <ScrollArea className="max-h-48">
                  <div className="p-1.5 space-y-0.5">
                    {chapters.map((ch) => (
                      <div
                        key={ch.id}
                        className={cn(
                          "group flex items-center gap-1 rounded-md px-2 py-1 text-xs cursor-pointer transition-colors",
                          selectedChapterId === ch.id ? "bg-primary/10 text-primary" : "hover:bg-muted"
                        )}
                        onClick={() => setSelectedChapter(ch.id)}
                      >
                        <span className="text-muted-foreground w-5 flex-shrink-0 text-[10px]">{ch.chapterNumber}.</span>
                        <span className="flex-1 truncate">{ch.title}</span>
                        <span className="text-[9px] text-muted-foreground flex-shrink-0">{ch.wordCount}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                          onClick={(e) => { e.stopPropagation(); deleteChapter(ch.id); }}
                        >
                          <Trash2 className="size-2.5" />
                        </Button>
                      </div>
                    ))}
                    {chapters.length === 0 && (
                      <p className="text-center text-[10px] text-muted-foreground py-3">暂无章节</p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* ===== Main Content Area: Context-Aware ===== */}
          <ResizablePanel defaultSize={showAgentPanel ? 48 : 82} minSize={25}>
            <div className="flex flex-col h-full">
              {currentChapter ? (
                <>
                  {/* Chapter Editor Header */}
                  <div className="flex items-center gap-2 px-4 py-1.5 border-b flex-shrink-0">
                    <Input value={chapterTitle} onChange={(e) => setChapterTitle(e.target.value)} className="text-base font-semibold border-none shadow-none px-0 h-auto focus-visible:ring-0 flex-1" placeholder="章节标题" onBlur={saveChapter} />
                    <Select value={chapterStatus} onValueChange={(v) => { setChapterStatus(v); setTimeout(saveChapter, 100); }}>
                      <SelectTrigger className="w-20 h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(CHAPTER_STATUS_MAP).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Chapter Editor Body */}
                  <div className="flex-1 overflow-y-auto p-4 md:p-8">
                    <Textarea value={chapterContent} onChange={(e) => handleContentChange(e.target.value)} className="min-h-full w-full resize-none border-none shadow-none bg-transparent text-sm leading-relaxed focus-visible:ring-0 placeholder:text-muted-foreground/50" placeholder="开始写作..." rows={30} />
                  </div>
                  <div className="flex items-center justify-between px-4 py-1 border-t text-[11px] text-muted-foreground flex-shrink-0">
                    <span>{wordCount.toLocaleString()} 字</span>
                    <span>{saving ? "保存中..." : "自动保存"}</span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                  <BookOpen className="size-10" />
                  <p className="text-sm">选择或创建一个章节开始写作</p>
                  <Button size="sm" variant="outline" onClick={() => setCreatingChapter(true)}>
                    <Plus className="size-4 mr-1.5" />创建新章节
                  </Button>
                </div>
              )}
            </div>
          </ResizablePanel>

          {/* ===== AI Agent Panel ===== */}
          {showAgentPanel && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={34} minSize={20} maxSize={55}>
                <div className="flex flex-col h-full border-l">
                  {/* Agent Mode Toggle Header */}
                  <div className="flex items-center justify-between px-3 py-1.5 border-b flex-shrink-0">
                    <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
                      <button className={cn("flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all", agentMode === "orchestrate" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")} onClick={() => setAgentMode("orchestrate")}>
                        <Brain className="size-3.5" />
                        <span>协同编排</span>
                      </button>
                      <button className={cn("flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all", agentMode === "chat" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")} onClick={() => setAgentMode("chat")}>
                        <Bot className="size-3.5" />
                        <span>单 Agent</span>
                      </button>
                    </div>
                    <Select value={selectedModel} onValueChange={(v) => setSelectedModel(v)}>
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

                  {agentMode === "orchestrate" ? (
                    <OrchestrationPanel
                      novelTitle={currentNovel?.title}
                      novelGenre={currentNovel?.genre}
                      novelDescription={currentNovel?.description}
                      chapterContent={chapterContent}
                      characters={characters}
                      novelId={selectedNovelId || undefined}
                      chapterId={selectedChapterId || undefined}
                      selectedModel={selectedModel}
                      onModelChange={setSelectedModel}
                      onAdoptContent={(content) => setChapterContent((prev) => prev + (prev ? "\n\n" : "") + content)}
                    />
                  ) : (
                    <>
                      {/* Chat Mode: Agent Type Selector */}
                      <ScrollArea className="horizontal-only border-b flex-shrink-0">
                        <div className="flex gap-1.5 p-2">
                          {AGENT_DEFINITIONS.map((agent) => (
                            <button key={agent.type} className={cn("flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium transition-colors whitespace-nowrap", selectedAgent === agent.type ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80")} onClick={() => setSelectedAgent(agent.type)}>
                              <Wand2 className="size-2.5" />{agent.name}
                            </button>
                          ))}
                        </div>
                      </ScrollArea>

                      {/* AI Messages */}
                      <ScrollArea className="flex-1 p-3">
                        <div className="space-y-2">
                          {aiMessages.length === 0 && (
                            <div className="text-center py-8">
                              <Sparkles className="size-7 text-amber-400 mx-auto mb-2" />
                              <p className="text-xs text-muted-foreground mb-0.5">{AGENT_DEFINITIONS.find((a) => a.type === selectedAgent)?.name}</p>
                              <p className="text-[10px] text-muted-foreground max-w-[200px] mx-auto">{AGENT_DEFINITIONS.find((a) => a.type === selectedAgent)?.description}</p>
                            </div>
                          )}
                          {aiMessages.map((msg, i) => (
                            <div key={i} className={cn("rounded-lg p-2.5 text-xs", msg.role === "user" ? "bg-primary/10 ml-4" : "bg-muted mr-4")}>
                              {msg.role === "assistant" && msg.agentType && (
                                <Badge variant="outline" className="text-[9px] mb-1">{AGENT_DEFINITIONS.find((a) => a.type === msg.agentType)?.name}</Badge>
                              )}
                              {msg.content ? (
                                <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                              ) : isAgentRunning && streamingText ? (
                                <div className="whitespace-pre-wrap leading-relaxed">{streamingText}<span className="animate-pulse">▊</span></div>
                              ) : null}
                              {msg.role === "assistant" && msg.content && (
                                <div className="flex gap-1 mt-1.5">
                                  <Button variant="ghost" size="sm" className="h-5 text-[9px] px-1.5" onClick={() => setChapterContent((prev) => prev + (prev ? "\n\n" : "") + msg.content)}>采纳到正文</Button>
                                  <Button variant="ghost" size="sm" className="h-5 text-[9px] px-1.5" onClick={() => { navigator.clipboard.writeText(msg.content); }}>复制</Button>
                                </div>
                              )}
                            </div>
                          ))}
                          {isAgentRunning && !streamingText && (
                            <div className="rounded-lg p-2.5 bg-muted mr-4">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Loader2 className="size-3 animate-spin" />连接中...
                              </div>
                            </div>
                          )}
                          <div ref={aiEndRef} />
                        </div>
                      </ScrollArea>

                      {/* Input */}
                      <div className="flex items-center gap-2 p-2 border-t flex-shrink-0">
                        <Input value={aiMessage} onChange={(e) => setAiMessage(e.target.value)} placeholder="输入指令..." className="h-8 text-xs" onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendToAgent(); } }} />
                        {isAgentRunning ? (
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => { if (abortControllerRef.current) abortControllerRef.current.abort(); }}>
                            <Loader2 className="size-3.5" />
                          </Button>
                        ) : (
                          <Button size="sm" className="h-8 w-8 p-0" onClick={sendToAgent} disabled={!aiMessage.trim()}>
                            <Send className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      )}

      {/* ===== Dialogs ===== */}
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
  );
}
