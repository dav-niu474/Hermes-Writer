"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useAppStore } from "@/lib/store";
import {
  CHAPTER_STATUS_MAP,
  type Chapter,
  type AgentType,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  ChevronRight,
  Map,
  Users,
  Globe,
  Shield,
  Palette,
  Eye,
  Pencil,
  Copy,
  Trash2,
  BookMarked,
  Target,
  PenLine,
  Wand2,
  MessageSquare,
  Brain,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  Maximize2,
  Minimize2,
  GripVertical,
  Check,
  PenTool,
  Paintbrush,
  Expand,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Stub imports
import { AiAssistantDrawer } from "@/components/platform/ai-assistant-drawer";
import { StoryWizard } from "@/components/platform/story-wizard";
import { OrchestrationPanel } from "@/components/platform/orchestration-panel";

// ===== Types =====
interface NovelSpec {
  id: string;
  novelId: string;
  category: string;
  title: string;
  content: string;
  version: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

type SpecCategory = "outline" | "characters" | "worldbuilding" | "rules" | "style";

// ===== Category Config =====
const SPEC_CATEGORIES: {
  value: SpecCategory;
  label: string;
  icon: typeof Map;
  color: string;
  bgColor: string;
  agentType: AgentType;
  aiLabel: string;
}[] = [
  { value: "outline", label: "大纲", icon: Map, color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-50 dark:bg-amber-900/30", agentType: "planner", aiLabel: "生成大纲" },
  { value: "characters", label: "角色", icon: Users, color: "text-rose-600 dark:text-rose-400", bgColor: "bg-rose-50 dark:bg-rose-900/30", agentType: "character", aiLabel: "生成角色" },
  { value: "worldbuilding", label: "世界观", icon: Globe, color: "text-orange-600 dark:text-orange-400", bgColor: "bg-orange-50 dark:bg-orange-900/30", agentType: "worldbuilder", aiLabel: "生成世界观" },
  { value: "rules", label: "规则", icon: Shield, color: "text-emerald-600 dark:text-emerald-400", bgColor: "bg-emerald-50 dark:bg-emerald-900/30", agentType: "reviewer", aiLabel: "生成规则" },
  { value: "style", label: "风格", icon: Palette, color: "text-violet-600 dark:text-violet-400", bgColor: "bg-violet-50 dark:bg-violet-900/30", agentType: "editor", aiLabel: "生成风格" },
];

function getCategoryConfig(category: string) {
  return SPEC_CATEGORIES.find((c) => c.value === category) || SPEC_CATEGORIES[4];
}

// ===== Templates =====
const SPEC_TEMPLATES: Record<string, string> = {
  outline: `# 故事大纲

## 核心设定
- **故事类型**：
- **核心冲突**：
- **主题思想**：

## 角色概览
| 角色 | 身份 | 性格特征 | 故事功能 |
|------|------|----------|----------|
| 主角 | | | |

## 伏笔追踪
| 伏笔 | 埋设章节 | 回收章节 | 状态 |
|------|----------|----------|------|
| | | | 待埋设 |

---

### 第一幕：起

**核心事件**：

**情节要点**：
1.
2.
3.

---

### 第二幕：承转

**核心事件**：

**情节要点**：
1.
2.
3.

---

### 第三幕：合

**核心事件**：

**情节要点**：
1.
2.
3.
`,
  characters: `# 角色设定

## 主角
### 基本信息
- **姓名**：
- **年龄**：
- **外貌**：

### 性格特征
-

### 背景故事
-

### 角色弧线
- **起点**：
- **转折点**：
- **终点**：

---

## 配角

### 角色一
- **姓名**：
- **与主角关系**：
- **性格特点**：

---

## 角色关系图
- 主角 ←→ 反派：对立关系
- 主角 ←→ 导师：师徒关系
`,
  worldbuilding: `# 世界观设定

## 基础框架
- **世界名称**：
- **世界类型**：
- **时代背景**：

## 力量体系
- **体系名称**：
- **等级划分**：
- **核心规则**：

## 地理环境
-

## 社会结构
-

## 文化风俗
-
`,
  rules: `# 创作规则

## 必须遵守
1.
2.
3.

## 禁止事项
1.
2.

## 特殊约定
-
`,
  style: `# 风格指南

## 叙事风格
- **人称**：
- **语调**：

## 语言特点
-

## 对话风格
-

## 节奏控制
| 段落类型 | 节奏 | 字数占比 |
|----------|------|----------|
| 动作戏 | 快 | 30% |
| 情感戏 | 慢 | 25% |
| 描写 | 中 | 25% |
| 对话 | 中 | 20% |
`,
};

// ===== Main Component =====
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
    isAgentRunning,
    setIsAgentRunning,
    setIsCreatingNovel,
    setCurrentView,
    agentConfigs,
  } = useAppStore();

  // ===== Core state =====
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Spec state
  const [specs, setSpecs] = useState<NovelSpec[]>([]);
  const [selectedSpecId, setSelectedSpecId] = useState<string | null>(null);
  const [specContent, setSpecContent] = useState("");
  const [specEditing, setSpecEditing] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    outline: true,
    characters: true,
    worldbuilding: false,
    rules: false,
    style: false,
  });
  const [specsLoading, setSpecsLoading] = useState(true);

  // Chapter editing state
  const [chapterTitle, setChapterTitle] = useState("");
  const [chapterContent, setChapterContent] = useState("");
  const [chapterSummary, setChapterSummary] = useState("");
  const [chapterStatus, setChapterStatus] = useState<string>("draft");

  // AI state
  const [aiGenerating, setAiGenerating] = useState<SpecCategory | null>(null);
  const [aiMessage, setAiMessage] = useState("");
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [showOrchestration, setShowOrchestration] = useState(false);
  const [aiPrefill, setAiPrefill] = useState<string>("");

  // Dialog state
  const [showCreateSpec, setShowCreateSpec] = useState(false);
  const [newSpecCategory, setNewSpecCategory] = useState<SpecCategory>("outline");
  const [newSpecTitle, setNewSpecTitle] = useState("");
  const [showCreateChapter, setShowCreateChapter] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showStoryWizard, setShowStoryWizard] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // UI state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ===== Derived state =====
  const currentChapter = chapters.find((c) => c.id === selectedChapterId);
  const selectedSpec = specs.find((s) => s.id === selectedSpecId);
  const wordCount = selectedSpec ? specContent.length : chapterContent.length;
  const totalWords = chapters.reduce((sum, c) => sum + c.wordCount, 0) + chapterContent.length;
  const completedChapters = chapters.filter((c) => c.status === "completed").length;
  const progressPercent = chapters.length > 0 ? Math.round((completedChapters / chapters.length) * 100) : 0;
  const sidebarHidden = sidebarCollapsed || focusMode;

  // Writing stats for chapter editor
  const paragraphCount = useMemo(() => {
    return chapterContent.split(/\n\s*\n/).filter((p) => p.trim().length > 0).length;
  }, [chapterContent]);
  const readingTime = useMemo(() => {
    const minutes = Math.ceil(chapterContent.length / 500);
    return minutes < 1 ? "< 1" : String(minutes);
  }, [chapterContent]);

  // Group specs by category
  const specsByCategory = useMemo(() => {
    const grouped: Record<string, NovelSpec[]> = {};
    for (const cat of SPEC_CATEGORIES) {
      grouped[cat.value] = specs.filter((s) => s.category === cat.value);
    }
    return grouped;
  }, [specs]);

  // Filtered specs/chapters based on search
  const filteredSpecsByCategory = useMemo(() => {
    if (!searchQuery.trim()) return specsByCategory;
    const q = searchQuery.toLowerCase().trim();
    const filtered: Record<string, NovelSpec[]> = {};
    for (const cat of SPEC_CATEGORIES) {
      filtered[cat.value] = (specsByCategory[cat.value] || []).filter(
        (s) => s.title.toLowerCase().includes(q) || s.content.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [specsByCategory, searchQuery]);

  const filteredChapters = useMemo(() => {
    if (!searchQuery.trim()) return chapters;
    const q = searchQuery.toLowerCase().trim();
    return chapters.filter(
      (ch) => ch.title.toLowerCase().includes(q) || ch.content.toLowerCase().includes(q)
    );
  }, [chapters, searchQuery]);

  // ===== Data Loading =====
  const loadSpecs = useCallback(async () => {
    if (!selectedNovelId) return;
    setSpecsLoading(true);
    try {
      const res = await fetch(`/api/specs?novelId=${selectedNovelId}`);
      if (res.ok) setSpecs(await res.json());
    } catch (e) {
      console.error("Failed to load specs:", e);
    } finally {
      setSpecsLoading(false);
    }
  }, [selectedNovelId]);

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
    loadSpecs();
  }, [loadNovelData, loadSpecs]);

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

  // Reload specs when orchestration panel closes (it auto-saves content)
  useEffect(() => {
    if (!showOrchestration) {
      loadSpecs();
      loadNovelData();
    }
  }, [showOrchestration]);

  // Ctrl+S keyboard shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (selectedSpecId) saveSpecContent();
        else if (selectedChapterId) saveChapter();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedSpecId, selectedChapterId]);

  // ===== Navigation =====
  function handleSelectSpec(spec: NovelSpec) {
    setSelectedSpecId(spec.id);
    setSpecContent(spec.content);
    setSpecEditing(false);
    // Don't deselect chapter - they're independent
  }

  function handleSelectChapter(chId: string) {
    setSelectedChapter(chId);
    // Don't deselect spec - they're independent
  }

  function handleDeselectSpec() {
    setSelectedSpecId(null);
    setSpecContent("");
    setSpecEditing(false);
  }

  // ===== Chapter AI Action =====
  function handleChapterAIAction(chapter: Chapter, action: "continue" | "polish" | "expand") {
    const chContent = chapter.id === selectedChapterId
      ? chapterContent
      : chapter.content;
    const prompts: Record<string, string> = {
      continue: `请根据当前章节内容，续写接下来的故事（约800-1500字）。保持与已有内容风格一致，自然衔接。\n\n当前章节内容：\n${chContent.slice(0, 2000)}`,
      polish: `请对以下文本进行润色优化，提升文字表达力和画面感，保持原有风格和叙事视角。输出润色后的完整文本。\n\n当前章节内容：\n${chContent.slice(0, 3000)}`,
      expand: `请对以下内容进行扩写，增加更多细节描写、对话和心理活动，使场景更加丰满（约扩写一倍）。输出扩写后的完整文本。\n\n当前章节内容：\n${chContent.slice(0, 2000)}`,
    };
    setAiPrefill(prompts[action]);
    if (chapter.id !== selectedChapterId) {
      setSelectedChapter(chapter.id);
    }
    setShowAiAssistant(true);
  }

  // ===== Spec CRUD =====
  async function createSpec() {
    if (!selectedNovelId || !newSpecTitle.trim()) return;
    try {
      const content = SPEC_TEMPLATES[newSpecCategory] || "";
      const res = await fetch("/api/specs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          novelId: selectedNovelId,
          category: newSpecCategory,
          title: newSpecTitle.trim(),
          content,
        }),
      });
      if (res.ok) {
        const spec = await res.json();
        setShowCreateSpec(false);
        setNewSpecTitle("");
        setSelectedSpecId(spec.id);
        setSpecContent(spec.content);
        setSpecEditing(true);
        setExpandedCategories((prev) => ({ ...prev, [newSpecCategory]: true }));
        loadSpecs();
      }
    } catch (e) {
      console.error("Failed to create spec:", e);
    }
  }

  async function saveSpecContent() {
    if (!selectedSpec) return;
    setSaving(true);
    try {
      await fetch(`/api/specs/${selectedSpec.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: specContent }),
      });
      loadSpecs();
      setLastSaved(new Date());
    } catch (e) {
      console.error("Failed to save spec:", e);
    } finally {
      setSaving(false);
      setSpecEditing(false);
    }
  }

  async function deleteSpec(id: string) {
    try {
      await fetch(`/api/specs/${id}`, { method: "DELETE" });
      if (selectedSpecId === id) {
        setSelectedSpecId(null);
        setSpecContent("");
        setSpecEditing(false);
      }
      setDeleteConfirmId(null);
      loadSpecs();
    } catch (e) {
      console.error("Failed to delete spec:", e);
    }
  }

  // ===== Chapter CRUD =====
  async function saveChapter() {
    if (!selectedChapterId) return;
    setSaving(true);
    try {
      await fetch(`/api/chapters/${selectedChapterId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: chapterTitle, content: chapterContent, summary: chapterSummary, status: chapterStatus }),
      });
      setLastSaved(new Date());
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
        setShowCreateChapter(false);
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

  // ===== AI Generation (write directly to spec) =====
  async function handleSpecAIGenerate(category: SpecCategory) {
    if (!selectedNovelId) return;
    const catConfig = getCategoryConfig(category);
    setAiGenerating(category);

    try {
      const novelContext = [
        currentNovel?.title ? `作品名：${currentNovel.title}` : "",
        currentNovel?.genre ? `类型：${currentNovel.genre}` : "",
        currentNovel?.description ? `简介：${currentNovel.description}` : "",
        characters.length > 0 ? `已有角色：${characters.map((c) => `${c.name}(${c.role})`).join("、")}` : "",
      ].filter(Boolean).join("\n");

      // Also include existing specs as context
      const existingSpecs = specs.filter((s) => s.category === category);
      const existingContent = existingSpecs.length > 0
        ? `\n\n现有${catConfig.label}内容（请在此基础上优化和扩展）：\n${existingSpecs[0].content.slice(0, 2000)}`
        : "";

      const res = await fetch("/api/agents/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentType: catConfig.agentType,
          novelId: selectedNovelId,
          message: `请为小说《${currentNovel?.title || ""}》生成完整的${catConfig.label}文档。${existingContent}`,
          novelTitle: currentNovel?.title,
          novelGenre: currentNovel?.genre,
          novelDescription: currentNovel?.description,
          characters: characters.map((c) => `${c.name}(${c.role}): ${c.description}`),
          specCategory: category,
          stream: false,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const generatedContent = data.output || data.content || data.text || "";

        if (generatedContent) {
          if (existingSpecs.length > 0) {
            // Update existing spec
            await fetch(`/api/specs/${existingSpecs[0].id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ content: generatedContent }),
            });
            if (selectedSpecId === existingSpecs[0].id) {
              setSpecContent(generatedContent);
            }
            setSelectedSpecId(existingSpecs[0].id);
            setSpecContent(generatedContent);
          } else {
            // Create new spec
            const newRes = await fetch("/api/specs", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                novelId: selectedNovelId,
                category,
                title: `${currentNovel?.title || "小说"} - ${catConfig.label}`,
                content: generatedContent,
              }),
            });
            if (newRes.ok) {
              const newSpec = await newRes.json();
              setSelectedSpecId(newSpec.id);
              setSpecContent(newSpec.content);
            }
          }
          setExpandedCategories((prev) => ({ ...prev, [category]: true }));
          loadSpecs();
        }
      }
    } catch (e) {
      console.error("AI generation failed:", e);
    } finally {
      setAiGenerating(null);
    }
  }

  // ===== Export =====
  function handleExport(format: string) {
    if (!selectedNovelId) return;
    const url = `/api/export?novelId=${selectedNovelId}&format=${format}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentNovel?.title || "novel"}.${format}`;
    a.click();
    setShowExportMenu(false);
  }

  // ===== No novel selected =====
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

  // ===== Loading =====
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
        {/* ===== Top Bar ===== */}
        <header className="flex items-center justify-between h-11 px-2 flex-shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center gap-2 min-w-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8 flex-shrink-0" onClick={() => setCurrentView("novels")}>
                  <ArrowLeft className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>返回作品列表</TooltipContent>
            </Tooltip>

            <div className="min-w-0 flex items-center gap-2">
              <h2 className="text-sm font-semibold truncate max-w-[200px]">{currentNovel?.title}</h2>
              {currentChapter && !selectedSpec && (
                <>
                  <span className="text-muted-foreground/50">·</span>
                  <span className="text-xs text-muted-foreground truncate">{currentChapter?.title}</span>
                </>
              )}
              {selectedSpec && (
                <>
                  <span className="text-muted-foreground/50">·</span>
                  <span className="text-xs text-muted-foreground truncate">{selectedSpec.title}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-0.5">
            <ToolbarButton icon={<Wand2 className="size-4" />} tooltip="AI 一键创作" onClick={() => setShowStoryWizard(true)} />
            <ToolbarButton icon={<MessageSquare className="size-4" />} tooltip="AI 助手" onClick={() => { setAiPrefill(""); setShowAiAssistant(true); }} />
            <ToolbarButton icon={<Brain className="size-4" />} tooltip="协同编排" onClick={() => setShowOrchestration(true)} />

            <div className="w-px h-5 bg-border mx-1" />

            <DropdownMenu open={showExportMenu} onOpenChange={setShowExportMenu}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8"><Download className="size-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport("txt")}><FileText className="size-3.5 mr-2" />纯文本 (.txt)</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("md")}><FileText className="size-3.5 mr-2" />Markdown (.md)</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("json")}><FileText className="size-3.5 mr-2" />JSON (.json)</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <ToolbarButton
              icon={saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              tooltip={saving ? "保存中..." : "保存 (Ctrl+S)"}
              onClick={() => { if (selectedSpecId) saveSpecContent(); else saveChapter(); }}
              disabled={saving}
            />
          </div>
        </header>

        {/* ===== Main Body: Sidebar + Content ===== */}
        <div className="flex flex-1 min-h-0">
          {/* ===== Left Sidebar ===== */}
          <aside className={cn(
            "border-r flex-shrink-0 flex flex-col bg-muted/20 transition-all duration-200",
            sidebarHidden ? "w-0 overflow-hidden border-r-0" : "w-56 lg:w-64"
          )}>
            {/* Search Bar */}
            <div className="p-2 pb-1 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/50" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索文档和章节..."
                  className="h-7 pl-7 pr-2 text-xs bg-background border-muted-foreground/10 focus-visible:ring-1 focus-visible:ring-primary/30"
                />
                {searchQuery && (
                  <button
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 size-4 rounded-full flex items-center justify-center hover:bg-muted"
                    onClick={() => setSearchQuery("")}
                  >
                    <span className="text-[10px] text-muted-foreground">&times;</span>
                  </button>
                )}
              </div>
            </div>

            {/* Spec Categories */}
            <ScrollArea className="flex-1">
              <div className="p-2 pt-1">
                {/* Section Header: 创作设定 */}
                <div className="flex items-center gap-1.5 px-2 py-2 mb-1">
                  <div className="size-1 rounded-full bg-primary/60" />
                  <span className="text-[11px] font-semibold text-foreground/70 uppercase tracking-wider">创作设定</span>
                  <div className="flex-1 h-px bg-border/50" />
                </div>

                {SPEC_CATEGORIES.map((cat) => {
                  const catSpecs = filteredSpecsByCategory[cat.value] || [];
                  const isExpanded = expandedCategories[cat.value] !== false;
                  const CatIcon = cat.icon;
                  const isGenerating = aiGenerating === cat.value;

                  return (
                    <div key={cat.value} className="mb-1">
                      {/* Category header */}
                      <div
                        className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:bg-muted/60 cursor-pointer transition-colors"
                        onClick={() => setExpandedCategories((prev) => ({ ...prev, [cat.value]: !isExpanded }))}
                      >
                        <ChevronRight className={cn("size-3 transition-transform flex-shrink-0", isExpanded && "rotate-90")} />
                        <CatIcon className={cn("size-3.5", cat.color)} />
                        <span className="flex-1">{cat.label}</span>
                        <Badge variant="secondary" className="text-[9px] h-4 px-1 min-w-[16px] justify-center">
                          {catSpecs.length}
                        </Badge>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              className={cn(
                                "size-5 rounded flex items-center justify-center flex-shrink-0 transition-colors hover:bg-background",
                                isGenerating && "animate-pulse"
                              )}
                              onClick={(e) => { e.stopPropagation(); handleSpecAIGenerate(cat.value); }}
                              disabled={isGenerating}
                            >
                              {isGenerating ? (
                                <Loader2 className="size-3 animate-spin text-primary" />
                              ) : (
                                <Sparkles className="size-3 text-muted-foreground hover:text-primary" />
                              )}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="right">AI {cat.aiLabel}</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              className="size-5 rounded flex items-center justify-center flex-shrink-0 transition-colors hover:bg-background"
                              onClick={(e) => {
                                e.stopPropagation();
                                setNewSpecCategory(cat.value);
                                setNewSpecTitle("");
                                setShowCreateSpec(true);
                              }}
                            >
                              <Plus className="size-3 text-muted-foreground" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="right">新建{cat.label}文档</TooltipContent>
                        </Tooltip>
                      </div>

                      {/* Spec items */}
                      {isExpanded && (
                        <div className="ml-4 space-y-0.5">
                          {specsLoading ? (
                            <div className="space-y-1.5 px-1 py-1">
                              <div className="h-6 bg-muted/50 rounded animate-pulse" />
                              <div className="h-6 bg-muted/50 rounded w-3/4 animate-pulse" />
                            </div>
                          ) : catSpecs.length === 0 ? (
                            <p className="text-[10px] text-muted-foreground/60 px-2 py-1">
                              {searchQuery ? "无匹配" : "暂无文档"}
                            </p>
                          ) : (
                            catSpecs.map((spec) => (
                              <div
                                key={spec.id}
                                className={cn(
                                  "group flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs cursor-pointer transition-all",
                                  selectedSpecId === spec.id
                                    ? "bg-primary/10 text-primary font-medium"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                                )}
                                onClick={() => handleSelectSpec(spec)}
                              >
                                <div className={cn(
                                  "size-1.5 rounded-full flex-shrink-0",
                                  selectedSpecId === spec.id ? "bg-primary" : "bg-muted-foreground/30"
                                )} />
                                <span className="flex-1 truncate">{spec.title}</span>
                                <Badge variant="outline" className="text-[9px] h-3.5 px-1 opacity-70 flex-shrink-0">
                                  v{spec.version}
                                </Badge>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Separator */}
                <Separator className="my-3" />

                {/* Section Header: 章节列表 */}
                <div className="flex items-center gap-1.5 px-2 py-2 mb-1">
                  <div className="size-1 rounded-full bg-primary/60" />
                  <span className="text-[11px] font-semibold text-foreground/70 uppercase tracking-wider">章节列表</span>
                  <div className="flex-1 h-px bg-border/50" />
                  <Badge variant="secondary" className="text-[9px] h-4 px-1 min-w-[16px] justify-center">
                    {filteredChapters.length}
                  </Badge>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        className="size-5 rounded flex items-center justify-center flex-shrink-0 transition-colors hover:bg-background"
                        onClick={() => { setNewChapterTitle(""); setShowCreateChapter(true); }}
                      >
                        <Plus className="size-3 text-muted-foreground" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">新建章节</TooltipContent>
                  </Tooltip>
                </div>

                {/* Chapters */}
                <div className="space-y-0.5">
                  {filteredChapters.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground/60 px-2 py-1">
                      {searchQuery ? "无匹配章节" : "暂无章节"}
                    </p>
                  ) : (
                    filteredChapters.map((ch) => (
                      <div
                        key={ch.id}
                        className={cn(
                          "group flex items-center gap-1 px-2 py-1.5 rounded-md text-xs cursor-pointer transition-all",
                          selectedChapterId === ch.id
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                        )}
                        onClick={() => handleSelectChapter(ch.id)}
                      >
                        {/* Drag handle hint */}
                        <GripVertical className="size-2.5 text-muted-foreground/20 flex-shrink-0 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className={cn(
                          "size-1.5 rounded-full flex-shrink-0",
                          selectedChapterId === ch.id ? "bg-primary" : "bg-muted-foreground/30"
                        )} />
                        <span className="text-[10px] text-muted-foreground/60 w-4 flex-shrink-0">{ch.chapterNumber}</span>
                        <span className="flex-1 truncate">{ch.title}</span>
                        {/* Word count */}
                        {ch.wordCount > 0 && (
                          <span className="text-[9px] text-muted-foreground/50 flex-shrink-0 tabular-nums">
                            {ch.wordCount > 1000 ? `${(ch.wordCount / 1000).toFixed(1)}k` : ch.wordCount}
                          </span>
                        )}
                        {/* AI 续写 button (hover visible) */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              className="opacity-0 group-hover:opacity-100 size-4 rounded flex items-center justify-center flex-shrink-0 transition-opacity hover:bg-primary/10"
                              onClick={(e) => { e.stopPropagation(); handleChapterAIAction(ch, "continue"); }}
                            >
                              <PenTool className="size-2.5 text-primary/60" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="right">AI 续写</TooltipContent>
                        </Tooltip>
                        {/* Delete button (hover visible) */}
                        <button
                          className="opacity-0 group-hover:opacity-100 size-4 rounded flex items-center justify-center flex-shrink-0 transition-opacity hover:bg-destructive/10"
                          onClick={(e) => { e.stopPropagation(); deleteChapter(ch.id); }}
                        >
                          <Trash2 className="size-2.5 text-destructive/60" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </ScrollArea>
          </aside>

          {/* ===== Sidebar Toggle Button ===== */}
          {!focusMode && (
            <button
              className="absolute left-0 top-[calc(3.5rem+5.5rem)] z-10 flex items-center justify-center size-6 rounded-r-md border border-l-0 bg-background shadow-sm transition-all duration-200 hover:bg-muted"
              style={{ left: sidebarHidden ? 0 : undefined }}
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            >
              {sidebarHidden ? (
                <PanelLeftOpen className="size-3.5 text-muted-foreground" />
              ) : (
                <PanelLeftClose className="size-3.5 text-muted-foreground" />
              )}
            </button>
          )}

          {/* ===== Main Content Area ===== */}
          <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {selectedSpec ? (
              /* ===== Spec Document Editor ===== */
              <SpecEditor
                spec={selectedSpec}
                specContent={specContent}
                setSpecContent={setSpecContent}
                specEditing={specEditing}
                setSpecEditing={setSpecEditing}
                saving={saving}
                onSave={saveSpecContent}
                onCopy={() => navigator.clipboard.writeText(specContent)}
                onDelete={() => setDeleteConfirmId(selectedSpec.id)}
                onDeselect={handleDeselectSpec}
              />
            ) : currentChapter ? (
              /* ===== Chapter Editor ===== */
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {/* Chapter toolbar */}
                <div className="flex items-center justify-between px-4 md:px-6 py-2 border-b flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium",
                      chapterStatus === "completed" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
                      chapterStatus === "writing" && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                      chapterStatus === "review" && "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
                      chapterStatus === "draft" && "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
                    )}>
                      {CHAPTER_STATUS_MAP[chapterStatus as keyof typeof CHAPTER_STATUS_MAP]?.label || "草稿"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      第 {currentChapter.chapterNumber} 章
                    </span>
                  </div>

                  {/* AI Action Buttons */}
                  <div className="flex items-center gap-1">
                    {/* AI续写 - most prominent */}
                    <Button
                      size="sm"
                      className="h-7 text-xs gap-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-sm"
                      onClick={() => handleChapterAIAction(currentChapter, "continue")}
                    >
                      <PenTool className="size-3" />
                      <span className="hidden sm:inline">AI 续写</span>
                    </Button>
                    {/* AI润色 */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={() => handleChapterAIAction(currentChapter, "polish")}
                        >
                          <Paintbrush className="size-3" />
                          <span className="hidden md:inline">润色</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>AI 润色文本</TooltipContent>
                    </Tooltip>
                    {/* AI扩写 */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={() => handleChapterAIAction(currentChapter, "expand")}
                        >
                          <Expand className="size-3" />
                          <span className="hidden md:inline">扩写</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>AI 扩写内容</TooltipContent>
                    </Tooltip>

                    <div className="w-px h-5 bg-border mx-1" />

                    {/* Focus mode toggle */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant={focusMode ? "secondary" : "ghost"}
                          size="icon"
                          className="size-7"
                          onClick={() => setFocusMode(!focusMode)}
                        >
                          {focusMode ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{focusMode ? "退出专注模式" : "专注模式"}</TooltipContent>
                    </Tooltip>

                    {/* Status select */}
                    <Select value={chapterStatus} onValueChange={(v) => { setChapterStatus(v); saveChapter(); }}>
                      <SelectTrigger className="h-7 w-24 text-xs border-none shadow-none bg-transparent">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">草稿</SelectItem>
                        <SelectItem value="writing">写作中</SelectItem>
                        <SelectItem value="review">审核中</SelectItem>
                        <SelectItem value="completed">已完成</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Chapter content */}
                <div className="flex-1 overflow-y-auto">
                  <div className="max-w-3xl mx-auto px-6 py-10 md:py-16">
                    <Input
                      value={chapterTitle}
                      onChange={(e) => setChapterTitle(e.target.value)}
                      onBlur={saveChapter}
                      className="text-2xl md:text-3xl font-bold border-none shadow-none px-0 h-auto focus-visible:ring-0 bg-transparent placeholder:text-muted-foreground/40 mb-8"
                      placeholder="章节标题"
                    />
                    <div className="relative">
                      {chapterContent.length === 0 && (
                        <div className="absolute top-3 left-0 pointer-events-none flex items-center gap-2 text-muted-foreground/30 select-none">
                          <PenLine className="size-4" />
                          <span className="text-base font-serif">在这里开始你的故事...</span>
                        </div>
                      )}
                      <Textarea
                        value={chapterContent}
                        onChange={(e) => handleContentChange(e.target.value)}
                        className="min-h-[60vh] w-full resize-none border-none shadow-none bg-transparent text-base leading-[1.8] font-serif focus-visible:ring-0 placeholder:text-transparent selection:bg-primary/20"
                        placeholder=""
                        rows={40}
                      />
                    </div>
                  </div>
                </div>

                {/* Writing Statistics Bar */}
                <div className="flex items-center justify-between px-4 md:px-6 py-1.5 border-t flex-shrink-0 text-[11px] text-muted-foreground bg-muted/20">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <FileText className="size-3" />
                      {chapterContent.length.toLocaleString()} 字
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="tabular-nums">{paragraphCount}</span> 段
                    </span>
                    <span className="hidden sm:flex items-center gap-1">
                      约 {readingTime} 分钟阅读
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Save indicator */}
                    {saving ? (
                      <span className="flex items-center gap-1 text-amber-500">
                        <Loader2 className="size-3 animate-spin" />
                        保存中...
                      </span>
                    ) : lastSaved ? (
                      <span className="flex items-center gap-1 text-emerald-500">
                        <Check className="size-3" />
                        已保存
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : (
              /* ===== Empty State (Inspiring Welcome) ===== */
              <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
                {/* Novel cover / stats */}
                {currentNovel && (
                  <div className="flex flex-col items-center gap-4 max-w-md w-full">
                    {currentNovel.coverImage ? (
                      <div className="size-24 rounded-xl overflow-hidden shadow-lg">
                        <img src={currentNovel.coverImage} alt={currentNovel.title} className="size-full object-cover" />
                      </div>
                    ) : (
                      <div className="size-20 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/20 dark:to-orange-900/20 flex items-center justify-center">
                        <BookOpen className="size-9 text-amber-500" />
                      </div>
                    )}
                    <div className="text-center">
                      <h3 className="text-lg font-semibold">{currentNovel.title}</h3>
                      {currentNovel.genre && (
                        <Badge variant="secondary" className="mt-1">{currentNovel.genre}</Badge>
                      )}
                      {currentNovel.description && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{currentNovel.description}</p>
                      )}
                    </div>
                    {/* Stats grid */}
                    <div className="grid grid-cols-3 gap-4 w-full max-w-xs">
                      <div className="text-center p-3 rounded-lg bg-muted/40">
                        <p className="text-lg font-semibold tabular-nums">{totalWords.toLocaleString()}</p>
                        <p className="text-[10px] text-muted-foreground">总字数</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-muted/40">
                        <p className="text-lg font-semibold tabular-nums">{chapters.length}</p>
                        <p className="text-[10px] text-muted-foreground">章节</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-muted/40">
                        <p className="text-lg font-semibold tabular-nums">{specs.length}</p>
                        <p className="text-[10px] text-muted-foreground">设定文档</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="text-center max-w-md">
                  <p className="text-sm text-muted-foreground mb-4">
                    {chapters.length === 0 && specs.length === 0
                      ? "从左侧创建设定文档或章节开始你的创作，或让 AI 帮你一键生成"
                      : "从左侧选择章节或设定文档开始创作"
                    }
                  </p>
                  <div className="flex gap-3 justify-center flex-wrap">
                    <Button size="lg" onClick={() => setShowStoryWizard(true)}>
                      <Sparkles className="size-4 mr-2" />一键创作
                    </Button>
                    <Button size="lg" variant="outline" onClick={() => { setNewSpecCategory("outline"); setNewSpecTitle(""); setShowCreateSpec(true); }}>
                      <Plus className="size-4 mr-2" />新建规格
                    </Button>
                    <Button size="lg" variant="outline" onClick={() => { setNewChapterTitle(""); setShowCreateChapter(true); }}>
                      <Plus className="size-4 mr-2" />新建章节
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>

        {/* ===== Bottom Status Bar ===== */}
        <footer className="flex items-center h-9 px-3 gap-3 flex-shrink-0 border-t bg-muted/30">
          {/* Progress bar */}
          {chapters.length > 0 && (
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[10px] text-muted-foreground flex-shrink-0 hidden sm:inline">创作进度</span>
              <div className="w-20 sm:w-32 h-1.5 bg-muted rounded-full overflow-hidden flex-shrink-0">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground tabular-nums flex-shrink-0">
                {completedChapters}/{chapters.length}
              </span>
            </div>
          )}

          <div className="flex-1" />

          {/* Stats */}
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            {totalWords > 0 && (
              <span className="hidden sm:inline">{totalWords.toLocaleString()} 字</span>
            )}
            <span className="hidden sm:inline">{chapters.length} 章</span>
            <span className="hidden sm:inline">{specs.length} 设定</span>
            {/* Save indicator */}
            <span className="flex items-center gap-1">
              {saving ? (
                <><Loader2 className="size-3 animate-spin" /><span>保存中</span></>
              ) : (
                <span className="flex items-center gap-1">
                  <div className="size-1.5 rounded-full bg-emerald-500" />
                  <span>已保存</span>
                </span>
              )}
            </span>
          </div>
        </footer>

        {/* ===== Dialogs ===== */}

        {/* Create Spec Dialog */}
        <Dialog open={showCreateSpec} onOpenChange={setShowCreateSpec}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>新建规格文档</DialogTitle>
              <DialogDescription>为小说创建规格文档，记录设定和规划</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">文档类别</label>
                <div className="flex flex-wrap gap-1.5">
                  {SPEC_CATEGORIES.map((cat) => {
                    const CatIcon = cat.icon;
                    return (
                      <button
                        key={cat.value}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors border",
                          newSpecCategory === cat.value
                            ? cn(cat.bgColor, cat.color, "border-current/20")
                            : "bg-background text-muted-foreground hover:bg-muted border-transparent"
                        )}
                        onClick={() => setNewSpecCategory(cat.value)}
                      >
                        <CatIcon className="size-3" />
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">文档标题 *</label>
                <Input
                  value={newSpecTitle}
                  onChange={(e) => setNewSpecTitle(e.target.value)}
                  placeholder={`例如：${SPEC_TEMPLATES[newSpecCategory]?.split("\n")[0]?.replace("# ", "") || "文档标题"}`}
                  onKeyDown={(e) => { if (e.key === "Enter") createSpec(); }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateSpec(false)}>取消</Button>
              <Button onClick={createSpec} disabled={!newSpecTitle.trim()}>
                <Plus className="size-3.5 mr-1" />创建
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Chapter Dialog */}
        <Dialog open={showCreateChapter} onOpenChange={setShowCreateChapter}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>创建新章节</DialogTitle>
              <DialogDescription>为作品添加新章节</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">章节标题（可选）</label>
                <Input
                  value={newChapterTitle}
                  onChange={(e) => setNewChapterTitle(e.target.value)}
                  placeholder="留空自动编号"
                  onKeyDown={(e) => { if (e.key === "Enter") createChapter(); }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateChapter(false)}>取消</Button>
              <Button onClick={createChapter}>创建</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirm Dialog */}
        <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>确认删除</DialogTitle>
              <DialogDescription>此操作不可撤销，确定要删除这份规格文档吗？</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>取消</Button>
              <Button variant="destructive" onClick={() => { if (deleteConfirmId) deleteSpec(deleteConfirmId); }}>删除</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* AI Assistant Drawer */}
        <Sheet open={showAiAssistant} onOpenChange={(open) => { setShowAiAssistant(open); if (!open) setAiPrefill(""); }}>
          <SheetContent side="bottom" className="h-[70vh] rounded-t-2xl">
            <SheetHeader>
              <SheetTitle>AI 助手</SheetTitle>
              <SheetDescription>智能写作辅助</SheetDescription>
            </SheetHeader>
            <AiAssistantDrawer
              novelId={selectedNovelId!}
              chapterId={selectedChapterId}
              chapterContent={chapterContent}
              prefill={aiPrefill}
            />
          </SheetContent>
        </Sheet>

        {/* Story Wizard */}
        <StoryWizard
          open={showStoryWizard}
          onOpenChange={setShowStoryWizard}
          novelId={selectedNovelId!}
          onComplete={() => { setShowStoryWizard(false); loadNovelData(); loadSpecs(); }}
        />

        {/* Orchestration Panel (Bottom Sheet) */}
        <Sheet open={showOrchestration} onOpenChange={setShowOrchestration}>
          <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Hermes 协同编排</SheetTitle>
              <SheetDescription>多Agent协同创作引擎</SheetDescription>
            </SheetHeader>
            <OrchestrationPanel
              novelTitle={currentNovel?.title}
              novelGenre={currentNovel?.genre}
              novelDescription={currentNovel?.description}
              chapterContent={chapterContent}
              characters={characters.map((c) => ({ name: c.name, role: c.role, description: c.description }))}
              novelId={selectedNovelId || undefined}
              chapterId={selectedChapterId || undefined}
              onAdoptContent={(content) => {
                if (selectedChapterId) {
                  setChapterContent((prev) => prev + "\n\n" + content);
                }
              }}
            />
          </SheetContent>
        </Sheet>

        {/* AI Generating Overlay */}
        {aiGenerating && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
            <div className="bg-background rounded-xl shadow-2xl p-6 flex flex-col items-center gap-3 max-w-sm mx-4">
              <div className={cn(
                "size-12 rounded-full flex items-center justify-center animate-pulse",
                getCategoryConfig(aiGenerating).bgColor
              )}>
                <Loader2 className={cn("size-6 animate-spin", getCategoryConfig(aiGenerating).color)} />
              </div>
              <p className="text-sm font-medium">AI 正在生成{getCategoryConfig(aiGenerating).label}文档...</p>
              <p className="text-xs text-muted-foreground text-center">
                正在调用 {getCategoryConfig(aiGenerating).aiLabel.replace("生成", "")} Agent 分析并生成内容
              </p>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

// ===== Spec Editor Sub-Component =====
function SpecEditor({
  spec,
  specContent,
  setSpecContent,
  specEditing,
  setSpecEditing,
  saving,
  onSave,
  onCopy,
  onDelete,
  onDeselect,
}: {
  spec: NovelSpec;
  specContent: string;
  setSpecContent: (v: string) => void;
  specEditing: boolean;
  setSpecEditing: (v: boolean) => void;
  saving: boolean;
  onSave: () => void;
  onCopy: () => void;
  onDelete: () => void;
  onDeselect: () => void;
}) {
  const catConfig = getCategoryConfig(spec.category);
  const CatIcon = catConfig.icon;

  return (
    <div className="flex flex-col h-full">
      {/* Spec toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <button
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
            onClick={onDeselect}
          >
            <ArrowLeft className="size-3" />
            <span className="hidden sm:inline">返回</span>
          </button>
          <div className="w-px h-4 bg-border" />
          <div className={cn("size-6 rounded-md flex items-center justify-center", catConfig.bgColor)}>
            <CatIcon className={cn("size-3.5", catConfig.color)} />
          </div>
          <div className="min-w-0 flex items-center gap-2">
            <span className="text-sm font-medium truncate">{spec.title}</span>
            <Badge variant="outline" className="text-[10px] h-5 px-1.5 flex-shrink-0">v{spec.version}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Segmented edit/preview toggle */}
          <div className="flex items-center rounded-lg border bg-muted/50 p-0.5">
            <button
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all",
                specEditing
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setSpecEditing(true)}
            >
              <Pencil className="size-3" />
              编辑
            </button>
            <button
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all",
                !specEditing
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setSpecEditing(false)}
            >
              <Eye className="size-3" />
              预览
            </button>
          </div>

          <div className="w-px h-5 bg-border mx-1" />

          <ToolbarButton icon={<Copy className="size-3.5" />} tooltip="复制" onClick={onCopy} />
          <Button
            size="sm"
            variant={specEditing ? "default" : "outline"}
            className="h-7 text-xs gap-1"
            onClick={onSave}
            disabled={saving || !specEditing}
          >
            {saving ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}
            <span className="hidden sm:inline">{saving ? "保存中" : "保存"}</span>
          </Button>
          <ToolbarButton icon={<Trash2 className="size-3.5" />} tooltip="删除" onClick={onDelete} className="text-destructive/60 hover:text-destructive" />
        </div>
      </div>

      {/* Spec content */}
      <div className="flex-1 overflow-y-auto">
        {specEditing ? (
          <div className="p-4 md:p-6">
            <Textarea
              value={specContent}
              onChange={(e) => setSpecContent(e.target.value)}
              className="min-h-full w-full resize-none font-mono text-xs leading-relaxed border-0 focus-visible:ring-0 bg-transparent"
              placeholder="开始编写内容..."
              rows={40}
            />
          </div>
        ) : (
          <div className="p-4 md:p-6">
            {/* Category-specific preview */}
            {spec.category === "outline" ? (
              <OutlinePreview content={specContent} />
            ) : (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <div className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed font-mono">
                  {specContent || <span className="text-muted-foreground/50">点击编辑按钮开始编写内容...</span>}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Spec status bar */}
      <div className="flex items-center justify-between px-4 py-1.5 border-t text-[11px] text-muted-foreground flex-shrink-0">
        <div className="flex items-center gap-3">
          <span>{specContent.length.toLocaleString()} 字</span>
          <span>更新于 {spec.updatedAt ? new Date(spec.updatedAt).toLocaleString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "-"}</span>
        </div>
        <span className="flex items-center gap-1">
          {saving ? (
            <span className="flex items-center gap-1 text-amber-500"><Loader2 className="size-3 animate-spin" />保存中...</span>
          ) : (
            <span className="flex items-center gap-1">
              {specEditing ? (
                <span className="text-amber-500">编辑中</span>
              ) : (
                <><Check className="size-3 text-emerald-500" /><span>已保存</span></>
              )}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

// ===== Outline Preview (three-act structure) =====
function OutlinePreview({ content }: { content: string }) {
  const acts = useMemo(() => {
    const result: { num: number; title: string; content: string }[] = [];
    const pattern = /###\s*第([一二三1-3])幕[：:]?\s*(.*)/g;
    let match;
    const sections: { index: number; num: number; title: string; end: number }[] = [];

    while ((match = pattern.exec(content)) !== null) {
      if (sections.length > 0) sections[sections.length - 1].end = match.index;
      const numStr = match[1];
      const num = numStr === "一" || numStr === "1" ? 1 : numStr === "二" || numStr === "2" ? 2 : 3;
      sections.push({ index: match.index, num, title: match[2] || (num === 1 ? "起" : num === 2 ? "承转" : "合"), end: content.length });
    }

    for (const s of sections) {
      result.push({ num: s.num, title: s.title, content: content.slice(s.index, s.end).trim() });
    }
    return result;
  }, [content]);

  const ACT_STYLES: Record<number, { border: string; bg: string; text: string }> = {
    1: { border: "border-l-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-700 dark:text-emerald-300" },
    2: { border: "border-l-amber-500", bg: "bg-amber-50 dark:bg-amber-950/30", text: "text-amber-700 dark:text-amber-300" },
    3: { border: "border-l-rose-500", bg: "bg-rose-50 dark:bg-rose-950/30", text: "text-rose-700 dark:text-rose-300" },
  };

  if (acts.length === 0) {
    return (
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <div className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed font-mono">
          {content || <span className="text-muted-foreground/50">暂无大纲内容</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Foreshadowing summary (extracted from tables) */}
      {content.includes("伏笔") && (
        <div className="mb-2">
          <div className="flex items-center gap-2 mb-2">
            <Target className="size-3.5 text-amber-500" />
            <span className="text-xs font-semibold">伏笔追踪</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            {(() => {
              const lines = content.split("\n");
              const items: string[] = [];
              let inTable = false;
              for (const line of lines) {
                if (line.includes("伏笔") && line.includes("|")) { inTable = true; continue; }
                if (inTable && (line.startsWith("##") || line.startsWith("###"))) break;
                if (inTable && line.startsWith("|") && !line.match(/^[\s|:-]+$/)) {
                  const cells = line.split("|").filter(Boolean).map(c => c.trim());
                  if (cells[0] && cells[0] !== "伏笔") items.push(cells[0]);
                }
              }
              return items.length > 0 ? items.map((item, i) => (
                <div key={i} className="px-2.5 py-1.5 rounded-md bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 font-medium truncate">
                  {item}
                </div>
              )) : null;
            })()}
          </div>
        </div>
      )}

      {acts.map((act) => {
        const style = ACT_STYLES[act.num] || ACT_STYLES[1];
        return (
          <div key={act.num} className={cn("rounded-lg border border-l-4 p-4", style.border, style.bg)}>
            <h3 className={cn("text-sm font-semibold mb-2", style.text)}>
              第{act.num === 1 ? "一" : act.num === 2 ? "二" : "三"}幕：{act.title}
            </h3>
            <div className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {act.content.replace(/^###\s*第[一二三1-3]幕[：:]?\s*(.*)\n?/, "").trim()}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ===== Version Panel (bottom slide-up) =====
function VersionPanel({
  novelId,
  type,
  onClose,
}: {
  novelId: string;
  type: "proposals" | "snapshots" | "branches" | "history";
  onClose: () => void;
}) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const endpoints: Record<string, string> = {
      proposals: `/api/proposals?novelId=${novelId}`,
      snapshots: `/api/snapshots?novelId=${novelId}`,
      branches: `/api/branches?novelId=${novelId}`,
      history: `/api/specs?novelId=${novelId}`,
    };

    fetch(endpoints[type])
      .then((r) => r.ok ? r.json() : [])
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [novelId, type]);

  const labels: Record<string, string> = {
    proposals: "变更提案",
    snapshots: "版本快照",
    branches: "分支",
    history: "规格历史",
  };

  const icons: Record<string, typeof BookMarked> = {
    proposals: BookMarked,
    snapshots: BookMarked,
    branches: BookMarked,
    history: BookMarked,
  };

  const Icon = icons[type];

  return (
    <div className="border-t bg-background shadow-2xl max-h-[40vh] flex flex-col flex-shrink-0">
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-2 border-b flex-shrink-0">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-primary" />
          <span className="text-sm font-semibold">{labels[type]}</span>
          <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{data.length}</Badge>
        </div>
        <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={onClose}>
          关闭
        </Button>
      </div>

      {/* Panel content */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center h-20">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-10">
            <Icon className="size-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">暂无数据</p>
          </div>
        ) : (
          <div className="p-3 space-y-1.5">
            {data.map((item: any) => (
              <div key={item.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/60 transition-colors text-xs">
                <div className="size-7 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                  <Icon className="size-3.5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{item.title || item.name || item.label || "未命名"}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {item.createdAt
                      ? new Date(item.createdAt).toLocaleString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                      : "-"}
                    {item.version && ` · v${item.version}`}
                    {item.status && ` · ${item.status}`}
                  </p>
                </div>
                <Badge variant="outline" className="text-[9px] h-4 px-1 flex-shrink-0">
                  {item.version ? `v${item.version}` : item.status || ""}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

// ===== Toolbar Button Helper =====
function ToolbarButton({
  icon,
  tooltip,
  onClick,
  disabled,
  className,
}: {
  icon: React.ReactNode;
  tooltip: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" className={cn("size-8", className)} onClick={onClick} disabled={disabled}>
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{tooltip}</TooltipContent>
    </Tooltip>
  );
}
