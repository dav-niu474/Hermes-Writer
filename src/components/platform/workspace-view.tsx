"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAppStore } from "@/lib/store";
import {
  AGENT_DEFINITIONS,
  CHAPTER_STATUS_MAP,
  type Chapter,
  type Character,
  type AgentType,
} from "@/lib/types";
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
} from "@/components/ui/dialog";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  Plus,
  Trash2,
  Bot,
  Send,
  Loader2,
  Sparkles,
  ChevronLeft,
  BookOpen,
  Users,
  Globe,
  ArrowLeft,
  Save,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
    activeAgentPanel,
    setActiveAgentPanel,
    isAgentRunning,
    setIsAgentRunning,
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
  const [showAgentPanel, setShowAgentPanel] = useState(false);
  const [creatingChapter, setCreatingChapter] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [showCharacterDialog, setShowCharacterDialog] = useState(false);
  const [charForm, setCharForm] = useState({ name: "", role: "supporting" as const, description: "", personality: "", appearance: "", backstory: "" });
  const [activeTab, setActiveTab] = useState<"chapters" | "characters" | "worldview">("chapters");
  const aiEndRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
        // Auto-select first chapter
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
  }, [selectedNovelId, selectedChapterId, setCurrentNovel, setChapters, setCharacters, setSelectedChapter]);

  useEffect(() => {
    loadNovelData();
  }, [loadNovelData]);

  // Load selected chapter
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

  // Auto-scroll AI messages
  useEffect(() => {
    aiEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiMessages]);

  // Auto-save
  async function saveChapter() {
    if (!selectedChapterId) return;
    setSaving(true);
    try {
      await fetch(`/api/chapters/${selectedChapterId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: chapterTitle,
          content: chapterContent,
          summary: chapterSummary,
          status: chapterStatus,
        }),
      });
    } catch (e) {
      console.error("Save failed:", e);
    } finally {
      setSaving(false);
    }
  }

  function handleContentChange(value: string) {
    setChapterContent(value);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => saveChapter(), 2000);
  }

  async function createChapter() {
    if (!selectedNovelId || !newChapterTitle.trim()) return;
    try {
      const res = await fetch(`/api/novels/${selectedNovelId}/chapters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newChapterTitle }),
      });
      if (res.ok) {
        const ch = await res.json();
        setCreatingChapter(false);
        setNewChapterTitle("");
        setSelectedChapter(ch.id);
        loadNovelData();
      }
    } catch (e) {
      console.error("Failed to create chapter:", e);
    }
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
    } catch (e) {
      console.error("Failed to delete chapter:", e);
    }
  }

  // Agent interaction
  async function sendToAgent() {
    if (!aiMessage.trim() || isAgentRunning) return;
    setIsAgentRunning(true);

    const userMsg = aiMessage;
    setAiMessage("");
    setAiMessages((prev) => [...prev, { role: "user", content: userMsg }]);

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
          chapterContent: selectedAgent === "writer" || selectedAgent === "editor" ? chapterContent : undefined,
          characters: characters.map((c) => `${c.name}(${c.role}): ${c.description}`),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAiMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.output, agentType: data.agentType },
        ]);

        // If writer agent produced content, optionally insert it
        if (selectedAgent === "writer" && data.output) {
          // The output may contain suggested text - we'll add it to a special indicator
        }
      } else {
        const errData = await res.json();
        setAiMessages((prev) => [
          ...prev,
          { role: "assistant", content: `错误: ${errData.error || "生成失败"}` },
        ]);
      }
    } catch (e) {
      setAiMessages((prev) => [
        ...prev,
        { role: "assistant", content: "网络错误，请重试" },
      ]);
    } finally {
      setIsAgentRunning(false);
    }
  }

  // Character management
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
    } catch (e) {
      console.error("Failed to save character:", e);
    }
  }

  if (!selectedNovelId) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
        <BookOpen className="size-16 text-muted-foreground" />
        <div className="text-center">
          <h2 className="text-lg font-medium mb-1">请选择一个作品</h2>
          <p className="text-sm text-muted-foreground">在作品管理中选择或创建一个作品来开始创作</p>
        </div>
        <Button variant="outline" onClick={() => setCurrentView("novels")}>
          <BookOpen className="size-4 mr-2" />
          前往作品管理
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="flex gap-4 h-[calc(100vh-200px)]">
          <Skeleton className="w-64 flex-shrink-0 rounded-lg" />
          <Skeleton className="flex-1 rounded-lg" />
        </div>
      </div>
    );
  }

  const currentChapter = chapters.find((c) => c.id === selectedChapterId);
  const wordCount = chapterContent.length;

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)]">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b px-4 py-2 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="size-8" onClick={() => setCurrentView("novels")}>
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h2 className="text-sm font-semibold truncate max-w-[200px] sm:max-w-[300px]">
              {currentNovel?.title || "未命名作品"}
            </h2>
            {currentChapter && (
              <p className="text-xs text-muted-foreground truncate max-w-[200px] sm:max-w-[300px]">
                {currentChapter.title} · {wordCount.toLocaleString()} 字
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={showAgentPanel ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowAgentPanel(!showAgentPanel)}
                >
                  <Bot className="size-4 mr-1.5" />
                  <span className="hidden sm:inline">AI 助手</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>打开/关闭 AI 助手面板</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button variant="outline" size="sm" onClick={saveChapter} disabled={saving || !selectedChapterId}>
            <Save className="size-4 mr-1.5" />
            <span className="hidden sm:inline">{saving ? "保存中" : "保存"}</span>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Left Sidebar - Chapters & Characters */}
        <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
          <div className="flex flex-col h-full border-r">
            {/* Tab Switcher */}
            <div className="flex border-b flex-shrink-0">
              <button
                className={cn("flex-1 px-3 py-2 text-xs font-medium transition-colors", activeTab === "chapters" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground hover:text-foreground")}
                onClick={() => setActiveTab("chapters")}
              >
                章节
              </button>
              <button
                className={cn("flex-1 px-3 py-2 text-xs font-medium transition-colors", activeTab === "characters" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground hover:text-foreground")}
                onClick={() => setActiveTab("characters")}
              >
                角色
              </button>
            </div>

            <ScrollArea className="flex-1">
              {activeTab === "chapters" && (
                <div className="p-2 space-y-1">
                  {chapters.map((ch) => (
                    <div
                      key={ch.id}
                      className={cn(
                        "group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer transition-colors",
                        selectedChapterId === ch.id
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-muted"
                      )}
                      onClick={() => setSelectedChapter(ch.id)}
                    >
                      <span className="text-muted-foreground text-xs w-6 flex-shrink-0">
                        {ch.chapterNumber}.
                      </span>
                      <span className="flex-1 truncate">{ch.title}</span>
                      {ch.status !== "draft" && (
                        <Badge variant="secondary" className="text-[10px] px-1 py-0">
                          {CHAPTER_STATUS_MAP[ch.status as keyof typeof CHAPTER_STATUS_MAP]?.label}
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteChapter(ch.id);
                        }}
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-muted-foreground"
                    onClick={() => setCreatingChapter(true)}
                  >
                    <Plus className="size-3.5 mr-1.5" />
                    添加章节
                  </Button>
                </div>
              )}

              {activeTab === "characters" && (
                <div className="p-2 space-y-2">
                  {characters.map((char) => (
                    <div
                      key={char.id}
                      className="rounded-md px-2 py-2 text-sm hover:bg-muted cursor-pointer transition-colors"
                      onClick={() => {
                        setSelectedAgent("character");
                        setShowAgentPanel(true);
                        setAiMessage(`分析角色「${char.name}」的设定和发展建议`);
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <div className="size-6 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white text-[10px] font-medium flex-shrink-0">
                          {char.name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-xs truncate">{char.name}</p>
                          <p className="text-[10px] text-muted-foreground">{char.role}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-muted-foreground"
                    onClick={() => setShowCharacterDialog(true)}
                  >
                    <Plus className="size-3.5 mr-1.5" />
                    添加角色
                  </Button>
                </div>
              )}
            </ScrollArea>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Editor */}
        <ResizablePanel defaultSize={showAgentPanel ? 50 : 80} minSize={30}>
          <div className="flex flex-col h-full">
            {currentChapter ? (
              <>
                <div className="flex items-center gap-3 px-4 py-2 border-b flex-shrink-0">
                  <Input
                    value={chapterTitle}
                    onChange={(e) => setChapterTitle(e.target.value)}
                    className="text-lg font-semibold border-none shadow-none px-0 h-auto focus-visible:ring-0"
                    placeholder="章节标题"
                    onBlur={saveChapter}
                  />
                  <Select value={chapterStatus} onValueChange={(v) => { setChapterStatus(v); setTimeout(saveChapter, 100); }}>
                    <SelectTrigger className="w-24 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CHAPTER_STATUS_MAP).map(([k, v]) => (
                        <SelectItem key={k} value={k}>
                          {v.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 overflow-y-auto p-4 md:p-8">
                  <Textarea
                    value={chapterContent}
                    onChange={(e) => handleContentChange(e.target.value)}
                    className="min-h-full w-full resize-none border-none shadow-none bg-transparent text-base leading-relaxed focus-visible:ring-0 placeholder:text-muted-foreground/50"
                    placeholder="开始写作..."
                    rows={20}
                  />
                </div>
                <div className="flex items-center justify-between px-4 py-1.5 border-t text-xs text-muted-foreground flex-shrink-0">
                  <span>{wordCount.toLocaleString()} 字</span>
                  <span>{saving ? "保存中..." : "已保存"}</span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
                <BookOpen className="size-12" />
                <p className="text-sm">选择或创建一个章节开始写作</p>
                <Button size="sm" variant="outline" onClick={() => setCreatingChapter(true)}>
                  <Plus className="size-4 mr-1.5" />
                  创建新章节
                </Button>
              </div>
            )}
          </div>
        </ResizablePanel>

        {/* AI Agent Panel */}
        {showAgentPanel && (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
              <div className="flex flex-col h-full border-l">
                {/* Agent Selector */}
                <div className="flex items-center gap-2 p-3 border-b flex-shrink-0">
                  <Bot className="size-4 text-amber-500" />
                  <span className="text-sm font-medium">AI Agent</span>
                </div>

                {/* Agent Type Selector */}
                <ScrollArea className="horizontal-only border-b flex-shrink-0">
                  <div className="flex gap-2 p-2">
                    {AGENT_DEFINITIONS.map((agent) => (
                      <button
                        key={agent.type}
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap",
                          selectedAgent === agent.type
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        )}
                        onClick={() => setSelectedAgent(agent.type)}
                      >
                        <Wand2 className="size-3" />
                        {agent.name}
                      </button>
                    ))}
                  </div>
                </ScrollArea>

                {/* AI Messages */}
                <ScrollArea className="flex-1 p-3">
                  <div className="space-y-3">
                    {aiMessages.length === 0 && (
                      <div className="text-center py-8">
                        <Sparkles className="size-8 text-amber-400 mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground mb-1">
                          {AGENT_DEFINITIONS.find((a) => a.type === selectedAgent)?.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {AGENT_DEFINITIONS.find((a) => a.type === selectedAgent)?.description}
                        </p>
                      </div>
                    )}
                    {aiMessages.map((msg, i) => (
                      <div
                        key={i}
                        className={cn(
                          "rounded-lg p-3 text-sm",
                          msg.role === "user"
                            ? "bg-primary/10 ml-6"
                            : "bg-muted mr-6"
                        )}
                      >
                        {msg.role === "assistant" && msg.agentType && (
                          <Badge variant="outline" className="text-[10px] mb-1.5">
                            {AGENT_DEFINITIONS.find((a) => a.type === msg.agentType)?.name}
                          </Badge>
                        )}
                        <div className="whitespace-pre-wrap prose prose-sm max-w-none dark:prose-invert">
                          {msg.content}
                        </div>
                        {msg.role === "assistant" && (
                          <div className="flex gap-1 mt-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-[10px] px-2"
                              onClick={() => {
                                if (selectedAgent === "writer") {
                                  const text = msg.content.replace(/^.*?\n\n/, "").trim();
                                  setChapterContent((prev) => prev + (prev ? "\n\n" : "") + text);
                                }
                              }}
                            >
                              采纳到正文
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                    {isAgentRunning && (
                      <div className="rounded-lg p-3 bg-muted mr-6">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="size-3.5 animate-spin" />
                          {AGENT_DEFINITIONS.find((a) => a.type === selectedAgent)?.name}正在思考...
                        </div>
                      </div>
                    )}
                    <div ref={aiEndRef} />
                  </div>
                </ScrollArea>

                {/* Quick Actions */}
                <div className="px-3 py-1 border-t flex gap-1 flex-shrink-0 overflow-x-auto">
                  {selectedAgent === "planner" && (
                    <>
                      <Button size="sm" variant="ghost" className="text-[10px] h-6 px-2" onClick={() => setAiMessage("帮我生成这个故事的大纲")}>
                        生成大纲
                      </Button>
                      <Button size="sm" variant="ghost" className="text-[10px] h-6 px-2" onClick={() => setAiMessage("设计下一个章节的情节")}>
                        下一章情节
                      </Button>
                    </>
                  )}
                  {selectedAgent === "writer" && currentChapter && (
                    <>
                      <Button size="sm" variant="ghost" className="text-[10px] h-6 px-2" onClick={() => setAiMessage("续写当前章节，保持风格一致")}>
                        续写
                      </Button>
                      <Button size="sm" variant="ghost" className="text-[10px] h-6 px-2" onClick={() => setAiMessage("重写这一段，让表达更生动")}>
                        重写优化
                      </Button>
                    </>
                  )}
                  {selectedAgent === "editor" && currentChapter && (
                    <Button size="sm" variant="ghost" className="text-[10px] h-6 px-2" onClick={() => setAiMessage("审核当前章节内容，给出修改建议")}>
                      审核润色
                    </Button>
                  )}
                  {selectedAgent === "character" && (
                    <Button size="sm" variant="ghost" className="text-[10px] h-6 px-2" onClick={() => setAiMessage("帮我分析当前角色设定的一致性")}>
                      角色分析
                    </Button>
                  )}
                  {selectedAgent === "reviewer" && currentChapter && (
                    <Button size="sm" variant="ghost" className="text-[10px] h-6 px-2" onClick={() => setAiMessage("对当前章节进行全面质量评审")}>
                      质量评审
                    </Button>
                  )}
                </div>

                {/* Input */}
                <div className="p-3 border-t flex-shrink-0">
                  <div className="flex gap-2">
                    <Textarea
                      value={aiMessage}
                      onChange={(e) => setAiMessage(e.target.value)}
                      placeholder={`向${AGENT_DEFINITIONS.find((a) => a.type === selectedAgent)?.name}发送指令...`}
                      className="min-h-[60px] max-h-[120px] resize-none text-sm"
                      rows={2}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                          e.preventDefault();
                          sendToAgent();
                        }
                      }}
                    />
                    <Button
                      size="icon"
                      className="self-end flex-shrink-0"
                      onClick={sendToAgent}
                      disabled={!aiMessage.trim() || isAgentRunning}
                    >
                      {isAgentRunning ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Send className="size-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Ctrl+Enter 发送
                  </p>
                </div>
              </div>
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>

      {/* Create Chapter Dialog */}
      <Dialog open={creatingChapter} onOpenChange={setCreatingChapter}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>添加新章节</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="章节标题（可选）"
              value={newChapterTitle}
              onChange={(e) => setNewChapterTitle(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreatingChapter(false)}>
              取消
            </Button>
            <Button onClick={createChapter}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Character Dialog */}
      <Dialog open={showCharacterDialog} onOpenChange={setShowCharacterDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>添加角色</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">角色名称</label>
                <Input value={charForm.name} onChange={(e) => setCharForm({ ...charForm, name: e.target.value })} placeholder="输入名称" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">角色定位</label>
                <Select value={charForm.role} onValueChange={(v: any) => setCharForm({ ...charForm, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="protagonist">主角</SelectItem>
                    <SelectItem value="antagonist">反派</SelectItem>
                    <SelectItem value="supporting">配角</SelectItem>
                    <SelectItem value="minor">路人</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">角色描述</label>
              <Textarea value={charForm.description} onChange={(e) => setCharForm({ ...charForm, description: e.target.value })} placeholder="简要描述角色" rows={2} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">性格特点</label>
              <Textarea value={charForm.personality} onChange={(e) => setCharForm({ ...charForm, personality: e.target.value })} placeholder="描述性格特征" rows={2} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">外貌特征</label>
              <Textarea value={charForm.appearance} onChange={(e) => setCharForm({ ...charForm, appearance: e.target.value })} placeholder="描述外貌" rows={2} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">背景故事</label>
              <Textarea value={charForm.backstory} onChange={(e) => setCharForm({ ...charForm, backstory: e.target.value })} placeholder="背景经历" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCharacterDialog(false)}>取消</Button>
            <Button onClick={saveCharacter} disabled={!charForm.name.trim()}>保存角色</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
