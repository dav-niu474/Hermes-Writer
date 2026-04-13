"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAppStore } from "@/lib/store";
import {
  AGENT_DEFINITIONS,
  CHAPTER_STATUS_MAP,
  type LLMModel,
  type Chapter,
  type Character,
  type WorldSetting,
  type AgentType,
  type WorldSettingCategory,
} from "@/lib/types";
import { AVAILABLE_MODELS } from "@/lib/ai";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Plus,
  Trash2,
  Bot,
  GitBranch,
  Send,
  Loader2,
  Sparkles,
  BookOpen,
  Save,
  Wand2,
  ArrowLeft,
  Download,
  FileText,
  FileDown,
  Globe,
  Users,
  History,
  BarChart3,
  Settings,
  ChevronDown,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { VersionPanel } from "@/components/platform/version-panel";

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
  const [showAgentPanel, setShowAgentPanel] = useState(false);
  const [creatingChapter, setCreatingChapter] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [showCharacterDialog, setShowCharacterDialog] = useState(false);
  const [showWorldDialog, setShowWorldDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showTaskHistory, setShowTaskHistory] = useState(false);
  const [showStatsPanel, setShowStatsPanel] = useState(false);
  const [charForm, setCharForm] = useState({ name: "", role: "supporting" as const, description: "", personality: "", appearance: "", backstory: "" });
  const [worldForm, setWorldForm] = useState({ name: "", category: "geography" as WorldSettingCategory, description: "" });
  const [leftTab, setLeftTab] = useState<"chapters" | "characters" | "worldview" | "version">("chapters");
  const [agentTasks, setAgentTasks] = useState<any[]>([]);
  const [streamingText, setStreamingText] = useState("");
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

  // Auto-save
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

  // World settings
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

  async function deleteWorldSetting(id: string) {
    try {
      await fetch(`/api/world-settings?id=${id}`, { method: "DELETE" });
      loadNovelData();
    } catch (e) { console.error("Failed:", e); }
  }

  // Character
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

  // Agent tasks
  async function loadAgentTasks() {
    if (!selectedNovelId) return;
    try {
      const res = await fetch(`/api/agent-tasks?novelId=${selectedNovelId}`);
      if (res.ok) setAgentTasks(await res.json());
    } catch (e) { console.error("Failed:", e); }
  }

  // Agent interaction with streaming
  async function sendToAgent() {
    if (!aiMessage.trim() || isAgentRunning) return;
    setIsAgentRunning(true);

    const userMsg = aiMessage;
    setAiMessage("");
    setAiMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setStreamingText("");

    // Add placeholder for assistant response
    const assistantIdx = aiMessages.length + 1;
    setAiMessages((prev) => [...prev, { role: "assistant", content: "", agentType: selectedAgent }]);

    abortControllerRef.current = new AbortController();

    try {
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

        // Update the assistant message incrementally
        setAiMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: fullText, agentType: selectedAgent };
          return updated;
        });
      }

      setStreamingText("");
      loadAgentTasks();
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

  function stopGeneration() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
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

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b px-3 py-1.5 flex-shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" className="size-8 flex-shrink-0" onClick={() => setCurrentView("novels")}>
            <ArrowLeft className="size-4" />
          </Button>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold truncate">{currentNovel?.title}</h2>
            {currentChapter && (
              <p className="text-[11px] text-muted-foreground truncate">{currentChapter.title} · {wordCount.toLocaleString()} 字</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => { loadAgentTasks(); setShowTaskHistory(true); }}>
                  <History className="size-3.5" /><span className="hidden sm:inline">任务记录</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>查看 Agent 任务历史</TooltipContent>
            </Tooltip>
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
                  <Bot className="size-3.5" /><span className="hidden sm:inline">AI 助手</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>打开/关闭 AI 助手面板</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={saveChapter} disabled={saving || !selectedChapterId}>
            <Save className="size-3.5" /><span className="hidden sm:inline">{saving ? "保存中" : "保存"}</span>
          </Button>
        </div>
      </div>

      {/* Stats Bar */}
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

      {/* Main Content */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Left Sidebar */}
        <ResizablePanel defaultSize={18} minSize={14} maxSize={28}>
          <div className="flex flex-col h-full border-r">
            <div className="flex border-b flex-shrink-0">
              {(["chapters", "characters", "worldview", "version"] as const).map((tab) => (
                <button
                  key={tab}
                  className={cn("flex-1 px-2 py-2 text-[11px] font-medium transition-colors", leftTab === tab ? "border-b-2 border-primary text-foreground" : "text-muted-foreground hover:text-foreground")}
                  onClick={() => setLeftTab(tab)}
                >
                  {tab === "chapters" ? "章节" : tab === "characters" ? "角色" : tab === "worldview" ? "世界" : "版本"}
                </button>
              ))}
            </div>

            <ScrollArea className="flex-1">
              {leftTab === "chapters" && (
                <div className="p-1.5 space-y-0.5">
                  {chapters.map((ch) => (
                    <div key={ch.id} className={cn("group flex items-center gap-1 rounded-md px-2 py-1 text-xs cursor-pointer transition-colors", selectedChapterId === ch.id ? "bg-primary/10 text-primary" : "hover:bg-muted")} onClick={() => setSelectedChapter(ch.id)}>
                      <span className="text-muted-foreground w-5 flex-shrink-0 text-[10px]">{ch.chapterNumber}.</span>
                      <span className="flex-1 truncate">{ch.title}</span>
                      <span className="text-[9px] text-muted-foreground flex-shrink-0">{ch.wordCount}</span>
                      <Button variant="ghost" size="icon" className="size-5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" onClick={(e) => { e.stopPropagation(); deleteChapter(ch.id); }}>
                        <Trash2 className="size-2.5" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground text-xs h-7" onClick={() => setCreatingChapter(true)}>
                    <Plus className="size-3 mr-1" />添加章节
                  </Button>
                </div>
              )}

              {leftTab === "characters" && (
                <div className="p-1.5 space-y-1">
                  {characters.map((char) => (
                    <div key={char.id} className="rounded-md px-2 py-1.5 hover:bg-muted cursor-pointer transition-colors" onClick={() => { setSelectedAgent("character"); setShowAgentPanel(true); setAiMessage(`分析角色「${char.name}」的设定和发展建议`); }}>
                      <div className="flex items-center gap-2">
                        <div className="size-5 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white text-[9px] font-medium flex-shrink-0">{char.name[0]}</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[11px] truncate">{char.name}</p>
                          <p className="text-[9px] text-muted-foreground">{char.role}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground text-xs h-7" onClick={() => setShowCharacterDialog(true)}>
                    <Plus className="size-3 mr-1" />添加角色
                  </Button>
                </div>
              )}

              {leftTab === "worldview" && (
                <div className="p-1.5 space-y-1" key="worldview-content">
                  {(worldSettings || []).map((ws: WorldSetting) => (
                    <div key={ws.id} className="group rounded-md px-2 py-1.5 hover:bg-muted cursor-pointer transition-colors" onClick={() => { setSelectedAgent("worldbuilder"); setShowAgentPanel(true); setAiMessage(`完善「${ws.name}」的设定：${ws.description}`); }}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[11px] truncate">{ws.name}</p>
                          <p className="text-[9px] text-muted-foreground truncate">{ws.description || ws.category}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="size-5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" onClick={(e) => { e.stopPropagation(); deleteWorldSetting(ws.id); }}>
                          <Trash2 className="size-2.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground text-xs h-7" onClick={() => setShowWorldDialog(true)}>
                    <Plus className="size-3 mr-1" />添加设定
                  </Button>
                </div>
              )}

              {leftTab === "version" && (
                <VersionPanel />
              )}
            </ScrollArea>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Editor */}
        <ResizablePanel defaultSize={showAgentPanel ? 48 : 82} minSize={25}>
          <div className="flex flex-col h-full">
            {currentChapter ? (
              <>
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

        {/* AI Agent Panel */}
        {showAgentPanel && (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={34} minSize={20} maxSize={55}>
              <div className="flex flex-col h-full border-l">
                {/* Agent Header */}
                <div className="flex items-center justify-between px-3 py-2 border-b flex-shrink-0">
                  <div className="flex items-center gap-1.5">
                    <Bot className="size-4 text-amber-500" />
                    <span className="text-sm font-medium">AI Agent</span>
                  </div>
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger className="h-6 w-[130px] text-[10px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {AVAILABLE_MODELS.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          <div className="flex items-center gap-1.5">
                            <span>{m.name}</span>
                            <span className="text-[9px] text-muted-foreground">{m.provider}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Agent Type Selector */}
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
                        <div className="flex items-center gap-1 justify-center mt-2">
                          <Badge variant="outline" className="text-[9px]">{AVAILABLE_MODELS.find((m) => m.id === selectedModel)?.name}</Badge>
                        </div>
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

                {/* Quick Actions */}
                <div className="px-2 py-1 border-t flex gap-1 flex-shrink-0 overflow-x-auto">
                  {selectedAgent === "planner" && (
                    <>
                      <Button size="sm" variant="ghost" className="text-[9px] h-5 px-1.5" onClick={() => setAiMessage("帮我生成这个故事的大纲")}>生成大纲</Button>
                      <Button size="sm" variant="ghost" className="text-[9px] h-5 px-1.5" onClick={() => setAiMessage("设计下一个章节的情节")}>下一章情节</Button>
                    </>
                  )}
                  {selectedAgent === "writer" && currentChapter && (
                    <>
                      <Button size="sm" variant="ghost" className="text-[9px] h-5 px-1.5" onClick={() => setAiMessage("续写当前章节，保持风格一致")}>续写</Button>
                      <Button size="sm" variant="ghost" className="text-[9px] h-5 px-1.5" onClick={() => setAiMessage("写一段精彩的对话场景")}>对话场景</Button>
                      <Button size="sm" variant="ghost" className="text-[9px] h-5 px-1.5" onClick={() => setAiMessage("写一段激烈的打斗场景")}>打斗场景</Button>
                    </>
                  )}
                  {selectedAgent === "editor" && currentChapter && (
                    <>
                      <Button size="sm" variant="ghost" className="text-[9px] h-5 px-1.5" onClick={() => setAiMessage("润色当前内容")}>润色</Button>
                      <Button size="sm" variant="ghost" className="text-[9px] h-5 px-1.5" onClick={() => setAiMessage("检查逻辑和一致性")}>逻辑检查</Button>
                    </>
                  )}
                  {selectedAgent === "character" && (
                    <Button size="sm" variant="ghost" className="text-[9px] h-5 px-1.5" onClick={() => setAiMessage("分析当前角色设定的一致性")}>角色分析</Button>
                  )}
                  {selectedAgent === "worldbuilder" && (
                    <Button size="sm" variant="ghost" className="text-[9px] h-5 px-1.5" onClick={() => setAiMessage("帮我完善世界观设定")}>完善世界观</Button>
                  )}
                  {selectedAgent === "reviewer" && currentChapter && (
                    <Button size="sm" variant="ghost" className="text-[9px] h-5 px-1.5" onClick={() => setAiMessage("对当前章节进行全面质量评审")}>质量评审</Button>
                  )}
                  {selectedAgent === "hermes" && (
                    <Button size="sm" variant="ghost" className="text-[9px] h-5 px-1.5" onClick={() => setAiMessage("分析当前创作进度，给出下一步创作建议")}>创作建议</Button>
                  )}
                </div>

                {/* Input */}
                <div className="p-2 border-t flex-shrink-0">
                  <div className="flex gap-1.5">
                    <Textarea value={aiMessage} onChange={(e) => setAiMessage(e.target.value)} placeholder={`向${AGENT_DEFINITIONS.find((a) => a.type === selectedAgent)?.name}发送指令...`} className="min-h-[48px] max-h-[100px] resize-none text-xs" rows={2} onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); sendToAgent(); } }} />
                    <div className="flex flex-col gap-1">
                      {isAgentRunning ? (
                        <Button size="icon" className="self-end size-8 bg-destructive text-white hover:bg-destructive/90" onClick={stopGeneration}>
                          <XCircle className="size-3.5" />
                        </Button>
                      ) : (
                        <Button size="icon" className="self-end size-8" onClick={sendToAgent} disabled={!aiMessage.trim()}>
                          <Send className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-[9px] text-muted-foreground mt-0.5">Ctrl+Enter 发送 · {AVAILABLE_MODELS.find((m) => m.id === selectedModel)?.name}</p>
                </div>
              </div>
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>

      {/* Create Chapter Dialog */}
      <Dialog open={creatingChapter} onOpenChange={setCreatingChapter}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>添加新章节</DialogTitle><DialogDescription>创建一个新章节开始写作</DialogDescription></DialogHeader>
          <div className="py-3"><Input placeholder="章节标题（可选，默认自动编号）" value={newChapterTitle} onChange={(e) => setNewChapterTitle(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") createChapter(); }} /></div>
          <DialogFooter><Button variant="outline" onClick={() => setCreatingChapter(false)}>取消</Button><Button onClick={createChapter}>创建</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Character Dialog */}
      <Dialog open={showCharacterDialog} onOpenChange={setShowCharacterDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>添加角色</DialogTitle><DialogDescription>创建新的角色设定</DialogDescription></DialogHeader>
          <div className="grid gap-3 py-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-muted-foreground mb-1 block">角色名称 *</label><Input value={charForm.name} onChange={(e) => setCharForm({ ...charForm, name: e.target.value })} placeholder="输入名称" /></div>
              <div><label className="text-xs text-muted-foreground mb-1 block">角色定位</label><Select value={charForm.role} onValueChange={(v: any) => setCharForm({ ...charForm, role: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="protagonist">主角</SelectItem><SelectItem value="antagonist">反派</SelectItem><SelectItem value="supporting">配角</SelectItem><SelectItem value="minor">路人</SelectItem></SelectContent></Select></div>
            </div>
            <div><label className="text-xs text-muted-foreground mb-1 block">角色描述</label><Textarea value={charForm.description} onChange={(e) => setCharForm({ ...charForm, description: e.target.value })} placeholder="简要描述角色" rows={2} /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">性格特点</label><Textarea value={charForm.personality} onChange={(e) => setCharForm({ ...charForm, personality: e.target.value })} placeholder="描述性格特征" rows={2} /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">外貌特征</label><Textarea value={charForm.appearance} onChange={(e) => setCharForm({ ...charForm, appearance: e.target.value })} placeholder="描述外貌" rows={2} /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">背景故事</label><Textarea value={charForm.backstory} onChange={(e) => setCharForm({ ...charForm, backstory: e.target.value })} placeholder="背景经历" rows={2} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowCharacterDialog(false)}>取消</Button><Button onClick={saveCharacter} disabled={!charForm.name.trim()}>保存</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* World Setting Dialog */}
      <Dialog open={showWorldDialog} onOpenChange={setShowWorldDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>添加世界观设定</DialogTitle><DialogDescription>创建新的世界观设定项</DialogDescription></DialogHeader>
          <div className="grid gap-3 py-3">
            <div><label className="text-xs text-muted-foreground mb-1 block">设定名称 *</label><Input value={worldForm.name} onChange={(e) => setWorldForm({ ...worldForm, name: e.target.value })} placeholder="如：灵气体系" /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">分类</label><Select value={worldForm.category} onValueChange={(v: any) => setWorldForm({ ...worldForm, category: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="geography">地理</SelectItem><SelectItem value="history">历史</SelectItem><SelectItem value="culture">文化</SelectItem><SelectItem value="magic">魔法/修真</SelectItem><SelectItem value="technology">科技</SelectItem><SelectItem value="other">其他</SelectItem></SelectContent></Select></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">详细描述</label><Textarea value={worldForm.description} onChange={(e) => setWorldForm({ ...worldForm, description: e.target.value })} placeholder="描述这个设定" rows={4} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowWorldDialog(false)}>取消</Button><Button onClick={saveWorldSetting} disabled={!worldForm.name.trim()}>保存</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>导出作品</DialogTitle><DialogDescription>选择导出格式</DialogDescription></DialogHeader>
          <div className="grid gap-3 py-4">
            <button className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted transition-colors" onClick={() => handleExport("txt")}>
              <FileText className="size-5 text-muted-foreground" />
              <div className="text-left"><p className="text-sm font-medium">纯文本 (TXT)</p><p className="text-[11px] text-muted-foreground">通用格式，兼容所有阅读器</p></div>
            </button>
            <button className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted transition-colors" onClick={() => handleExport("md")}>
              <FileDown className="size-5 text-muted-foreground" />
              <div className="text-left"><p className="text-sm font-medium">Markdown (MD)</p><p className="text-[11px] text-muted-foreground">支持格式化，适合二次编辑</p></div>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Agent Task History Dialog */}
      <Dialog open={showTaskHistory} onOpenChange={setShowTaskHistory}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh]">
          <DialogHeader><DialogTitle>Agent 任务记录</DialogTitle><DialogDescription>查看所有 AI Agent 的操作历史</DialogDescription></DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            {agentTasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">暂无任务记录</div>
            ) : (
              <div className="space-y-2">
                {agentTasks.map((task: any) => (
                  <div key={task.id} className="rounded-lg border p-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">{AGENT_DEFINITIONS.find((a) => a.type === task.agentType)?.name}</Badge>
                        {task.status === "completed" ? <CheckCircle2 className="size-3 text-emerald-500" /> : task.status === "running" ? <Loader2 className="size-3 text-blue-500 animate-spin" /> : <XCircle className="size-3 text-red-500" />}
                      </div>
                      <span className="text-[10px] text-muted-foreground">{new Date(task.createdAt).toLocaleString("zh-CN")}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{task.input}</p>
                    {task.output && <p className="text-xs line-clamp-2">{task.output}</p>}
                    {task.errorMessage && <p className="text-xs text-destructive">{task.errorMessage}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
