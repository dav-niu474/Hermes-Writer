"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import type {
  NovelSpec,
  Character,
  WorldSetting,
  Chapter,
  WorldSettingCategory,
  AgentType,
} from "@/lib/types";
import { AGENT_DEFINITIONS } from "@/lib/types";
import { AVAILABLE_MODELS } from "@/lib/ai";
import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Map,
  Plus,
  Sparkles,
  Wand2,
  Save,
  Copy,
  ChevronDown,
  FileText,
  Bookmark,
  Target,
  Eye,
  EyeOff,
  Pencil,
  Loader2,
  Brain,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ===== Props Interface =====
interface OutlineCanvasProps {
  novelId: string;
  specs: any[];
  onRefresh: () => void;
}

// ===== Types =====
interface ForeshadowingItem {
  name: string;
  plantChapter: string;
  payoffChapter: string;
  status: "planted" | "partially" | "resolved" | "abandoned" | string;
}

interface ActSection {
  actNumber: number;
  title: string;
  content: string;
}

// ===== Category config =====
const CATEGORY_CONFIG: Record<
  string,
  { label: string; color: string; icon: typeof Map }
> = {
  outline: { label: "大纲", color: "text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400", icon: Map },
  characters: { label: "角色", color: "text-rose-600 bg-rose-50 dark:bg-rose-900/30 dark:text-rose-400", icon: Bookmark },
  worldbuilding: { label: "世界观", color: "text-orange-600 bg-orange-50 dark:bg-orange-900/30 dark:text-orange-400", icon: Target },
  style: { label: "风格", color: "text-sky-600 bg-sky-50 dark:bg-sky-900/30 dark:text-sky-400", icon: Pencil },
  rules: { label: "规则", color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400", icon: Target },
};

// ===== Act colors =====
const ACT_COLORS: Record<number, { border: string; bg: string; text: string; badge: string }> = {
  1: {
    border: "border-l-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    text: "text-emerald-700 dark:text-emerald-300",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  2: {
    border: "border-l-amber-500",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    text: "text-amber-700 dark:text-amber-300",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  },
  3: {
    border: "border-l-rose-500",
    bg: "bg-rose-50 dark:bg-rose-950/30",
    text: "text-rose-700 dark:text-rose-300",
    badge: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  },
};

// ===== Template content =====
const OUTLINE_TEMPLATES: Record<string, string> = {
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

**伏笔设置**：
-

---

### 第二幕：承转

**核心事件**：

**情节要点**：
1.
2.
3.

**伏笔回收**：
-

---

### 第三幕：合

**核心事件**：

**情节要点**：
1.
2.
3.

**结局**：
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
  style: `# 风格指南

## 叙事风格
- **人称**：
- **时态**：
- **语调**：

## 语言特点
-

## 描写偏好
-

## 对话风格
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
};

// ===== Helper: parse three-act structure =====
function parseActStructure(content: string): ActSection[] {
  const acts: ActSection[] = [];
  const actPattern = /###\s*第([一二三1-3])幕[：:]?\s*(.*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const sections: { index: number; actNum: number; title: string; end: number }[] = [];

  while ((match = actPattern.exec(content)) !== null) {
    if (sections.length > 0) {
      sections[sections.length - 1].end = match.index;
    }
    const actNumStr = match[1];
    let actNum = 1;
    if (actNumStr === "一" || actNumStr === "1") actNum = 1;
    else if (actNumStr === "二" || actNumStr === "2") actNum = 2;
    else if (actNumStr === "三" || actNumStr === "3") actNum = 3;

    sections.push({
      index: match.index,
      actNum,
      title: match[2] || (actNum === 1 ? "起" : actNum === 2 ? "承转" : "合"),
      end: content.length,
    });
  }

  for (const section of sections) {
    acts.push({
      actNumber: section.actNum,
      title: section.title,
      content: content.slice(section.index, section.end).trim(),
    });
  }

  return acts;
}

// ===== Helper: parse foreshadowing from markdown tables =====
function parseForeshadowing(content: string): ForeshadowingItem[] {
  const items: ForeshadowingItem[] = [];

  // Look for tables with 伏笔 header
  const lines = content.split("\n");
  let inForeshadowTable = false;
  let headerCols: number[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.includes("伏笔") && line.includes("|")) {
      inForeshadowTable = true;
      // Determine column positions
      const cols = line.split("|").filter(Boolean).map((c) => c.trim());
      headerCols = [];
      cols.forEach((col, idx) => {
        if (col.includes("伏笔")) headerCols.push(idx);
      });
      continue;
    }

    if (inForeshadowTable) {
      // Skip separator line
      if (/^[\s|:-]+$/.test(line)) continue;

      // Stop at empty line or new section
      if (!line.startsWith("|") || line.startsWith("##") || line.startsWith("###")) {
        inForeshadowTable = false;
        continue;
      }

      const cells = line.split("|").filter(Boolean).map((c) => c.trim());
      if (cells.length < 2) continue;

      const name = headerCols[0] !== undefined ? cells[headerCols[0]] : cells[0];
      const plantChapter = headerCols[1] !== undefined ? cells[headerCols[1]] : cells[1];
      const payoffChapter = headerCols[2] !== undefined ? cells[headerCols[2]] : "";
      const status = headerCols[3] !== undefined ? cells[headerCols[3]] : "planted";

      if (name && name !== "伏笔" && !name.startsWith("---")) {
        let normalizedStatus: ForeshadowingItem["status"] = "planted";
        if (status.includes("已回收") || status.includes("resolved") || status.includes("完成")) {
          normalizedStatus = "resolved";
        } else if (status.includes("部分") || status.includes("partial")) {
          normalizedStatus = "partially";
        } else if (status.includes("废弃") || status.includes("abandoned")) {
          normalizedStatus = "abandoned";
        } else {
          normalizedStatus = "planted";
        }

        items.push({
          name,
          plantChapter: plantChapter || "-",
          payoffChapter: payoffChapter || "-",
          status: normalizedStatus,
        });
      }
    }
  }

  return items;
}

// ===== Helper: status config =====
function getForeshadowStatusConfig(status: string) {
  switch (status) {
    case "resolved":
      return {
        label: "已回收",
        color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
        dot: "bg-emerald-500",
      };
    case "partially":
      return {
        label: "部分回收",
        color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
        dot: "bg-amber-500",
      };
    case "abandoned":
      return {
        label: "已废弃",
        color: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
        dot: "bg-gray-400",
      };
    default:
      return {
        label: "已埋设",
        color: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
        dot: "bg-sky-500",
      };
  }
}

// ===== Main Component =====
export function OutlineCanvas({ novelId, specs: initialSpecs, onRefresh }: OutlineCanvasProps) {
  const { currentNovel, characters } = useAppStore();

  // Local state
  const [specs, setSpecs] = useState<any[]>(initialSpecs || []);
  const [selectedSpec, setSelectedSpec] = useState<any>(null);
  const [specContent, setSpecContent] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [expandedActs, setExpandedActs] = useState<Record<number, boolean>>({
    1: true,
    2: true,
    3: true,
  });
  const [newSpecForm, setNewSpecForm] = useState({
    title: "",
    category: "outline",
    content: "",
  });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Load specs
  const loadSpecs = useCallback(async () => {
    if (!novelId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/specs?novelId=${novelId}`);
      if (res.ok) {
        const data = await res.json();
        setSpecs(data);
      }
    } catch (e) {
      console.error("Failed to load specs:", e);
    } finally {
      setLoading(false);
    }
  }, [novelId]);

  useEffect(() => {
    if (initialSpecs?.length > 0) {
      setSpecs(initialSpecs);
    } else {
      loadSpecs();
    }
  }, [initialSpecs, loadSpecs]);

  // Sync parent refresh
  useEffect(() => {
    if (onRefresh) {
      const originalRefresh = onRefresh;
      // No-op: we handle our own refresh
    }
  }, [onRefresh]);

  // Reset selection when specs change
  useEffect(() => {
    if (selectedSpec) {
      const updated = specs.find((s) => s.id === selectedSpec.id);
      if (updated && updated.version !== selectedSpec.version) {
        setSelectedSpec(updated);
      }
    }
  }, [specs, selectedSpec]);

  // ===== Computed values =====
  const outlineSpecs = useMemo(() => specs.filter((s) => s.category === "outline"), [specs]);
  const otherSpecs = useMemo(() => specs.filter((s) => s.category !== "outline"), [specs]);

  // Parse act structure from all outline specs
  const actStructure = useMemo(() => {
    const allContent = outlineSpecs
      .sort((a, b) => b.version - a.version)
      .map((s) => s.content)
      .join("\n\n---\n\n");
    return parseActStructure(allContent);
  }, [outlineSpecs]);

  // Collect all foreshadowing items
  const foreshadowingItems = useMemo(() => {
    const items: ForeshadowingItem[] = [];
    for (const spec of specs) {
      const parsed = parseForeshadowing(spec.content);
      items.push(...parsed);
    }
    // Deduplicate by name
    const seen = new Set<string>();
    return items.filter((item) => {
      if (seen.has(item.name)) return false;
      seen.add(item.name);
      return true;
    });
  }, [specs]);

  // Parse acts for the currently selected spec
  const selectedSpecActs = useMemo(() => {
    if (!selectedSpec) return [];
    return parseActStructure(specContent);
  }, [selectedSpec, specContent]);

  // ===== Actions =====
  async function handleSave() {
    if (!selectedSpec || !specContent.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/specs/${selectedSpec.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: specContent }),
      });
      if (res.ok) {
        const updated = await res.json();
        setSelectedSpec(updated);
        loadSpecs();
      }
    } catch (e) {
      console.error("Failed to save spec:", e);
    } finally {
      setSaving(false);
      setIsEditing(false);
    }
  }

  async function handleCreate() {
    if (!novelId || !newSpecForm.title.trim()) return;
    setCreating(true);
    try {
      const content = newSpecForm.content.trim() || OUTLINE_TEMPLATES[newSpecForm.category] || "";
      const res = await fetch("/api/specs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          novelId,
          category: newSpecForm.category,
          title: newSpecForm.title.trim(),
          content,
        }),
      });
      if (res.ok) {
        setShowCreateDialog(false);
        setNewSpecForm({ title: "", category: "outline", content: "" });
        loadSpecs();
      }
    } catch (e) {
      console.error("Failed to create spec:", e);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(specId: string) {
    setCreating(true);
    try {
      await fetch(`/api/specs/${specId}`, { method: "DELETE" });
      if (selectedSpec?.id === specId) {
        setSelectedSpec(null);
        setSpecContent("");
      }
      setDeleteConfirm(null);
      loadSpecs();
    } catch (e) {
      console.error("Failed to delete spec:", e);
    } finally {
      setCreating(false);
    }
  }

  function handleSelectSpec(spec: any) {
    setSelectedSpec(spec);
    setSpecContent(spec.content);
    setIsEditing(false);
  }

  function handleCopyContent() {
    navigator.clipboard.writeText(specContent);
  }

  async function handleAIGenerate() {
    if (!novelId) return;
    setAiGenerating(true);
    try {
      const novelContext = [
        currentNovel?.title ? `作品名：${currentNovel.title}` : "",
        currentNovel?.genre ? `类型：${currentNovel.genre}` : "",
        currentNovel?.description ? `简介：${currentNovel.description}` : "",
        characters.length > 0
          ? `角色：${characters.map((c) => `${c.name}(${c.role})`).join("、")}`
          : "",
      ]
        .filter(Boolean)
        .join("\n");

      const existingContent =
        outlineSpecs.length > 0
          ? `\n\n现有大纲内容（请在此基础上优化）：\n${outlineSpecs[0].content.slice(0, 2000)}`
          : "";

      const res = await fetch("/api/agents/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentType: "planner",
          novelId,
          message: `请为这部小说生成完整的故事大纲${existingContent}`,
          novelTitle: currentNovel?.title,
          novelGenre: currentNovel?.genre,
          novelDescription: currentNovel?.description,
          characters: characters.map((c) => `${c.name}(${c.role}): ${c.description}`),
          stream: false,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const generatedContent = data.output || data.content || data.text || "";

        if (generatedContent) {
          // Create or update spec with AI-generated content
          if (outlineSpecs.length > 0) {
            // Update existing
            const spec = outlineSpecs[0];
            const updatedContent = generatedContent;
            await fetch(`/api/specs/${spec.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ content: updatedContent }),
            });
            setSelectedSpec({ ...spec, content: updatedContent });
            setSpecContent(updatedContent);
          } else {
            // Create new
            const newRes = await fetch("/api/specs", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                novelId,
                category: "outline",
                title: `${currentNovel?.title || "小说"} - 故事大纲`,
                content: generatedContent,
              }),
            });
            if (newRes.ok) {
              const newSpec = await newRes.json();
              setSelectedSpec(newSpec);
              setSpecContent(newSpec.content);
            }
          }
          loadSpecs();
        }
      }
    } catch (e) {
      console.error("AI generation failed:", e);
    } finally {
      setAiGenerating(false);
    }
  }

  function toggleAct(actNum: number) {
    setExpandedActs((prev) => ({ ...prev, [actNum]: !prev[actNum] }));
  }

  // ===== Render =====
  return (
    <div className="flex flex-col h-full">
      <TooltipProvider>
        {/* ===== Header ===== */}
        <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-lg bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 flex items-center justify-center">
              <Map className="size-4 text-amber-500" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">故事大纲</h2>
              <p className="text-[11px] text-muted-foreground">
                {specs.length} 份规格文档 · {foreshadowingItems.length} 条伏笔
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1 text-amber-600 border-amber-200 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/30"
                  onClick={handleAIGenerate}
                  disabled={aiGenerating}
                >
                  {aiGenerating ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="size-3.5" />
                  )}
                  <span className="hidden sm:inline">
                    {aiGenerating ? "生成中..." : "AI 生成大纲"}
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>使用剧情策划师 AI 自动生成故事大纲</TooltipContent>
            </Tooltip>
            <Button
              variant="default"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => {
                setNewSpecForm({ title: "", category: "outline", content: "" });
                setShowCreateDialog(true);
              }}
            >
              <Plus className="size-3.5" />
              <span className="hidden sm:inline">新建规格</span>
            </Button>
          </div>
        </div>

        {/* ===== Main Content ===== */}
        {selectedSpec ? (
          /* ===== Two-column layout: Spec editor ===== */
          <div className="flex flex-1 min-h-0">
            {/* Left: Spec List */}
            <div className="w-56 lg:w-64 border-r flex-shrink-0 flex flex-col">
              <div className="px-3 py-2 border-b flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-muted-foreground text-xs h-7"
                  onClick={() => {
                    setSelectedSpec(null);
                    setSpecContent("");
                    setIsEditing(false);
                  }}
                >
                  <ChevronDown className="size-3 mr-1 rotate-90" />
                  返回大纲总览
                </Button>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                  {loading ? (
                    <div className="space-y-2 p-2">
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-3/4" />
                    </div>
                  ) : (
                    <>
                      {/* Outline specs */}
                      {outlineSpecs.length > 0 && (
                        <p className="text-[10px] text-muted-foreground px-1 font-medium mb-1">
                          大纲文档
                        </p>
                      )}
                      {outlineSpecs.map((spec) => (
                        <div
                          key={spec.id}
                          className={cn(
                            "group flex items-center gap-2 rounded-md px-2 py-1.5 text-xs cursor-pointer transition-colors",
                            selectedSpec?.id === spec.id
                              ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300"
                              : "hover:bg-muted"
                          )}
                          onClick={() => handleSelectSpec(spec)}
                        >
                          <div
                            className={cn(
                              "size-5 rounded flex items-center justify-center flex-shrink-0",
                              selectedSpec?.id === spec.id
                                ? "bg-amber-100 dark:bg-amber-900/50"
                                : "bg-amber-50 dark:bg-amber-900/20"
                            )}
                          >
                            <Map className="size-3 text-amber-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{spec.title}</p>
                            <p className="text-[9px] text-muted-foreground">
                              v{spec.version} · {spec.content.length} 字
                            </p>
                          </div>
                        </div>
                      ))}

                      {/* Other specs */}
                      {otherSpecs.length > 0 && (
                        <>
                          <Separator className="my-2" />
                          <p className="text-[10px] text-muted-foreground px-1 font-medium mb-1">
                            其他规格
                          </p>
                          {otherSpecs.map((spec) => {
                            const catConfig = CATEGORY_CONFIG[spec.category] || {
                              label: spec.category,
                              color: "text-gray-500 bg-gray-50 dark:bg-gray-900/30 dark:text-gray-400",
                              icon: FileText,
                            };
                            const CatIcon = catConfig.icon;
                            return (
                              <div
                                key={spec.id}
                                className={cn(
                                  "group flex items-center gap-2 rounded-md px-2 py-1.5 text-xs cursor-pointer transition-colors",
                                  selectedSpec?.id === spec.id
                                    ? "bg-muted"
                                    : "hover:bg-muted"
                                )}
                                onClick={() => handleSelectSpec(spec)}
                              >
                                <div
                                  className={cn(
                                    "size-5 rounded flex items-center justify-center flex-shrink-0",
                                    selectedSpec?.id === spec.id
                                      ? "bg-muted"
                                      : "bg-muted/50"
                                  )}
                                >
                                  <CatIcon className="size-3 text-muted-foreground" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">{spec.title}</p>
                                  <p className="text-[9px] text-muted-foreground">
                                    {catConfig.label} · v{spec.version}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </>
                      )}
                    </>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Right: Spec Editor */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* Editor toolbar */}
              <div className="flex items-center justify-between px-4 py-2 border-b flex-shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  {(() => {
                    const catConfig = CATEGORY_CONFIG[selectedSpec.category] || {
                      label: selectedSpec.category,
                      color: "text-gray-500 bg-gray-50 dark:bg-gray-900/30 dark:text-gray-400",
                    };
                    return (
                      <Badge className={cn("text-[10px]", catConfig.color)}>
                        {catConfig.label}
                      </Badge>
                    );
                  })()}
                  <span className="text-xs font-medium truncate">
                    {selectedSpec.title}
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    v{selectedSpec.version}
                  </Badge>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => setIsEditing(!isEditing)}
                      >
                        {isEditing ? (
                          <Eye className="size-3.5" />
                        ) : (
                          <Pencil className="size-3.5" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {isEditing ? "预览模式" : "编辑模式"}
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={handleCopyContent}
                      >
                        <Copy className="size-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>复制内容</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={handleSave}
                        disabled={saving || !isEditing}
                      >
                        <Save className="size-3" />
                        {saving ? "保存中" : "保存"}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      保存并自动递增版本号 (Ctrl+S)
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                        onClick={() => setDeleteConfirm(selectedSpec.id)}
                      >
                        <EyeOff className="size-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>删除此规格文档</TooltipContent>
                  </Tooltip>
                </div>
              </div>

              {/* Editor content */}
              <div className="flex-1 min-h-0 overflow-y-auto">
                {isEditing ? (
                  <div className="p-4">
                    <Textarea
                      value={specContent}
                      onChange={(e) => setSpecContent(e.target.value)}
                      className="min-h-full w-full resize-none font-mono text-xs leading-relaxed border-0 focus-visible:ring-0 bg-transparent"
                      placeholder="开始编写大纲内容..."
                      rows={40}
                    />
                  </div>
                ) : (
                  <div className="p-4 md:p-6">
                    {/* If outline, show three-act structure preview */}
                    {selectedSpec.category === "outline" && selectedSpecActs.length > 0 ? (
                      <div className="space-y-4">
                        {/* Render structured acts */}
                        {selectedSpecActs.map((act) => {
                          const actColor = ACT_COLORS[act.actNumber] || ACT_COLORS[1];
                          return (
                            <Card
                              key={act.actNumber}
                              className={cn("border-l-4", actColor.border)}
                            >
                              <CardHeader className="pb-2 pt-3 px-4">
                                <div className="flex items-center justify-between">
                                  <CardTitle
                                    className={cn(
                                      "text-sm font-semibold",
                                      actColor.text
                                    )}
                                  >
                                    第
                                    {act.actNumber === 1
                                      ? "一"
                                      : act.actNumber === 2
                                      ? "二"
                                      : "三"}
                                    幕：{act.title}
                                  </CardTitle>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-6"
                                    onClick={() => toggleAct(act.actNumber)}
                                  >
                                    <ChevronDown
                                      className={cn(
                                        "size-3.5 transition-transform",
                                        !expandedActs[act.actNumber] &&
                                          "-rotate-90"
                                      )}
                                    />
                                  </Button>
                                </div>
                              </CardHeader>
                              {expandedActs[act.actNumber] && (
                                <CardContent className="px-4 pb-3">
                                  <div className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed font-mono">
                                    {act.content
                                      .replace(/^###\s*第[一二三1-3]幕[：:]?\s*(.*)\n?/, "")
                                      .trim()}
                                  </div>
                                </CardContent>
                              )}
                            </Card>
                          );
                        })}
                      </div>
                    ) : (
                      /* Plain content preview */
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <div className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed font-mono">
                          {specContent || (
                            <span className="text-muted-foreground/50">
                              点击编辑按钮开始编写内容...
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Status bar */}
              <div className="flex items-center justify-between px-4 py-1.5 border-t text-[11px] text-muted-foreground flex-shrink-0">
                <div className="flex items-center gap-3">
                  <span>{specContent.length.toLocaleString()} 字</span>
                  <span>
                    更新于{" "}
                    {selectedSpec.updatedAt
                      ? new Date(selectedSpec.updatedAt).toLocaleString("zh-CN", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "-"}
                  </span>
                </div>
                <span>{isEditing ? "编辑中" : "预览模式"}</span>
              </div>
            </div>
          </div>
        ) : (
          /* ===== Single column: Overview ===== */
          <ScrollArea className="flex-1">
            <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-32 w-full" />
                </div>
              ) : specs.length === 0 ? (
                /* ===== Empty State ===== */
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="size-16 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 flex items-center justify-center">
                    <Map className="size-8 text-amber-500" />
                  </div>
                  <div className="text-center max-w-sm">
                    <h3 className="text-sm font-semibold mb-1">还没有大纲文档</h3>
                    <p className="text-xs text-muted-foreground mb-4">
                      使用 AI 自动生成大纲，或手动创建规格文档来开始你的故事规划
                    </p>
                    <div className="flex gap-2 justify-center">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs gap-1.5 text-amber-600 border-amber-200 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/30"
                        onClick={handleAIGenerate}
                        disabled={aiGenerating}
                      >
                        {aiGenerating ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="size-3.5" />
                        )}
                        AI 生成大纲
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 text-xs gap-1.5"
                        onClick={() => {
                          setNewSpecForm({
                            title: "",
                            category: "outline",
                            content: "",
                          });
                          setShowCreateDialog(true);
                        }}
                      >
                        <Plus className="size-3.5" />
                        手动创建
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* ===== Three-Act Structure Overview ===== */}
                  {actStructure.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Target className="size-4 text-amber-500" />
                        <h3 className="text-sm font-semibold">三幕结构总览</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {[1, 2, 3].map((actNum) => {
                          const act = actStructure.find(
                            (a) => a.actNumber === actNum
                          );
                          const actColor = ACT_COLORS[actNum];
                          return (
                            <Card
                              key={actNum}
                              className={cn(
                                "border-l-4 cursor-pointer hover:shadow-md transition-shadow",
                                actColor.border
                              )}
                              onClick={() => {
                                if (act) {
                                  setExpandedActs((prev) => ({
                                    ...prev,
                                    [actNum]: true,
                                  }));
                                }
                              }}
                            >
                              <CardHeader className="pb-2 pt-3 px-3">
                                <CardTitle
                                  className={cn(
                                    "text-xs font-semibold",
                                    actColor.text
                                  )}
                                >
                                  第
                                  {actNum === 1
                                    ? "一"
                                    : actNum === 2
                                    ? "二"
                                    : "三"}
                                  幕
                                  {act ? `：${act.title}` : ""}
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="px-3 pb-3">
                                {act ? (
                                  <p className="text-[11px] text-muted-foreground line-clamp-4 whitespace-pre-wrap leading-relaxed">
                                    {act.content
                                      .replace(
                                        /^###\s*第[一二三1-3]幕[：:]?\s*(.*)\n?/,
                                        ""
                                      )
                                      .trim()
                                      .slice(0, 200)}
                                    {act.content.length > 200 ? "..." : ""}
                                  </p>
                                ) : (
                                  <p className="text-[11px] text-muted-foreground italic">
                                    尚未规划
                                  </p>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ===== Spec Cards ===== */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="size-4 text-amber-500" />
                      <h3 className="text-sm font-semibold">规格文档</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {specs.map((spec) => {
                        const catConfig =
                          CATEGORY_CONFIG[spec.category] || {
                            label: spec.category,
                            color: "text-gray-500 bg-gray-50 dark:bg-gray-900/30 dark:text-gray-400",
                          };
                        const CatIcon =
                          (CATEGORY_CONFIG[spec.category] || { icon: FileText })
                            .icon;
                        return (
                          <Card
                            key={spec.id}
                            className="cursor-pointer hover:shadow-md transition-all hover:border-amber-200 dark:hover:border-amber-800 group"
                            onClick={() => handleSelectSpec(spec)}
                          >
                            <CardHeader className="pb-2 pt-3 px-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div
                                    className={cn(
                                      "size-7 rounded-md flex items-center justify-center flex-shrink-0",
                                      catConfig.color
                                    )}
                                  >
                                    <CatIcon className="size-3.5" />
                                  </div>
                                  <CardTitle className="text-xs font-semibold truncate">
                                    {spec.title}
                                  </CardTitle>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <Badge
                                    variant="outline"
                                    className="text-[9px] h-5"
                                  >
                                    v{spec.version}
                                  </Badge>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-6 opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-500"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeleteConfirm(spec.id);
                                    }}
                                  >
                                    <EyeOff className="size-3" />
                                  </Button>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="px-3 pb-3">
                              <div className="flex items-center gap-2 mb-1.5">
                                <Badge
                                  className={cn(
                                    "text-[9px]",
                                    catConfig.color
                                  )}
                                >
                                  {catConfig.label}
                                </Badge>
                                <span className="text-[10px] text-muted-foreground">
                                  {spec.content.length} 字
                                </span>
                              </div>
                              <p className="text-[11px] text-muted-foreground line-clamp-2 whitespace-pre-wrap leading-relaxed">
                                {spec.content
                                  ? spec.content.slice(0, 150) + (spec.content.length > 150 ? "..." : "")
                                  : "暂无内容"}
                              </p>
                              <p className="text-[9px] text-muted-foreground/60 mt-2">
                                {spec.createdAt
                                  ? new Date(
                                      spec.createdAt
                                    ).toLocaleString("zh-CN", {
                                      month: "short",
                                      day: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })
                                  : ""}
                              </p>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>

                  {/* ===== Foreshadowing Tracker ===== */}
                  {foreshadowingItems.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Bookmark className="size-4 text-amber-500" />
                        <h3 className="text-sm font-semibold">伏笔追踪</h3>
                        <Badge variant="secondary" className="text-[10px]">
                          {foreshadowingItems.length} 条
                        </Badge>
                      </div>
                      <Card>
                        <CardContent className="p-3">
                          <div className="space-y-2">
                            {/* Status summary */}
                            <div className="flex items-center gap-3 text-[10px] text-muted-foreground mb-3 flex-wrap">
                              <div className="flex items-center gap-1">
                                <span className="size-2 rounded-full bg-sky-500" />
                                已埋设{" "}
                                {
                                  foreshadowingItems.filter(
                                    (i) => i.status === "planted"
                                  ).length
                                }
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="size-2 rounded-full bg-amber-500" />
                                部分回收{" "}
                                {
                                  foreshadowingItems.filter(
                                    (i) => i.status === "partially"
                                  ).length
                                }
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="size-2 rounded-full bg-emerald-500" />
                                已回收{" "}
                                {
                                  foreshadowingItems.filter(
                                    (i) => i.status === "resolved"
                                  ).length
                                }
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="size-2 rounded-full bg-gray-400" />
                                已废弃{" "}
                                {
                                  foreshadowingItems.filter(
                                    (i) => i.status === "abandoned"
                                  ).length
                                }
                              </div>
                            </div>

                            {/* Progress bar */}
                            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden flex">
                              {foreshadowingItems.length > 0 && (
                                <>
                                  {foreshadowingItems.some(
                                    (i) => i.status === "resolved"
                                  ) && (
                                    <div
                                      className="bg-emerald-500 h-full transition-all"
                                      style={{
                                        width: `${
                                          (foreshadowingItems.filter(
                                            (i) => i.status === "resolved"
                                          ).length /
                                            foreshadowingItems.length) *
                                          100
                                        }%`,
                                      }}
                                    />
                                  )}
                                  {foreshadowingItems.some(
                                    (i) => i.status === "partially"
                                  ) && (
                                    <div
                                      className="bg-amber-500 h-full transition-all"
                                      style={{
                                        width: `${
                                          (foreshadowingItems.filter(
                                            (i) => i.status === "partially"
                                          ).length /
                                            foreshadowingItems.length) *
                                          100
                                        }%`,
                                      }}
                                    />
                                  )}
                                  {foreshadowingItems.some(
                                    (i) => i.status === "planted"
                                  ) && (
                                    <div
                                      className="bg-sky-500 h-full transition-all"
                                      style={{
                                        width: `${
                                          (foreshadowingItems.filter(
                                            (i) => i.status === "planted"
                                          ).length /
                                            foreshadowingItems.length) *
                                          100
                                        }%`,
                                      }}
                                    />
                                  )}
                                </>
                              )}
                            </div>

                            {/* Item list */}
                            <div className="space-y-1.5 mt-3">
                              {foreshadowingItems.map((item, idx) => {
                                const statusConfig =
                                  getForeshadowStatusConfig(item.status);
                                return (
                                  <div
                                    key={idx}
                                    className="flex items-center gap-3 py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors"
                                  >
                                    <span
                                      className={cn(
                                        "size-2 rounded-full flex-shrink-0",
                                        statusConfig.dot
                                      )}
                                    />
                                    <span className="text-xs font-medium flex-1 truncate min-w-0">
                                      {item.name}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground flex-shrink-0 hidden sm:inline">
                                      埋设: {item.plantChapter}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground flex-shrink-0 hidden sm:inline">
                                      回收: {item.payoffChapter}
                                    </span>
                                    <Badge
                                      className={cn(
                                        "text-[9px] flex-shrink-0",
                                        statusConfig.color
                                      )}
                                    >
                                      {statusConfig.label}
                                    </Badge>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
        )}

        {/* ===== Create Spec Dialog ===== */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="size-4 text-amber-500" />
                新建规格文档
              </DialogTitle>
              <DialogDescription>
                创建一份新的规格文档来管理你的小说设定
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <label className="text-xs font-medium">文档标题</label>
                <Input
                  value={newSpecForm.title}
                  onChange={(e) =>
                    setNewSpecForm((prev) => ({
                      ...prev,
                      title: e.target.value,
                    }))
                  }
                  placeholder="例如：故事大纲、角色档案..."
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium">文档分类</label>
                <Select
                  value={newSpecForm.category}
                  onValueChange={(v) =>
                    setNewSpecForm((prev) => ({
                      ...prev,
                      category: v,
                      content:
                        prev.content === "" || prev.content === OUTLINE_TEMPLATES[prev.category]
                          ? OUTLINE_TEMPLATES[v] || ""
                          : prev.content,
                    }))
                  }
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium">初始内容</label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] gap-1"
                    onClick={() =>
                      setNewSpecForm((prev) => ({
                        ...prev,
                        content:
                          OUTLINE_TEMPLATES[prev.category] ||
                          prev.content,
                      }))
                    }
                  >
                    <Wand2 className="size-3" />
                    使用模板
                  </Button>
                </div>
                <Textarea
                  value={newSpecForm.content}
                  onChange={(e) =>
                    setNewSpecForm((prev) => ({
                      ...prev,
                      content: e.target.value,
                    }))
                  }
                  placeholder="输入内容，或留空使用模板..."
                  className="min-h-[200px] text-xs font-mono leading-relaxed"
                  rows={10}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCreateDialog(false)}
              >
                取消
              </Button>
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={creating || !newSpecForm.title.trim()}
              >
                {creating ? (
                  <Loader2 className="size-3.5 animate-spin mr-1.5" />
                ) : (
                  <Plus className="size-3.5 mr-1.5" />
                )}
                创建
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ===== Delete Confirm Dialog ===== */}
        <Dialog
          open={!!deleteConfirm}
          onOpenChange={(open) => !open && setDeleteConfirm(null)}
        >
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>确认删除</DialogTitle>
              <DialogDescription>
                删除后无法恢复，确定要删除这份规格文档吗？
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteConfirm(null)}
              >
                取消
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (deleteConfirm) handleDelete(deleteConfirm);
                }}
                disabled={creating}
              >
                {creating ? (
                  <Loader2 className="size-3.5 animate-spin mr-1.5" />
                ) : null}
                确认删除
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TooltipProvider>
    </div>
  );
}
