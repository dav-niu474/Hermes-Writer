"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import {
  AGENT_DEFINITIONS,
  CHAPTER_STATUS_MAP,
  type AgentType,
} from "@/lib/types";
import { AVAILABLE_MODELS } from "@/lib/ai";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Plus, Trash2, Bot, Send, Loader2, Sparkles, BookOpen, Save, Wand2,
  ArrowLeft, Download, FileText, FileDown, Globe, Users, History,
  BarChart3, ChevronDown, ChevronLeft, CheckCircle2, XCircle, Clock,
  GitBranch, GitCommit, GitCompare, FileCode, Shield,
  FileEdit, Layers, Copy, RotateCcw, Eye, Archive, Play,
  Check, AlertTriangle, ChevronRight, GitPullRequest,
  Tag, Milestone, Bookmark,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Types for version management
interface NovelSpec {
  id: string; novelId: string; category: string; title: string;
  content: string; version: number; status: string; createdAt: string; updatedAt: string;
}

interface ChangeProposal {
  id: string; novelId: string; title: string; description: string;
  scope: string; impact: string; tasks: string; status: string;
  completedAt: string | null; archivedAt: string | null; createdAt: string; updatedAt: string;
}

interface ChapterSnapshot {
  id: string; novelId: string; chapterId: string | null; chapterNumber: number;
  snapshotType: string; label: string; chapterContent: string;
  specSnapshot: string; metadata: string; createdAt: string;
}

interface Branch {
  id: string; novelId: string; name: string; description: string;
  parentBranchId: string | null; basedOnSnapshotId: string | null;
  status: string; createdAt: string; updatedAt: string;
}

const SPEC_CATEGORIES = [
  { value: "outline", label: "大纲", icon: FileEdit, color: "text-amber-500" },
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

### 第一幕：开端 (第1-X章)
#### Requirement: 故事起点
- **SHALL** 主角在初始环境中登场
- **WHEN** 故事开始
- **THEN** 读者了解主角的基本处境

### 第二幕：发展 (第X-Y章)

### 第三幕：高潮与结局 (第Y-Z章)

## 伏笔计划
| 伏笔 | 埋设章节 | 回收章节 | 状态 |
|------|----------|----------|------|
|      |          |          |      |`,
  characters: `# 角色设定

## 角色档案

### Requirement: 基础信息
- **SHALL** 角色具有完整的身份设定
- **WHEN** 角色出现在故事中
- **THEN** 以下信息已确定

| 属性 | 设定 |
|------|------|
| 姓名 | |
| 年龄 | |
| 身份 | |
| 外貌 | |

### Requirement: 性格特征
- **SHALL** 角色行为符合其性格设定
- **WHEN** 角色面临选择时
- **THEN** 决策反映其核心性格特质

### Requirement: 角色弧线
- **SHALL** 角色在故事中有明确的成长/变化
- **WHEN** 故事推进到关键节点
- **THEN** 角色展现出与初始状态不同的特质`,
  worldbuilding: `# 世界观设定

## 世界基础
### Requirement: 世界规则
- **SHALL** 世界具有内在一致的规则体系
- **WHEN** 故事涉及世界运行机制
- **THEN** 规则符合已建立的世界观

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
### Requirement: 叙事一致性
- **SHALL** 所有章节遵循统一的叙事视角
- **MUST** 时间线保持线性一致
- **MAY** 在必要时使用倒叙/插叙

## 写作规范
### Requirement: 用词风格
- **SHALL** 避免使用以下词汇：
  - 突然
  - 不由得
  - 竟然

### Requirement: 章节结构
- **SHALL** 每章结尾留有悬念
- **MUST** 章节字数在 2000-4000 字之间`,
  style: `# 风格指南

## 语言风格
### Requirement: 叙事风格
- **SHALL** 采用第三人称全知视角
- **WHEN** 描写场景时
- **THEN** 使用五感描写（视觉、听觉、触觉、嗅觉、味觉）

## 对话风格
### Requirement: 角色语言
- **SHALL** 每个角色的对话风格独特
- **WHEN** 角色开口说话
- **THEN** 用词和语气反映其性格和教育背景

## 节奏控制
| 段落类型 | 节奏 | 字数占比 |
|----------|------|----------|
| 动作戏 | 快 | 30% |
| 情感戏 | 慢 | 25% |
| 描写 | 中 | 25% |
| 对话 | 中 | 20% |`,
};

const PROPOSAL_STATUS_MAP: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft: { label: "草稿", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300", icon: <FileEdit className="size-3" /> },
  validated: { label: "已验证", color: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300", icon: <Shield className="size-3" /> },
  in_progress: { label: "进行中", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300", icon: <Play className="size-3" /> },
  completed: { label: "已完成", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", icon: <CheckCircle2 className="size-3" /> },
  archived: { label: "已归档", color: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400", icon: <Archive className="size-3" /> },
};

export function VersionPanel() {
  const { selectedNovelId, currentNovel } = useAppStore();
  const [activeTab, setActiveTab] = useState("specs");

  // Specs state
  const [specs, setSpecs] = useState<NovelSpec[]>([]);
  const [selectedSpec, setSelectedSpec] = useState<NovelSpec | null>(null);
  const [specFilter, setSpecFilter] = useState<string>("all");
  const [showCreateSpec, setShowCreateSpec] = useState(false);
  const [specForm, setSpecForm] = useState({ category: "outline", title: "", content: "" });
  const [editingSpecContent, setEditingSpecContent] = useState("");
  const [specSaving, setSpecSaving] = useState(false);

  // Proposals state
  const [proposals, setProposals] = useState<ChangeProposal[]>([]);
  const [selectedProposal, setSelectedProposal] = useState<ChangeProposal | null>(null);
  const [showCreateProposal, setShowCreateProposal] = useState(false);
  const [proposalForm, setProposalForm] = useState({ title: "", description: "", scope: "", impact: "", tasks: "" });

  // Snapshots state
  const [snapshots, setSnapshots] = useState<ChapterSnapshot[]>([]);
  const [showCreateSnapshot, setShowCreateSnapshot] = useState(false);
  const [snapshotForm, setSnapshotForm] = useState({ label: "", chapterId: "", snapshotType: "manual" });
  const [chaptersForSnapshot, setChaptersForSnapshot] = useState<any[]>([]);

  // Branches state
  const [branches, setBranches] = useState<Branch[]>([]);
  const [showCreateBranch, setShowCreateBranch] = useState(false);
  const [branchForm, setBranchForm] = useState({ name: "", description: "", basedOnSnapshotId: "" });

  const loadSpecs = useCallback(async () => {
    if (!selectedNovelId) return;
    try {
      const res = await fetch(`/api/specs?novelId=${selectedNovelId}`);
      if (res.ok) setSpecs(await res.json());
    } catch (e) { console.error(e); }
  }, [selectedNovelId]);

  const loadProposals = useCallback(async () => {
    if (!selectedNovelId) return;
    try {
      const res = await fetch(`/api/proposals?novelId=${selectedNovelId}`);
      if (res.ok) setProposals(await res.json());
    } catch (e) { console.error(e); }
  }, [selectedNovelId]);

  const loadSnapshots = useCallback(async () => {
    if (!selectedNovelId) return;
    try {
      const res = await fetch(`/api/snapshots?novelId=${selectedNovelId}`);
      if (res.ok) setSnapshots(await res.json());
    } catch (e) { console.error(e); }
  }, [selectedNovelId]);

  const loadBranches = useCallback(async () => {
    if (!selectedNovelId) return;
    try {
      const res = await fetch(`/api/branches?novelId=${selectedNovelId}`);
      if (res.ok) setBranches(await res.json());
    } catch (e) { console.error(e); }
  }, [selectedNovelId]);

  const loadChapters = useCallback(async () => {
    if (!selectedNovelId) return;
    try {
      const res = await fetch(`/api/novels/${selectedNovelId}/chapters`);
      if (res.ok) setChaptersForSnapshot(await res.json());
    } catch (e) { console.error(e); }
  }, [selectedNovelId]);

  useEffect(() => {
    loadSpecs(); loadProposals(); loadSnapshots(); loadBranches(); loadChapters();
  }, [loadSpecs, loadProposals, loadSnapshots, loadBranches, loadChapters]);

  // Spec CRUD
  async function createSpec() {
    if (!selectedNovelId || !specForm.title.trim()) return;
    try {
      const content = specForm.content || SPEC_TEMPLATES[specForm.category] || "";
      const res = await fetch("/api/specs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...specForm, content, novelId: selectedNovelId }),
      });
      if (res.ok) {
        const spec = await res.json();
        setShowCreateSpec(false);
        setSpecForm({ category: "outline", title: "", content: "" });
        setSelectedSpec(spec);
        setEditingSpecContent(spec.content);
        loadSpecs();
      }
    } catch (e) { console.error(e); }
  }

  async function saveSpecContent() {
    if (!selectedSpec) return;
    setSpecSaving(true);
    try {
      await fetch(`/api/specs/${selectedSpec.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editingSpecContent }),
      });
      loadSpecs();
      setSelectedSpec({ ...selectedSpec, content: editingSpecContent, version: selectedSpec.version + 1 });
    } catch (e) { console.error(e); }
    finally { setSpecSaving(false); }
  }

  async function deleteSpec(id: string) {
    if (!confirm("确认删除此规格文档？")) return;
    try {
      await fetch(`/api/specs/${id}`, { method: "DELETE" });
      if (selectedSpec?.id === id) { setSelectedSpec(null); setEditingSpecContent(""); }
      loadSpecs();
    } catch (e) { console.error(e); }
  }

  // Proposal CRUD
  async function createProposal() {
    if (!selectedNovelId || !proposalForm.title.trim()) return;
    try {
      const res = await fetch("/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...proposalForm, novelId: selectedNovelId }),
      });
      if (res.ok) {
        setShowCreateProposal(false);
        setProposalForm({ title: "", description: "", scope: "", impact: "", tasks: "" });
        loadProposals();
      }
    } catch (e) { console.error(e); }
  }

  async function updateProposalStatus(id: string, status: string) {
    try {
      await fetch(`/api/proposals/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      loadProposals();
      if (selectedProposal?.id === id) setSelectedProposal({ ...selectedProposal, status });
    } catch (e) { console.error(e); }
  }

  async function deleteProposal(id: string) {
    if (!confirm("确认删除此变更提案？")) return;
    try {
      await fetch(`/api/proposals/${id}`, { method: "DELETE" });
      if (selectedProposal?.id === id) setSelectedProposal(null);
      loadProposals();
    } catch (e) { console.error(e); }
  }

  // Snapshot CRUD
  async function createSnapshot() {
    if (!selectedNovelId) return;
    try {
      let chapterContent = "";
      if (snapshotForm.chapterId) {
        const res = await fetch(`/api/chapters/${snapshotForm.chapterId}`);
        if (res.ok) {
          const ch = await res.json();
          chapterContent = ch.content;
        }
      }
      const specSnapshot = JSON.stringify(specs.map(s => ({ id: s.id, title: s.title, category: s.category, version: s.version, content: s.content })));
      const res = await fetch("/api/snapshots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          novelId: selectedNovelId,
          label: snapshotForm.label || `快照 ${new Date().toLocaleString("zh-CN")}`,
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
    } catch (e) { console.error(e); }
  }

  async function deleteSnapshot(id: string) {
    if (!confirm("确认删除此快照？")) return;
    try {
      await fetch(`/api/snapshots/${id}`, { method: "DELETE" });
      loadSnapshots();
    } catch (e) { console.error(e); }
  }

  async function restoreSnapshot(snap: ChapterSnapshot) {
    if (!confirm(`确认恢复到快照「${snap.label}」？这将覆盖当前章节内容。`)) return;
    try {
      if (snap.chapterContent && snap.chapterId) {
        await fetch(`/api/chapters/${snap.chapterId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: snap.chapterContent }),
        });
      }
    } catch (e) { console.error(e); }
  }

  // Branch CRUD
  async function createBranch() {
    if (!selectedNovelId || !branchForm.name.trim()) return;
    try {
      const res = await fetch("/api/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...branchForm, novelId: selectedNovelId }),
      });
      if (res.ok) {
        setShowCreateBranch(false);
        setBranchForm({ name: "", description: "", basedOnSnapshotId: "" });
        loadBranches();
      }
    } catch (e) { console.error(e); }
  }

  const filteredSpecs = specFilter === "all" ? specs : specs.filter(s => s.category === specFilter);

  return (
    <div className="flex flex-col h-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
        <div className="border-b px-3 flex-shrink-0">
          <TabsList className="h-9 w-full bg-transparent p-0 gap-0">
            <TabsTrigger value="specs" className="flex-1 gap-1.5 text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
              <FileCode className="size-3" />规格文档
            </TabsTrigger>
            <TabsTrigger value="proposals" className="flex-1 gap-1.5 text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
              <GitPullRequest className="size-3" />变更提案
              {proposals.filter(p => p.status === "in_progress").length > 0 && (
                <Badge variant="secondary" className="h-4 px-1 text-[9px] bg-amber-100 text-amber-700">
                  {proposals.filter(p => p.status === "in_progress").length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="snapshots" className="flex-1 gap-1.5 text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
              <GitCommit className="size-3" />版本快照
            </TabsTrigger>
            <TabsTrigger value="branches" className="flex-1 gap-1.5 text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
              <GitBranch className="size-3" />分支
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Specs Tab */}
        <TabsContent value="specs" className="flex-1 m-0 overflow-hidden">
          {selectedSpec ? (
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-2 px-3 py-2 border-b flex-shrink-0">
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => { setSelectedSpec(null); setEditingSpecContent(""); }}>
                  <ChevronLeft className="size-3 mr-0.5" />返回
                </Button>
                <span className="text-sm font-medium flex-1 truncate">{selectedSpec.title}</span>
                <Badge variant="outline" className="text-[9px]">v{selectedSpec.version}</Badge>
                <Badge variant="secondary" className="text-[9px]">
                  {SPEC_CATEGORIES.find(c => c.value === selectedSpec.category)?.label}
                </Badge>
              </div>
              <div className="flex-1 overflow-hidden">
                <Textarea
                  value={editingSpecContent}
                  onChange={(e) => setEditingSpecContent(e.target.value)}
                  className="h-full w-full resize-none border-none shadow-none bg-transparent text-xs font-mono leading-relaxed focus-visible:ring-0 p-4"
                  placeholder="编辑规格文档内容..."
                />
              </div>
              <div className="flex items-center justify-between px-3 py-2 border-t flex-shrink-0">
                <span className="text-[10px] text-muted-foreground">
                  支持 OpenSpec 格式: SHALL/MUST/MAY + WHEN/THEN
                </span>
                <Button size="sm" className="h-6 text-xs" onClick={saveSpecContent} disabled={specSaving}>
                  <Save className="size-3 mr-1" />{specSaving ? "保存中..." : "保存并升级版本"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-2 px-3 py-2 border-b flex-shrink-0 overflow-x-auto">
                <button className={cn("px-2 py-1 rounded text-[10px] font-medium whitespace-nowrap", specFilter === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")} onClick={() => setSpecFilter("all")}>全部</button>
                {SPEC_CATEGORIES.map(cat => (
                  <button key={cat.value} className={cn("px-2 py-1 rounded text-[10px] font-medium whitespace-nowrap flex items-center gap-1", specFilter === cat.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")} onClick={() => setSpecFilter(cat.value)}>
                    <cat.icon className={cn("size-2.5", specFilter === cat.value ? "text-primary-foreground" : cat.color)} />
                    {cat.label}
                  </button>
                ))}
                <div className="flex-1" />
                <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1" onClick={() => setShowCreateSpec(true)}>
                  <Plus className="size-3" />新建规格
                </Button>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                  {filteredSpecs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-xs">
                      <FileCode className="size-6 mx-auto mb-2" />
                      <p>暂无规格文档</p>
                      <p className="text-[10px] mt-1">基于 OpenSpec 方法论创建小说规格</p>
                    </div>
                  ) : (
                    filteredSpecs.map(spec => {
                      const cat = SPEC_CATEGORIES.find(c => c.value === spec.category);
                      return (
                        <div key={spec.id} className="group flex items-center gap-2 rounded-md px-2 py-2 hover:bg-muted cursor-pointer transition-colors" onClick={() => { setSelectedSpec(spec); setEditingSpecContent(spec.content); }}>
                          <div className={cn("size-5 rounded flex items-center justify-center flex-shrink-0", spec.status === "archived" ? "bg-gray-100 dark:bg-gray-800" : "bg-primary/10")}>
                            {cat && <cat.icon className={cn("size-3", spec.status === "archived" ? "text-muted-foreground" : cat.color)} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{spec.title}</p>
                            <p className="text-[9px] text-muted-foreground truncate">{cat?.label} · v{spec.version}</p>
                          </div>
                          {spec.status === "active" && <Badge variant="outline" className="text-[9px] text-emerald-600 h-4 px-1">活跃</Badge>}
                          <Button variant="ghost" size="icon" className="size-5 opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); deleteSpec(spec.id); }}>
                            <Trash2 className="size-2.5" />
                          </Button>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </div>
          )}
        </TabsContent>

        {/* Proposals Tab */}
        <TabsContent value="proposals" className="flex-1 m-0 overflow-hidden">
          {selectedProposal ? (
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-2 px-3 py-2 border-b flex-shrink-0">
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setSelectedProposal(null)}>
                  <ChevronLeft className="size-3 mr-0.5" />返回
                </Button>
                <span className="text-sm font-medium flex-1 truncate">{selectedProposal.title}</span>
                <Badge className={cn("text-[9px]", PROPOSAL_STATUS_MAP[selectedProposal.status]?.color)}>
                  {React.createElement(() => PROPOSAL_STATUS_MAP[selectedProposal.status]?.icon as any)}
                  {PROPOSAL_STATUS_MAP[selectedProposal.status]?.label}
                </Badge>
              </div>
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {selectedProposal.description && (
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground mb-1">动机 (Why)</h4>
                      <p className="text-xs whitespace-pre-wrap">{selectedProposal.description}</p>
                    </div>
                  )}
                  {selectedProposal.scope && (
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground mb-1">范围 (What)</h4>
                      <p className="text-xs whitespace-pre-wrap">{selectedProposal.scope}</p>
                    </div>
                  )}
                  {selectedProposal.impact && (
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground mb-1">影响 (Impact)</h4>
                      <p className="text-xs whitespace-pre-wrap">{selectedProposal.impact}</p>
                    </div>
                  )}
                  {selectedProposal.tasks && (
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground mb-1">任务清单</h4>
                      <div className="text-xs whitespace-pre-wrap bg-muted/50 rounded p-2 font-mono">{selectedProposal.tasks}</div>
                    </div>
                  )}
                </div>
              </ScrollArea>
              <div className="flex items-center gap-2 px-3 py-2 border-t flex-shrink-0">
                {selectedProposal.status === "draft" && (
                  <Button size="sm" className="h-6 text-xs" onClick={() => updateProposalStatus(selectedProposal.id, "validated")}>
                    <Shield className="size-3 mr-1" />验证
                  </Button>
                )}
                {selectedProposal.status === "validated" && (
                  <Button size="sm" className="h-6 text-xs" onClick={() => updateProposalStatus(selectedProposal.id, "in_progress")}>
                    <Play className="size-3 mr-1" />开始执行
                  </Button>
                )}
                {selectedProposal.status === "in_progress" && (
                  <Button size="sm" className="h-6 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={() => updateProposalStatus(selectedProposal.id, "completed")}>
                    <Check className="size-3 mr-1" />标记完成
                  </Button>
                )}
                {(selectedProposal.status === "completed") && (
                  <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => updateProposalStatus(selectedProposal.id, "archived")}>
                    <Archive className="size-3 mr-1" />归档
                  </Button>
                )}
                <div className="flex-1" />
                <Button size="sm" variant="ghost" className="h-6 text-xs text-destructive" onClick={() => deleteProposal(selectedProposal.id)}>
                  <Trash2 className="size-3 mr-1" />删除
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between px-3 py-2 border-b flex-shrink-0">
                <span className="text-xs text-muted-foreground">{proposals.length} 个提案</span>
                <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1" onClick={() => setShowCreateProposal(true)}>
                  <Plus className="size-3" />新建提案
                </Button>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                  {proposals.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-xs">
                      <GitPullRequest className="size-6 mx-auto mb-2" />
                      <p>暂无变更提案</p>
                      <p className="text-[10px] mt-1">使用提案管理故事变更</p>
                    </div>
                  ) : (
                    proposals.map(p => (
                      <div key={p.id} className="group flex items-center gap-2 rounded-md px-2 py-2 hover:bg-muted cursor-pointer transition-colors" onClick={() => setSelectedProposal(p)}>
                        <div className={cn("size-5 rounded flex items-center justify-center flex-shrink-0 text-white", p.status === "in_progress" ? "bg-amber-500" : p.status === "completed" ? "bg-emerald-500" : p.status === "archived" ? "bg-gray-400" : "bg-sky-500")}>
                          {(PROPOSAL_STATUS_MAP[p.status]?.icon)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{p.title}</p>
                          <p className="text-[9px] text-muted-foreground">{new Date(p.createdAt).toLocaleDateString("zh-CN")} · {PROPOSAL_STATUS_MAP[p.status]?.label}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          )}
        </TabsContent>

        {/* Snapshots Tab */}
        <TabsContent value="snapshots" className="flex-1 m-0 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b flex-shrink-0">
            <span className="text-xs text-muted-foreground">{snapshots.length} 个快照</span>
            <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1" onClick={() => setShowCreateSnapshot(true)}>
              <Plus className="size-3" />创建快照
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {snapshots.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-xs">
                  <GitCommit className="size-6 mx-auto mb-2" />
                  <p>暂无版本快照</p>
                  <p className="text-[10px] mt-1">快照保存当前内容状态，支持回滚</p>
                </div>
              ) : (
                snapshots.map(snap => (
                  <div key={snap.id} className="group rounded-md px-2 py-2 hover:bg-muted transition-colors">
                    <div className="flex items-center gap-2">
                      <div className={cn("size-5 rounded flex items-center justify-center flex-shrink-0", snap.snapshotType === "manual" ? "bg-amber-100 dark:bg-amber-900/30" : "bg-sky-100 dark:bg-sky-900/30")}>
                        {snap.snapshotType === "manual" ? <Bookmark className="size-3 text-amber-600" /> : <Clock className="size-3 text-sky-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{snap.label || `快照 #${snap.chapterNumber}`}</p>
                        <p className="text-[9px] text-muted-foreground">
                          {new Date(snap.createdAt).toLocaleString("zh-CN")} · {snap.snapshotType === "manual" ? "手动" : "自动"} · {snap.chapterContent.length} 字
                        </p>
                      </div>
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100">
                        {snap.chapterContent && (
                          <TooltipProvider><Tooltip><TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-5" onClick={() => restoreSnapshot(snap)}>
                              <RotateCcw className="size-2.5" />
                            </Button>
                          </TooltipTrigger><TooltipContent>恢复此快照</TooltipContent></Tooltip></TooltipProvider>
                        )}
                        <Button variant="ghost" size="icon" className="size-5" onClick={() => deleteSnapshot(snap.id)}>
                          <Trash2 className="size-2.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Branches Tab */}
        <TabsContent value="branches" className="flex-1 m-0 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b flex-shrink-0">
            <span className="text-xs text-muted-foreground">{branches.length} 个分支</span>
            <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1" onClick={() => setShowCreateBranch(true)}>
              <Plus className="size-3" />新建分支
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {branches.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-xs">
                  <GitBranch className="size-6 mx-auto mb-2" />
                  <p>暂无分支</p>
                </div>
              ) : (
                branches.map(b => (
                  <div key={b.id} className="group flex items-center gap-2 rounded-md px-2 py-2 hover:bg-muted transition-colors">
                    <div className={cn("size-5 rounded flex items-center justify-center flex-shrink-0", b.name === "main" ? "bg-primary/10" : b.status === "active" ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-gray-100 dark:bg-gray-800")}>
                      <GitBranch className={cn("size-3", b.name === "main" ? "text-primary" : b.status === "active" ? "text-emerald-600" : "text-muted-foreground")} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-medium">{b.name}</p>
                        {b.name === "main" && <Badge variant="secondary" className="text-[8px] h-3 px-1">默认</Badge>}
                        {b.status !== "active" && <Badge variant="outline" className="text-[8px] h-3 px-1">{b.status === "merged" ? "已合并" : "已废弃"}</Badge>}
                      </div>
                      {b.description && <p className="text-[9px] text-muted-foreground truncate">{b.description}</p>}
                      <p className="text-[8px] text-muted-foreground">{new Date(b.createdAt).toLocaleDateString("zh-CN")}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Create Spec Dialog */}
      <Dialog open={showCreateSpec} onOpenChange={setShowCreateSpec}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>新建规格文档</DialogTitle><DialogDescription>基于 OpenSpec 方法论创建小说规格</DialogDescription></DialogHeader>
          <div className="grid gap-3 py-3">
            <div><label className="text-xs text-muted-foreground mb-1 block">分类 *</label>
              <Select value={specForm.category} onValueChange={(v) => { setSpecForm({ ...specForm, category: v, content: SPEC_TEMPLATES[v] || "" }); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SPEC_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><label className="text-xs text-muted-foreground mb-1 block">标题 *</label><Input value={specForm.title} onChange={(e) => setSpecForm({ ...specForm, title: e.target.value })} placeholder="如：主角角色设定" /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">内容（支持 OpenSpec 格式，可选模板）</label><Textarea value={specForm.content} onChange={(e) => setSpecForm({ ...specForm, content: e.target.value })} rows={6} className="font-mono text-xs" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowCreateSpec(false)}>取消</Button><Button onClick={createSpec} disabled={!specForm.title.trim()}>创建</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Proposal Dialog */}
      <Dialog open={showCreateProposal} onOpenChange={setShowCreateProposal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>新建变更提案</DialogTitle><DialogDescription>SDD 变更提案：描述 Why/What/Impact</DialogDescription></DialogHeader>
          <div className="grid gap-3 py-3">
            <div><label className="text-xs text-muted-foreground mb-1 block">标题 *</label><Input value={proposalForm.title} onChange={(e) => setProposalForm({ ...proposalForm, title: e.target.value })} placeholder="如：add-chapter-11-20" /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">动机 (Why)</label><Textarea value={proposalForm.description} onChange={(e) => setProposalForm({ ...proposalForm, description: e.target.value })} rows={2} placeholder="为什么要做这个变更..." /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">范围 (What)</label><Textarea value={proposalForm.scope} onChange={(e) => setProposalForm({ ...proposalForm, scope: e.target.value })} rows={2} placeholder="具体变更内容..." /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">影响 (Impact)</label><Textarea value={proposalForm.impact} onChange={(e) => setProposalForm({ ...proposalForm, impact: e.target.value })} rows={2} placeholder="影响的规格、章节..." /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowCreateProposal(false)}>取消</Button><Button onClick={createProposal} disabled={!proposalForm.title.trim()}>创建</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Snapshot Dialog */}
      <Dialog open={showCreateSnapshot} onOpenChange={setShowCreateSnapshot}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>创建版本快照</DialogTitle><DialogDescription>保存当前内容状态，支持后续回滚</DialogDescription></DialogHeader>
          <div className="grid gap-3 py-3">
            <div><label className="text-xs text-muted-foreground mb-1 block">快照标签 *</label><Input value={snapshotForm.label} onChange={(e) => setSnapshotForm({ ...snapshotForm, label: e.target.value })} placeholder="如：v1.0-beta" /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">关联章节（可选）</label>
              <Select value={snapshotForm.chapterId} onValueChange={(v) => setSnapshotForm({ ...snapshotForm, chapterId: v })}>
                <SelectTrigger><SelectValue placeholder="全部章节" /></SelectTrigger>
                <SelectContent><SelectItem value="all">全部章节</SelectItem>{chaptersForSnapshot.map(ch => <SelectItem key={ch.id} value={ch.id}>第{ch.chapterNumber}章: {ch.title}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowCreateSnapshot(false)}>取消</Button><Button onClick={createSnapshot} disabled={!snapshotForm.label.trim()}>创建快照</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Branch Dialog */}
      <Dialog open={showCreateBranch} onOpenChange={setShowCreateBranch}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>创建分支</DialogTitle><DialogDescription>从当前状态创建替代时间线</DialogDescription></DialogHeader>
          <div className="grid gap-3 py-3">
            <div><label className="text-xs text-muted-foreground mb-1 block">分支名称 *</label><Input value={branchForm.name} onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })} placeholder="如：experiment-ending" /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">描述</label><Textarea value={branchForm.description} onChange={(e) => setBranchForm({ ...branchForm, description: e.target.value })} rows={2} placeholder="分支目的..." /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowCreateBranch(false)}>取消</Button><Button onClick={createBranch} disabled={!branchForm.name.trim()}>创建</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
