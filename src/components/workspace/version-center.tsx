"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  GitBranch,
  GitCommit,
  GitCompare,
  GitPullRequest,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  Clock,
  Bookmark,
  Shield,
  Play,
  Check,
  Archive,
  AlertTriangle,
  FileCode,
  Layers,
  Copy,
  Eye,
  ChevronRight,
  X,
  FileText,
  Tag,
  Milestone,
  Users,
  Globe,
  Settings,
  History,
  ArrowLeft,
  Loader2,
  Brain,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ==================== Types ====================

interface VersionCenterProps {
  novelId: string;
}

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
  _count?: { specDeltas: number };
}

interface ChangeProposal {
  id: string;
  novelId: string;
  title: string;
  description: string;
  scope: string;
  impact: string;
  tasks: string;
  status: string;
  completedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { specDeltas: number };
}

interface ChapterSnapshot {
  id: string;
  novelId: string;
  chapterId: string | null;
  chapterNumber: number;
  snapshotType: string;
  label: string;
  chapterContent: string;
  specSnapshot: string;
  metadata: string;
  createdAt: string;
}

interface Branch {
  id: string;
  novelId: string;
  name: string;
  description: string;
  parentBranchId: string | null;
  basedOnSnapshotId: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

// ==================== Constants ====================

const SPEC_CATEGORIES = [
  { value: "outline", label: "大纲", icon: FileCode, color: "text-amber-500" },
  { value: "characters", label: "角色设定", icon: Users, color: "text-rose-500" },
  { value: "worldbuilding", label: "世界观", icon: Globe, color: "text-orange-500" },
  { value: "rules", label: "规则约束", icon: Shield, color: "text-sky-500" },
  { value: "style", label: "风格指南", icon: FileCode, color: "text-violet-500" },
];

const SPEC_TEMPLATES: Record<string, string> = {
  outline: `# 故事大纲

## 核心设定
- **主题**：在此描述核心主题
- **基调**：在此描述故事基调

## 主线剧情

### 第一幕：开端
- 故事起点与角色引入
- 核心冲突初现

### 第二幕：发展
- 情节推进与角色成长
- 危机升级

### 第三幕：高潮与结局
- 终极对决
- 故事收尾

## 伏笔计划
| 伏笔 | 埋设章节 | 回收章节 | 状态 |
|------|----------|----------|------|
|      |          |          |      |`,
  characters: `# 角色设定

## 角色档案

| 属性 | 设定 |
|------|------|
| 姓名 | |
| 年龄 | |
| 身份 | |
| 外貌 | |
| 性格 | |
| 背景 | |

## 角色弧线
- **初始状态**：
- **转折点**：
- **最终状态**：`,
  worldbuilding: `# 世界观设定

## 世界基础
| 维度 | 设定 |
|------|------|
| 时代背景 | |
| 地理环境 | |
| 社会结构 | |
| 科技/魔法水平 | |

## 势力格局
| 势力 | 特点 | 与主角关系 |
|------|------|------------|
|      |      |            |`,
  rules: `# 规则约束

## 叙事规则
- 叙事视角统一
- 时间线保持线性一致

## 写作规范
- 避免使用的词汇：突然、不由得、竟然
- 每章结尾留有悬念
- 章节字数在 2000-4000 字之间`,
  style: `# 风格指南

## 语言风格
- 采用第三人称全知视角
- 使用五感描写

## 对话风格
- 每个角色的对话风格独特
- 用词和语气反映角色性格

## 节奏控制
| 段落类型 | 节奏 | 字数占比 |
|----------|------|----------|
| 动作戏 | 快 | 30% |
| 情感戏 | 慢 | 25% |
| 描写 | 中 | 25% |
| 对话 | 中 | 20% |`,
};

const PROPOSAL_STATUS_MAP: Record<
  string,
  { label: string; color: string }
> = {
  draft: {
    label: "草稿",
    color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  },
  validated: {
    label: "已验证",
    color: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  },
  in_progress: {
    label: "进行中",
    color:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  },
  completed: {
    label: "已完成",
    color:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  archived: {
    label: "已归档",
    color: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
  },
};

const KANBAN_COLUMNS = [
  { value: "draft", label: "草稿", icon: FileText },
  { value: "validated", label: "已验证", icon: Shield },
  { value: "in_progress", label: "进行中", icon: Play },
  { value: "completed", label: "已完成", icon: Check },
  { value: "archived", label: "已归档", icon: Archive },
];

const KANBAN_BG_COLORS: Record<string, string> = {
  draft: "bg-gray-50/80 dark:bg-gray-900/30",
  validated: "bg-sky-50/80 dark:bg-sky-950/20",
  in_progress: "bg-amber-50/80 dark:bg-amber-950/20",
  completed: "bg-emerald-50/80 dark:bg-emerald-950/20",
  archived: "bg-gray-50/50 dark:bg-gray-900/20",
};

// ==================== Component ====================

export function VersionCenter({ novelId }: VersionCenterProps) {
  const { chapters, setChapters, workspaceTab, setWorkspaceTab, setEngineeringCollapsed } = useAppStore();

  // Common state
  const [activeTab, setActiveTab] = useState("specs");
  const [loading, setLoading] = useState(true);

  // Specs state
  const [specs, setSpecs] = useState<NovelSpec[]>([]);
  const [specFilter, setSpecFilter] = useState<string>("all");
  const [expandedSpecId, setExpandedSpecId] = useState<string | null>(null);
  const [editingSpecContent, setEditingSpecContent] = useState("");
  const [specSaving, setSpecSaving] = useState(false);
  const [showCreateSpec, setShowCreateSpec] = useState(false);
  const [specForm, setSpecForm] = useState({
    category: "outline",
    title: "",
    content: "",
  });

  // Proposals state
  const [proposals, setProposals] = useState<ChangeProposal[]>([]);
  const [expandedProposalId, setExpandedProposalId] = useState<string | null>(
    null
  );
  const [showCreateProposal, setShowCreateProposal] = useState(false);
  const [proposalForm, setProposalForm] = useState({
    title: "",
    description: "",
    scope: "",
    impact: "",
    tasks: "",
  });

  // Snapshots state
  const [snapshots, setSnapshots] = useState<ChapterSnapshot[]>([]);
  const [showCreateSnapshot, setShowCreateSnapshot] = useState(false);
  const [snapshotForm, setSnapshotForm] = useState({
    label: "",
    chapterId: "",
    snapshotType: "manual",
  });

  // Branches state
  const [branches, setBranches] = useState<Branch[]>([]);
  const [showCreateBranch, setShowCreateBranch] = useState(false);
  const [branchForm, setBranchForm] = useState({
    name: "",
    description: "",
    basedOnSnapshotId: "",
  });

  // ==================== Data Loading ====================

  const loadSpecs = useCallback(async () => {
    try {
      const res = await fetch(`/api/specs?novelId=${novelId}`);
      if (res.ok) setSpecs(await res.json());
    } catch (e) {
      console.error(e);
    }
  }, [novelId]);

  const loadProposals = useCallback(async () => {
    try {
      const res = await fetch(`/api/proposals?novelId=${novelId}`);
      if (res.ok) setProposals(await res.json());
    } catch (e) {
      console.error(e);
    }
  }, [novelId]);

  const loadSnapshots = useCallback(async () => {
    try {
      const res = await fetch(`/api/snapshots?novelId=${novelId}`);
      if (res.ok) setSnapshots(await res.json());
    } catch (e) {
      console.error(e);
    }
  }, [novelId]);

  const loadBranches = useCallback(async () => {
    try {
      const res = await fetch(`/api/branches?novelId=${novelId}`);
      if (res.ok) setBranches(await res.json());
    } catch (e) {
      console.error(e);
    }
  }, [novelId]);

  const loadChapters = useCallback(async () => {
    try {
      const res = await fetch(`/api/novels/${novelId}/chapters`);
      if (res.ok) setChapters(await res.json());
    } catch (e) {
      console.error(e);
    }
  }, [novelId, setChapters]);

  useEffect(() => {
    async function loadAll() {
      setLoading(true);
      await Promise.all([
        loadSpecs(),
        loadProposals(),
        loadSnapshots(),
        loadBranches(),
        loadChapters(),
      ]);
      setLoading(false);
    }
    loadAll();
  }, [loadSpecs, loadProposals, loadSnapshots, loadBranches, loadChapters]);

  // ==================== Spec CRUD ====================

  async function createSpec() {
    if (!specForm.title.trim()) return;
    try {
      const content =
        specForm.content || SPEC_TEMPLATES[specForm.category] || "";
      const res = await fetch("/api/specs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...specForm,
          content,
          novelId,
        }),
      });
      if (res.ok) {
        const spec = await res.json();
        setShowCreateSpec(false);
        setSpecForm({ category: "outline", title: "", content: "" });
        setExpandedSpecId(spec.id);
        setEditingSpecContent(spec.content);
        loadSpecs();
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function saveSpecContent(specId: string) {
    setSpecSaving(true);
    try {
      await fetch(`/api/specs/${specId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editingSpecContent }),
      });
      loadSpecs();
      setSpecSaving(false);
    } catch (e) {
      console.error(e);
      setSpecSaving(false);
    }
  }

  async function deleteSpec(id: string) {
    try {
      await fetch(`/api/specs/${id}`, { method: "DELETE" });
      if (expandedSpecId === id) {
        setExpandedSpecId(null);
        setEditingSpecContent("");
      }
      loadSpecs();
    } catch (e) {
      console.error(e);
    }
  }

  // ==================== Proposal CRUD ====================

  async function createProposal() {
    if (!proposalForm.title.trim()) return;
    try {
      const res = await fetch("/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...proposalForm, novelId }),
      });
      if (res.ok) {
        setShowCreateProposal(false);
        setProposalForm({
          title: "",
          description: "",
          scope: "",
          impact: "",
          tasks: "",
        });
        loadProposals();
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function updateProposalStatus(id: string, status: string) {
    try {
      await fetch(`/api/proposals/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      loadProposals();
    } catch (e) {
      console.error(e);
    }
  }

  async function deleteProposal(id: string) {
    try {
      await fetch(`/api/proposals/${id}`, { method: "DELETE" });
      if (expandedProposalId === id) setExpandedProposalId(null);
      loadProposals();
    } catch (e) {
      console.error(e);
    }
  }

  // ==================== Snapshot CRUD ====================

  async function createSnapshot() {
    try {
      let chapterContent = "";
      if (snapshotForm.chapterId) {
        const res = await fetch(`/api/chapters/${snapshotForm.chapterId}`);
        if (res.ok) {
          const ch = await res.json();
          chapterContent = ch.content || "";
        }
      }
      const specSnapshot = JSON.stringify(
        specs.map((s) => ({
          id: s.id,
          title: s.title,
          category: s.category,
          version: s.version,
          content: s.content,
        }))
      );
      const res = await fetch("/api/snapshots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          novelId,
          label:
            snapshotForm.label ||
            `快照 ${new Date().toLocaleString("zh-CN")}`,
          chapterId: snapshotForm.chapterId || null,
          snapshotType: snapshotForm.snapshotType,
          chapterContent,
          specSnapshot,
        }),
      });
      if (res.ok) {
        setShowCreateSnapshot(false);
        setSnapshotForm({ label: "", chapterId: "", snapshotType: "manual" });
        loadSnapshots();
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function deleteSnapshot(id: string) {
    try {
      await fetch(`/api/snapshots/${id}`, { method: "DELETE" });
      loadSnapshots();
    } catch (e) {
      console.error(e);
    }
  }

  async function restoreSnapshot(snap: ChapterSnapshot) {
    if (
      !confirm(
        `确认恢复到快照「${snap.label}」？这将覆盖当前章节内容。`
      )
    )
      return;
    try {
      if (snap.chapterContent && snap.chapterId) {
        await fetch(`/api/chapters/${snap.chapterId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: snap.chapterContent }),
        });
      }
    } catch (e) {
      console.error(e);
    }
  }

  // ==================== Branch CRUD ====================

  async function createBranch() {
    if (!branchForm.name.trim()) return;
    try {
      const res = await fetch("/api/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...branchForm, novelId }),
      });
      if (res.ok) {
        setShowCreateBranch(false);
        setBranchForm({ name: "", description: "", basedOnSnapshotId: "" });
        loadBranches();
      }
    } catch (e) {
      console.error(e);
    }
  }

  // ==================== Helpers ====================

  const filteredSpecs =
    specFilter === "all"
      ? specs
      : specs.filter((s) => s.category === specFilter);

  const expandedSpec = specs.find((s) => s.id === expandedSpecId);
  const expandedProposal = proposals.find(
    (p) => p.id === expandedProposalId
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">
          加载版本数据...
        </span>
      </div>
    );
  }

  // ==================== Render ====================

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center gap-3">
            <GitCompare className="size-5 text-teal-600 dark:text-teal-400" />
            <div>
              <h2 className="text-base font-semibold">版本管理中心</h2>
              <p className="text-xs text-muted-foreground">
                规格文档 · 变更提案 · 版本快照 · 分支管理
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={() => {
              setWorkspaceTab("outline");
              setEngineeringCollapsed(true);
            }}
          >
            <ArrowLeft className="size-3.5" />
            返回创作
          </Button>
        </div>

        {/* Tab Navigation */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <div className="border-b px-6 flex-shrink-0">
            <TabsList className="h-10 w-auto bg-transparent p-0 gap-0">
              <TabsTrigger
                value="specs"
                className="gap-1.5 text-sm rounded-none border-b-2 border-transparent px-4 data-[state=active]:border-teal-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-muted-foreground data-[state=active]:text-foreground"
              >
                <FileCode className="size-4" />
                规格文档
                <Badge
                  variant="secondary"
                  className="h-4 px-1.5 text-[10px] ml-1"
                >
                  {specs.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="proposals"
                className="gap-1.5 text-sm rounded-none border-b-2 border-transparent px-4 data-[state=active]:border-teal-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-muted-foreground data-[state=active]:text-foreground"
              >
                <GitPullRequest className="size-4" />
                变更提案
                {proposals.filter((p) => p.status === "in_progress").length >
                  0 && (
                  <Badge className="h-4 px-1.5 text-[10px] ml-1 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                    {proposals.filter((p) => p.status === "in_progress").length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="snapshots"
                className="gap-1.5 text-sm rounded-none border-b-2 border-transparent px-4 data-[state=active]:border-teal-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-muted-foreground data-[state=active]:text-foreground"
              >
                <GitCommit className="size-4" />
                版本快照
                <Badge
                  variant="secondary"
                  className="h-4 px-1.5 text-[10px] ml-1"
                >
                  {snapshots.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="branches"
                className="gap-1.5 text-sm rounded-none border-b-2 border-transparent px-4 data-[state=active]:border-teal-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-muted-foreground data-[state=active]:text-foreground"
              >
                <GitBranch className="size-4" />
                分支
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ==================== SPECS TAB ==================== */}
          <TabsContent
            value="specs"
            className="flex-1 m-0 overflow-hidden flex flex-col"
          >
            {/* Spec Filter Bar */}
            <div className="flex items-center gap-2 px-6 py-3 border-b flex-shrink-0 bg-muted/30">
              <div className="flex items-center gap-1.5">
                <button
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                    specFilter === "all"
                      ? "bg-teal-600 text-white shadow-sm"
                      : "bg-background text-muted-foreground hover:bg-muted border"
                  )}
                  onClick={() => setSpecFilter("all")}
                >
                  全部
                </button>
                {SPEC_CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    className={cn(
                      "px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5",
                      specFilter === cat.value
                        ? "bg-teal-600 text-white shadow-sm"
                        : "bg-background text-muted-foreground hover:bg-muted border"
                    )}
                    onClick={() => setSpecFilter(cat.value)}
                  >
                    <cat.icon
                      className={cn(
                        "size-3",
                        specFilter === cat.value
                          ? "text-white"
                          : cat.color
                      )}
                    />
                    {cat.label}
                  </button>
                ))}
              </div>
              <div className="flex-1" />
              <Button
                size="sm"
                className="h-7 text-xs gap-1.5 bg-teal-600 hover:bg-teal-700"
                onClick={() => setShowCreateSpec(true)}
              >
                <Plus className="size-3.5" />
                新建规格
              </Button>
            </div>

            {/* Spec Content */}
            <ScrollArea className="flex-1">
              <div className="p-6">
                {filteredSpecs.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="size-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                      <FileCode className="size-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      暂无规格文档
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      基于 OpenSpec 方法论创建小说规格文档
                    </p>
                    <Button
                      size="sm"
                      className="mt-4 bg-teal-600 hover:bg-teal-700"
                      onClick={() => setShowCreateSpec(true)}
                    >
                      <Plus className="size-3.5 mr-1" />
                      创建第一个规格
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredSpecs.map((spec) => {
                      const cat = SPEC_CATEGORIES.find(
                        (c) => c.value === spec.category
                      );
                      const isExpanded = expandedSpecId === spec.id;
                      return (
                        <Card
                          key={spec.id}
                          className={cn(
                            "transition-all hover:shadow-md cursor-pointer border",
                            isExpanded && "ring-1 ring-teal-500/30 shadow-md"
                          )}
                          onClick={() => {
                            if (isExpanded) {
                              setExpandedSpecId(null);
                              setEditingSpecContent("");
                            } else {
                              setExpandedSpecId(spec.id);
                              setEditingSpecContent(spec.content);
                            }
                          }}
                        >
                          <CardHeader className="p-4 pb-0">
                            <div className="flex items-center gap-3">
                              <div
                                className={cn(
                                  "size-8 rounded-lg flex items-center justify-center flex-shrink-0",
                                  spec.status === "archived"
                                    ? "bg-gray-100 dark:bg-gray-800"
                                    : "bg-teal-50 dark:bg-teal-900/30"
                                )}
                              >
                                {cat && (
                                  <cat.icon
                                    className={cn(
                                      "size-4",
                                      spec.status === "archived"
                                        ? "text-muted-foreground"
                                        : cat.color
                                    )}
                                  />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <CardTitle className="text-sm font-medium truncate">
                                    {spec.title}
                                  </CardTitle>
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] h-5 px-1.5 flex-shrink-0"
                                  >
                                    v{spec.version}
                                  </Badge>
                                  {spec.status === "active" && (
                                    <Badge className="text-[10px] h-5 px-1.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 flex-shrink-0">
                                      活跃
                                    </Badge>
                                  )}
                                  {spec.status === "archived" && (
                                    <Badge className="text-[10px] h-5 px-1.5 flex-shrink-0">
                                      已归档
                                    </Badge>
                                  )}
                                </div>
                                <CardDescription className="text-xs mt-0.5">
                                  {cat?.label} · 更新于{" "}
                                  {new Date(
                                    spec.updatedAt
                                  ).toLocaleDateString("zh-CN")}
                                  {spec._count && spec._count.specDeltas > 0 && (
                                    <span className="ml-2">
                                      {spec._count.specDeltas} 次变更
                                    </span>
                                  )}
                                </CardDescription>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="size-7"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigator.clipboard.writeText(
                                          spec.content
                                        );
                                      }}
                                    >
                                      <Copy className="size-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>复制内容</TooltipContent>
                                </Tooltip>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-7 text-destructive hover:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteSpec(spec.id);
                                  }}
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                                <ChevronRight
                                  className={cn(
                                    "size-4 text-muted-foreground transition-transform",
                                    isExpanded && "rotate-90"
                                  )}
                                />
                              </div>
                            </div>
                          </CardHeader>
                          {isExpanded && (
                            <CardContent className="p-4 pt-3">
                              <Separator className="mb-3" />
                              <Textarea
                                value={editingSpecContent}
                                onChange={(e) =>
                                  setEditingSpecContent(e.target.value)
                                }
                                className="min-h-[200px] resize-y border font-mono text-xs leading-relaxed bg-muted/30"
                                placeholder="编辑规格文档内容..."
                                onClick={(e) => e.stopPropagation()}
                              />
                              <div className="flex items-center justify-between mt-3">
                                <span className="text-[10px] text-muted-foreground">
                                  支持 OpenSpec 格式: SHALL/MUST/MAY +
                                  WHEN/THEN
                                </span>
                                <Button
                                  size="sm"
                                  className="h-7 text-xs gap-1.5 bg-teal-600 hover:bg-teal-700"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    saveSpecContent(spec.id);
                                  }}
                                  disabled={specSaving}
                                >
                                  {specSaving ? (
                                    <Loader2 className="size-3.5 animate-spin" />
                                  ) : (
                                    <Save className="size-3.5" />
                                  )}
                                  {specSaving ? "保存中..." : "保存并升级版本"}
                                </Button>
                              </div>
                            </CardContent>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ==================== PROPOSALS TAB (Kanban) ==================== */}
          <TabsContent
            value="proposals"
            className="flex-1 m-0 overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between px-6 py-3 border-b flex-shrink-0 bg-muted/30">
              <p className="text-xs text-muted-foreground">
                {proposals.length} 个提案 · 拖拽卡片管理提案状态
              </p>
              <Button
                size="sm"
                className="h-7 text-xs gap-1.5 bg-teal-600 hover:bg-teal-700"
                onClick={() => setShowCreateProposal(true)}
              >
                <Plus className="size-3.5" />
                新建提案
              </Button>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-6">
                {proposals.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="size-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                      <GitPullRequest className="size-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      暂无变更提案
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      使用提案管理故事变更流程
                    </p>
                    <Button
                      size="sm"
                      className="mt-4 bg-teal-600 hover:bg-teal-700"
                      onClick={() => setShowCreateProposal(true)}
                    >
                      <Plus className="size-3.5 mr-1" />
                      创建第一个提案
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    {KANBAN_COLUMNS.map((col) => {
                      const colProposals = proposals.filter(
                        (p) => p.status === col.value
                      );
                      return (
                        <div
                          key={col.value}
                          className={cn(
                            "rounded-lg p-3 min-h-[200px]",
                            KANBAN_BG_COLORS[col.value]
                          )}
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <col.icon className="size-3.5 text-muted-foreground" />
                            <span className="text-xs font-semibold text-muted-foreground">
                              {col.label}
                            </span>
                            <Badge
                              variant="secondary"
                              className="text-[10px] h-4 px-1.5 ml-auto"
                            >
                              {colProposals.length}
                            </Badge>
                          </div>
                          <div className="space-y-2">
                            {colProposals.map((p) => {
                              const isExpanded =
                                expandedProposalId === p.id;
                              return (
                                <Card
                                  key={p.id}
                                  className={cn(
                                    "cursor-pointer transition-all hover:shadow-md text-xs",
                                    isExpanded && "ring-1 ring-teal-500/30"
                                  )}
                                  onClick={() => {
                                    setExpandedProposalId(
                                      isExpanded ? null : p.id
                                    );
                                  }}
                                >
                                  <CardContent className="p-3">
                                    <div className="flex items-start justify-between gap-2">
                                      <p className="font-medium text-sm leading-tight">
                                        {p.title}
                                      </p>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="size-6 flex-shrink-0"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              deleteProposal(p.id);
                                            }}
                                          >
                                            <X className="size-3" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          删除提案
                                        </TooltipContent>
                                      </Tooltip>
                                    </div>
                                    {p.description && (
                                      <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                                        {p.description}
                                      </p>
                                    )}
                                    <div className="flex items-center gap-1.5 mt-2">
                                      <Badge
                                        className={cn(
                                          "text-[10px] h-4 px-1.5",
                                          PROPOSAL_STATUS_MAP[p.status]?.color
                                        )}
                                      >
                                        {PROPOSAL_STATUS_MAP[p.status]?.label}
                                      </Badge>
                                      <span className="text-[10px] text-muted-foreground ml-auto">
                                        {new Date(
                                          p.createdAt
                                        ).toLocaleDateString("zh-CN")}
                                      </span>
                                    </div>

                                    {/* Expanded details */}
                                    {isExpanded && (
                                      <div className="mt-3 pt-3 border-t space-y-2">
                                        {p.scope && (
                                          <div>
                                            <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">
                                              范围 (What)
                                            </p>
                                            <p className="text-xs whitespace-pre-wrap">
                                              {p.scope}
                                            </p>
                                          </div>
                                        )}
                                        {p.impact && (
                                          <div>
                                            <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">
                                              影响 (Impact)
                                            </p>
                                            <p className="text-xs whitespace-pre-wrap">
                                              {p.impact}
                                            </p>
                                          </div>
                                        )}
                                        {p.tasks && (
                                          <div>
                                            <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">
                                              任务清单
                                            </p>
                                            <div className="text-xs whitespace-pre-wrap bg-muted/50 rounded p-2 font-mono max-h-24 overflow-y-auto">
                                              {p.tasks}
                                            </div>
                                          </div>
                                        )}

                                        {/* Status transition buttons */}
                                        <div className="flex items-center gap-1.5 pt-2">
                                          {p.status === "draft" && (
                                            <Button
                                              size="sm"
                                              className="h-6 text-[10px] gap-1 bg-sky-600 hover:bg-sky-700"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                updateProposalStatus(
                                                  p.id,
                                                  "validated"
                                                );
                                              }}
                                            >
                                              <Shield className="size-3" />
                                              验证
                                            </Button>
                                          )}
                                          {p.status === "validated" && (
                                            <Button
                                              size="sm"
                                              className="h-6 text-[10px] gap-1 bg-amber-600 hover:bg-amber-700"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                updateProposalStatus(
                                                  p.id,
                                                  "in_progress"
                                                );
                                              }}
                                            >
                                              <Play className="size-3" />
                                              开始执行
                                            </Button>
                                          )}
                                          {p.status === "in_progress" && (
                                            <Button
                                              size="sm"
                                              className="h-6 text-[10px] gap-1 bg-emerald-600 hover:bg-emerald-700"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                updateProposalStatus(
                                                  p.id,
                                                  "completed"
                                                );
                                              }}
                                            >
                                              <Check className="size-3" />
                                              标记完成
                                            </Button>
                                          )}
                                          {p.status === "completed" && (
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="h-6 text-[10px] gap-1"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                updateProposalStatus(
                                                  p.id,
                                                  "archived"
                                                );
                                              }}
                                            >
                                              <Archive className="size-3" />
                                              归档
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ==================== SNAPSHOTS TAB (Timeline) ==================== */}
          <TabsContent
            value="snapshots"
            className="flex-1 m-0 overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between px-6 py-3 border-b flex-shrink-0 bg-muted/30">
              <p className="text-xs text-muted-foreground">
                {snapshots.length} 个快照 · 保存和回滚内容状态
              </p>
              <Button
                size="sm"
                className="h-7 text-xs gap-1.5 bg-teal-600 hover:bg-teal-700"
                onClick={() => setShowCreateSnapshot(true)}
              >
                <Plus className="size-3.5" />
                创建快照
              </Button>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-6">
                {snapshots.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="size-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                      <GitCommit className="size-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      暂无版本快照
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      快照保存当前内容状态，支持回滚
                    </p>
                    <Button
                      size="sm"
                      className="mt-4 bg-teal-600 hover:bg-teal-700"
                      onClick={() => setShowCreateSnapshot(true)}
                    >
                      <Plus className="size-3.5 mr-1" />
                      创建第一个快照
                    </Button>
                  </div>
                ) : (
                  <div className="relative max-w-2xl mx-auto">
                    {/* Vertical timeline line */}
                    <div className="absolute left-[19px] top-2 bottom-2 w-px bg-border" />

                    <div className="space-y-0">
                      {snapshots.map((snap, index) => {
                        const isManual =
                          snap.snapshotType === "manual";
                        return (
                          <div
                            key={snap.id}
                            className="group relative pl-12 pb-6 last:pb-0"
                          >
                            {/* Timeline dot */}
                            <div
                              className={cn(
                                "absolute left-2.5 top-1.5 size-4 rounded-full border-2 flex items-center justify-center z-10",
                                isManual
                                  ? "border-amber-400 bg-amber-50 dark:bg-amber-900/40"
                                  : "border-sky-400 bg-sky-50 dark:bg-sky-900/40"
                              )}
                            >
                              <div
                                className={cn(
                                  "size-1.5 rounded-full",
                                  isManual
                                    ? "bg-amber-500"
                                    : "bg-sky-500"
                                )}
                              />
                            </div>

                            {/* Snapshot card */}
                            <Card
                              className={cn(
                                "transition-all hover:shadow-md"
                              )}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-start gap-3 min-w-0">
                                    <div
                                      className={cn(
                                        "size-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5",
                                        isManual
                                          ? "bg-amber-100 dark:bg-amber-900/30"
                                          : "bg-sky-100 dark:bg-sky-900/30"
                                      )}
                                    >
                                      {isManual ? (
                                        <Bookmark className="size-4 text-amber-600 dark:text-amber-400" />
                                      ) : (
                                        <Clock className="size-4 text-sky-600 dark:text-sky-400" />
                                      )}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium truncate">
                                        {snap.label ||
                                          `快照 #${snap.chapterNumber}`}
                                      </p>
                                      <div className="flex items-center gap-2 mt-1">
                                        <Badge
                                          className={cn(
                                            "text-[10px] h-4 px-1.5",
                                            isManual
                                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                                              : "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300"
                                          )}
                                        >
                                          {isManual ? "手动" : "自动"}
                                        </Badge>
                                        <span className="text-[10px] text-muted-foreground">
                                          {new Date(
                                            snap.createdAt
                                          ).toLocaleString("zh-CN")}
                                        </span>
                                        {snap.chapterContent && (
                                          <span className="text-[10px] text-muted-foreground">
                                            · {snap.chapterContent.length}{" "}
                                            字
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {snap.chapterContent && (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="size-7"
                                            onClick={() =>
                                              restoreSnapshot(snap)
                                            }
                                          >
                                            <RotateCcw className="size-3.5 text-teal-600" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          恢复此快照
                                        </TooltipContent>
                                      </Tooltip>
                                    )}
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="size-7"
                                          onClick={() =>
                                            navigator.clipboard.writeText(
                                              snap.chapterContent
                                            )
                                          }
                                        >
                                          <Copy className="size-3.5" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        复制快照内容
                                      </TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="size-7 text-destructive hover:text-destructive"
                                          onClick={() =>
                                            deleteSnapshot(snap.id)
                                          }
                                        >
                                          <Trash2 className="size-3.5" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        删除快照
                                      </TooltipContent>
                                    </Tooltip>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ==================== BRANCHES TAB ==================== */}
          <TabsContent
            value="branches"
            className="flex-1 m-0 overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between px-6 py-3 border-b flex-shrink-0 bg-muted/30">
              <p className="text-xs text-muted-foreground">
                {branches.length} 个分支 · 管理替代时间线
              </p>
              <Button
                size="sm"
                className="h-7 text-xs gap-1.5 bg-teal-600 hover:bg-teal-700"
                onClick={() => setShowCreateBranch(true)}
              >
                <Plus className="size-3.5" />
                新建分支
              </Button>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-6">
                {branches.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="size-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                      <GitBranch className="size-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      暂无分支
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      创建分支以探索不同的故事方向
                    </p>
                    <Button
                      size="sm"
                      className="mt-4 bg-teal-600 hover:bg-teal-700"
                      onClick={() => setShowCreateBranch(true)}
                    >
                      <Plus className="size-3.5 mr-1" />
                      创建第一个分支
                    </Button>
                  </div>
                ) : (
                  <div className="max-w-2xl mx-auto space-y-0">
                    {/* Tree structure */}
                    {branches.map((branch, index) => {
                      const isMain = branch.name === "main";
                      const isActive = branch.status === "active";
                      return (
                        <div
                          key={branch.id}
                          className="group relative flex items-stretch"
                        >
                          {/* Tree connector */}
                          {index < branches.length - 1 && (
                            <div className="absolute left-[19px] top-10 bottom-0 w-px bg-border" />
                          )}
                          <div className="pl-12 pb-4 last:pb-0 relative">
                            {/* Branch dot */}
                            <div
                              className={cn(
                                "absolute left-2.5 top-3.5 size-4 rounded-full border-2 flex items-center justify-center z-10",
                                isMain
                                  ? "border-teal-500 bg-teal-50 dark:bg-teal-900/40"
                                  : isActive
                                    ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/40"
                                    : "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800"
                              )}
                            >
                              <div
                                className={cn(
                                  "size-1.5 rounded-full",
                                  isMain
                                    ? "bg-teal-500"
                                    : isActive
                                      ? "bg-emerald-500"
                                      : "bg-gray-400"
                                )}
                              />
                            </div>

                            <Card
                              className={cn(
                                "transition-all hover:shadow-md",
                                isMain &&
                                  "ring-1 ring-teal-500/20 border-teal-200 dark:border-teal-800"
                              )}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                  <div
                                    className={cn(
                                      "size-9 rounded-lg flex items-center justify-center flex-shrink-0",
                                      isMain
                                        ? "bg-teal-100 dark:bg-teal-900/40"
                                        : isActive
                                          ? "bg-emerald-100 dark:bg-emerald-900/40"
                                          : "bg-gray-100 dark:bg-gray-800"
                                    )}
                                  >
                                    <GitBranch
                                      className={cn(
                                        "size-4",
                                        isMain
                                          ? "text-teal-600 dark:text-teal-400"
                                          : isActive
                                            ? "text-emerald-600 dark:text-emerald-400"
                                            : "text-muted-foreground"
                                      )}
                                    />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-semibold">
                                        {branch.name}
                                      </span>
                                      {isMain && (
                                        <Badge className="text-[10px] h-5 px-1.5 bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">
                                          默认
                                        </Badge>
                                      )}
                                      {!isActive && (
                                        <Badge
                                          variant="outline"
                                          className="text-[10px] h-5 px-1.5"
                                        >
                                          {branch.status === "merged"
                                            ? "已合并"
                                            : "已废弃"}
                                        </Badge>
                                      )}
                                    </div>
                                    {branch.description && (
                                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                        {branch.description}
                                      </p>
                                    )}
                                    <p className="text-[10px] text-muted-foreground mt-1">
                                      创建于{" "}
                                      {new Date(
                                        branch.createdAt
                                      ).toLocaleDateString("zh-CN")}
                                    </p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* ==================== DIALOGS ==================== */}

        {/* Create Spec Dialog */}
        <Dialog open={showCreateSpec} onOpenChange={setShowCreateSpec}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileCode className="size-4 text-teal-600" />
                新建规格文档
              </DialogTitle>
              <DialogDescription>
                基于 OpenSpec 方法论创建小说规格文档
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  分类
                </label>
                <Select
                  value={specForm.category}
                  onValueChange={(v) => {
                    setSpecForm({
                      ...specForm,
                      category: v,
                      content: SPEC_TEMPLATES[v] || "",
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SPEC_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        <div className="flex items-center gap-2">
                          <c.icon
                            className={cn("size-3.5", c.color)}
                          />
                          {c.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  标题 *
                </label>
                <Input
                  value={specForm.title}
                  onChange={(e) =>
                    setSpecForm({ ...specForm, title: e.target.value })
                  }
                  placeholder="如：主角角色设定"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  内容（支持 OpenSpec 格式，已填充模板）
                </label>
                <Textarea
                  value={specForm.content}
                  onChange={(e) =>
                    setSpecForm({ ...specForm, content: e.target.value })
                  }
                  rows={8}
                  className="font-mono text-xs"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowCreateSpec(false)}
              >
                取消
              </Button>
              <Button
                onClick={createSpec}
                disabled={!specForm.title.trim()}
                className="bg-teal-600 hover:bg-teal-700"
              >
                创建
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Proposal Dialog */}
        <Dialog
          open={showCreateProposal}
          onOpenChange={setShowCreateProposal}
        >
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <GitPullRequest className="size-4 text-teal-600" />
                新建变更提案
              </DialogTitle>
              <DialogDescription>
                SDD 变更提案：描述 Why / What / Impact
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  标题 *
                </label>
                <Input
                  value={proposalForm.title}
                  onChange={(e) =>
                    setProposalForm({
                      ...proposalForm,
                      title: e.target.value,
                    })
                  }
                  placeholder="如：add-chapter-11-20"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  动机 (Why)
                </label>
                <Textarea
                  value={proposalForm.description}
                  onChange={(e) =>
                    setProposalForm({
                      ...proposalForm,
                      description: e.target.value,
                    })
                  }
                  rows={2}
                  placeholder="为什么要做这个变更..."
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  范围 (What)
                </label>
                <Textarea
                  value={proposalForm.scope}
                  onChange={(e) =>
                    setProposalForm({
                      ...proposalForm,
                      scope: e.target.value,
                    })
                  }
                  rows={2}
                  placeholder="具体变更内容..."
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  影响 (Impact)
                </label>
                <Textarea
                  value={proposalForm.impact}
                  onChange={(e) =>
                    setProposalForm({
                      ...proposalForm,
                      impact: e.target.value,
                    })
                  }
                  rows={2}
                  placeholder="影响的规格、章节..."
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  任务清单
                </label>
                <Textarea
                  value={proposalForm.tasks}
                  onChange={(e) =>
                    setProposalForm({
                      ...proposalForm,
                      tasks: e.target.value,
                    })
                  }
                  rows={3}
                  placeholder="每行一个任务..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowCreateProposal(false)}
              >
                取消
              </Button>
              <Button
                onClick={createProposal}
                disabled={!proposalForm.title.trim()}
                className="bg-teal-600 hover:bg-teal-700"
              >
                创建
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Snapshot Dialog */}
        <Dialog
          open={showCreateSnapshot}
          onOpenChange={setShowCreateSnapshot}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <GitCommit className="size-4 text-teal-600" />
                创建版本快照
              </DialogTitle>
              <DialogDescription>
                保存当前内容状态，支持后续回滚
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  快照标签
                </label>
                <Input
                  value={snapshotForm.label}
                  onChange={(e) =>
                    setSnapshotForm({
                      ...snapshotForm,
                      label: e.target.value,
                    })
                  }
                  placeholder="如：v1.0-beta"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  关联章节（可选）
                </label>
                <Select
                  value={snapshotForm.chapterId}
                  onValueChange={(v) =>
                    setSnapshotForm({
                      ...snapshotForm,
                      chapterId: v,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="全部章节" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部章节</SelectItem>
                    {chapters.map((ch) => (
                      <SelectItem key={ch.id} value={ch.id}>
                        第{ch.chapterNumber}章: {ch.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  快照类型
                </label>
                <Select
                  value={snapshotForm.snapshotType}
                  onValueChange={(v) =>
                    setSnapshotForm({
                      ...snapshotForm,
                      snapshotType: v,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">
                      <div className="flex items-center gap-2">
                        <Bookmark className="size-3 text-amber-500" />
                        手动快照
                      </div>
                    </SelectItem>
                    <SelectItem value="auto_pre_write">
                      <div className="flex items-center gap-2">
                        <Clock className="size-3 text-sky-500" />
                        写前自动
                      </div>
                    </SelectItem>
                    <SelectItem value="auto_post_write">
                      <div className="flex items-center gap-2">
                        <Clock className="size-3 text-emerald-500" />
                        写后自动
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowCreateSnapshot(false)}
              >
                取消
              </Button>
              <Button
                onClick={createSnapshot}
                className="bg-teal-600 hover:bg-teal-700"
              >
                创建快照
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Branch Dialog */}
        <Dialog open={showCreateBranch} onOpenChange={setShowCreateBranch}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <GitBranch className="size-4 text-teal-600" />
                创建分支
              </DialogTitle>
              <DialogDescription>
                从当前状态创建替代时间线
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  分支名称 *
                </label>
                <Input
                  value={branchForm.name}
                  onChange={(e) =>
                    setBranchForm({
                      ...branchForm,
                      name: e.target.value,
                    })
                  }
                  placeholder="如：experiment-ending"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  描述
                </label>
                <Textarea
                  value={branchForm.description}
                  onChange={(e) =>
                    setBranchForm({
                      ...branchForm,
                      description: e.target.value,
                    })
                  }
                  rows={2}
                  placeholder="分支目的..."
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  基于快照（可选）
                </label>
                <Select
                  value={branchForm.basedOnSnapshotId}
                  onValueChange={(v) =>
                    setBranchForm({
                      ...branchForm,
                      basedOnSnapshotId: v,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="当前状态" />
                  </SelectTrigger>
                  <SelectContent>
                    {snapshots.map((snap) => (
                      <SelectItem key={snap.id} value={snap.id}>
                        {snap.label ||
                          `快照 ${new Date(snap.createdAt).toLocaleDateString("zh-CN")}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowCreateBranch(false)}
              >
                取消
              </Button>
              <Button
                onClick={createBranch}
                disabled={!branchForm.name.trim()}
                className="bg-teal-600 hover:bg-teal-700"
              >
                创建
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
