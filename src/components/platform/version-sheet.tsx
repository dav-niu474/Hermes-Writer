"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Trash2,
  FileCode,
  GitBranch,
  GitCommit,
  GitPullRequest,
  Save,
  Clock,
  ChevronDown,
  Copy,
  Shield,
  Check,
  Archive,
  Bookmark,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────

interface VersionSheetProps {
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
  parentSpecId: string | null;
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

// ─── Constants ───────────────────────────────────────────

const SPEC_CATEGORIES = [
  { value: "outline", label: "大纲", color: "bg-slate-500" },
  { value: "characters", label: "角色", color: "bg-rose-500" },
  { value: "worldbuilding", label: "世界观", color: "bg-emerald-500" },
  { value: "rules", label: "规则", color: "bg-amber-500" },
  { value: "style", label: "风格", color: "bg-violet-500" },
] as const;

const PROPOSAL_STATUS_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  draft: { label: "草稿", className: "bg-zinc-100 text-zinc-700 border-zinc-200" },
  validated: {
    label: "已验证",
    className: "bg-sky-50 text-sky-700 border-sky-200",
  },
  in_progress: {
    label: "进行中",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  completed: {
    label: "已完成",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  archived: {
    label: "已归档",
    className: "bg-zinc-50 text-zinc-500 border-zinc-200",
  },
};

const BRANCH_STATUS_CONFIG: Record<
  string,
  { label: string; dotColor: string }
> = {
  active: { label: "活跃", dotColor: "bg-emerald-500" },
  merged: { label: "已合并", dotColor: "bg-violet-500" },
  abandoned: { label: "已放弃", dotColor: "bg-zinc-400" },
};

const SNAPSHOT_TYPE_LABELS: Record<string, string> = {
  manual: "手动",
  auto_pre_write: "写作前自动",
  auto_post_write: "写作后自动",
};

// ─── Helpers ─────────────────────────────────────────────

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getCategoryConfig(category: string) {
  return (
    SPEC_CATEGORIES.find((c) => c.value === category) ?? {
      value: category,
      label: category,
      color: "bg-zinc-500",
    }
  );
}

// ─── Component ───────────────────────────────────────────

export function VersionSheet({ novelId }: VersionSheetProps) {
  const [activeTab, setActiveTab] = useState("specs");

  // ─── Specs state ───────────────────────────────────────
  const [specs, setSpecs] = useState<NovelSpec[]>([]);
  const [specFilter, setSpecFilter] = useState<string | null>(null);
  const [expandedSpecId, setExpandedSpecId] = useState<string | null>(null);
  const [specDialogOpen, setSpecDialogOpen] = useState(false);
  const [editingSpec, setEditingSpec] = useState<NovelSpec | null>(null);
  const [specForm, setSpecForm] = useState({
    category: "outline",
    title: "",
    content: "",
  });
  const [specLoading, setSpecLoading] = useState(false);
  const [specSaving, setSpecSaving] = useState(false);

  // ─── Proposals state ───────────────────────────────────
  const [proposals, setProposals] = useState<ChangeProposal[]>([]);
  const [expandedProposalId, setExpandedProposalId] = useState<string | null>(
    null
  );
  const [proposalDialogOpen, setProposalDialogOpen] = useState(false);
  const [proposalForm, setProposalForm] = useState({
    title: "",
    description: "",
    scope: "",
    impact: "",
    tasks: "",
  });
  const [proposalSaving, setProposalSaving] = useState(false);

  // ─── Snapshots state ───────────────────────────────────
  const [snapshots, setSnapshots] = useState<ChapterSnapshot[]>([]);
  const [expandedSnapshotId, setExpandedSnapshotId] = useState<string | null>(
    null
  );
  const [snapshotDialogOpen, setSnapshotDialogOpen] = useState(false);
  const [snapshotForm, setSnapshotForm] = useState({
    label: "",
    chapterId: "",
    snapshotType: "manual",
    chapterContent: "",
    specSnapshot: "",
  });
  const [snapshotSaving, setSnapshotSaving] = useState(false);

  // ─── Branches state ────────────────────────────────────
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchDialogOpen, setBranchDialogOpen] = useState(false);
  const [branchForm, setBranchForm] = useState({ name: "", description: "" });
  const [branchSaving, setBranchSaving] = useState(false);

  // ─── Data fetching ─────────────────────────────────────

  const fetchSpecs = useCallback(async () => {
    setSpecLoading(true);
    try {
      const params = new URLSearchParams({ novelId });
      if (specFilter) params.set("category", specFilter);
      const res = await fetch(`/api/specs?${params}`);
      if (res.ok) setSpecs(await res.json());
    } catch {
      /* silent */
    } finally {
      setSpecLoading(false);
    }
  }, [novelId, specFilter]);

  const fetchProposals = useCallback(async () => {
    try {
      const res = await fetch(`/api/proposals?novelId=${novelId}`);
      if (res.ok) setProposals(await res.json());
    } catch {
      /* silent */
    }
  }, [novelId]);

  const fetchSnapshots = useCallback(async () => {
    try {
      const res = await fetch(`/api/snapshots?novelId=${novelId}`);
      if (res.ok) setSnapshots(await res.json());
    } catch {
      /* silent */
    }
  }, [novelId]);

  const fetchBranches = useCallback(async () => {
    try {
      const res = await fetch(`/api/branches?novelId=${novelId}`);
      if (res.ok) setBranches(await res.json());
    } catch {
      /* silent */
    }
  }, [novelId]);

  useEffect(() => {
    fetchSpecs();
  }, [fetchSpecs]);

  useEffect(() => {
    if (activeTab === "proposals") fetchProposals();
    if (activeTab === "snapshots") fetchSnapshots();
    if (activeTab === "branches") fetchBranches();
  }, [activeTab, fetchProposals, fetchSnapshots, fetchBranches]);

  // ─── Spec handlers ─────────────────────────────────────

  const handleCreateSpec = async () => {
    if (!specForm.title.trim()) return;
    setSpecSaving(true);
    try {
      const res = await fetch("/api/specs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ novelId, ...specForm }),
      });
      if (res.ok) {
        setSpecDialogOpen(false);
        setSpecForm({ category: "outline", title: "", content: "" });
        fetchSpecs();
      }
    } catch {
      /* silent */
    } finally {
      setSpecSaving(false);
    }
  };

  const handleUpdateSpec = async (id: string, content: string) => {
    try {
      const res = await fetch(`/api/specs/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (res.ok) fetchSpecs();
    } catch {
      /* silent */
    }
  };

  const handleDeleteSpec = async (id: string) => {
    try {
      const res = await fetch(`/api/specs/${id}`, { method: "DELETE" });
      if (res.ok) fetchSpecs();
    } catch {
      /* silent */
    }
  };

  const openEditSpec = (spec: NovelSpec) => {
    setEditingSpec(spec);
    setSpecForm({
      category: spec.category,
      title: spec.title,
      content: spec.content,
    });
    setSpecDialogOpen(true);
  };

  const closeSpecDialog = () => {
    setSpecDialogOpen(false);
    setEditingSpec(null);
    setSpecForm({ category: "outline", title: "", content: "" });
  };

  // ─── Proposal handlers ─────────────────────────────────

  const handleCreateProposal = async () => {
    if (!proposalForm.title.trim()) return;
    setProposalSaving(true);
    try {
      const res = await fetch("/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ novelId, ...proposalForm }),
      });
      if (res.ok) {
        setProposalDialogOpen(false);
        setProposalForm({
          title: "",
          description: "",
          scope: "",
          impact: "",
          tasks: "",
        });
        fetchProposals();
      }
    } catch {
      /* silent */
    } finally {
      setProposalSaving(false);
    }
  };

  // ─── Snapshot handlers ─────────────────────────────────

  const handleCreateSnapshot = async () => {
    setSnapshotSaving(true);
    try {
      const res = await fetch("/api/snapshots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ novelId, ...snapshotForm }),
      });
      if (res.ok) {
        setSnapshotDialogOpen(false);
        setSnapshotForm({
          label: "",
          chapterId: "",
          snapshotType: "manual",
          chapterContent: "",
          specSnapshot: "",
        });
        fetchSnapshots();
      }
    } catch {
      /* silent */
    } finally {
      setSnapshotSaving(false);
    }
  };

  // ─── Branch handlers ───────────────────────────────────

  const handleCreateBranch = async () => {
    if (!branchForm.name.trim()) return;
    setBranchSaving(true);
    try {
      const res = await fetch("/api/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ novelId, ...branchForm }),
      });
      if (res.ok) {
        setBranchDialogOpen(false);
        setBranchForm({ name: "", description: "" });
        fetchBranches();
      }
    } catch {
      /* silent */
    } finally {
      setBranchSaving(false);
    }
  };

  // ─── Inline spec editing state ─────────────────────────
  const [inlineContent, setInlineContent] = useState("");

  const startInlineEdit = (spec: NovelSpec) => {
    setInlineContent(spec.content);
    setExpandedSpecId(spec.id + "__editing");
  };

  const saveInlineEdit = (spec: NovelSpec) => {
    handleUpdateSpec(spec.id, inlineContent);
    setExpandedSpecId(spec.id);
  };

  const cancelInlineEdit = (spec: NovelSpec) => {
    setExpandedSpecId(spec.id);
  };

  // ─── Render ────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex flex-col h-full"
      >
        <div className="px-4 pt-4 pb-2">
          <TabsList className="w-full">
            <TabsTrigger value="specs" className="flex-1 text-xs">
              <FileCode className="size-3.5" />
              规格文档
            </TabsTrigger>
            <TabsTrigger value="proposals" className="flex-1 text-xs">
              <GitPullRequest className="size-3.5" />
              变更提案
            </TabsTrigger>
            <TabsTrigger value="snapshots" className="flex-1 text-xs">
              <GitCommit className="size-3.5" />
              版本快照
            </TabsTrigger>
            <TabsTrigger value="branches" className="flex-1 text-xs">
              <GitBranch className="size-3.5" />
              分支
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ─── Specs Tab ───────────────────────────────── */}
        <TabsContent value="specs" className="flex-1 mt-0 px-4 pb-4">
          <div className="flex flex-col gap-3 h-full">
            {/* Category filter pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <Button
                variant={specFilter === null ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs px-2.5"
                onClick={() => setSpecFilter(null)}
              >
                全部
              </Button>
              {SPEC_CATEGORIES.map((cat) => (
                <Button
                  key={cat.value}
                  variant={specFilter === cat.value ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs px-2.5"
                  onClick={() => setSpecFilter(cat.value)}
                >
                  <span
                    className={cn(
                      "inline-block size-2 rounded-full mr-1.5",
                      cat.color
                    )}
                  />
                  {cat.label}
                </Button>
              ))}
              <Button
                size="sm"
                className="h-7 text-xs ml-auto"
                onClick={() => {
                  setEditingSpec(null);
                  setSpecForm({ category: "outline", title: "", content: "" });
                  setSpecDialogOpen(true);
                }}
              >
                <Plus className="size-3.5 mr-1" />
                新建
              </Button>
            </div>

            {/* Spec list */}
            <ScrollArea className="flex-1">
              {specLoading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                  加载中...
                </div>
              ) : specs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
                  <FileCode className="size-8 opacity-40" />
                  <p className="text-xs">暂无规格文档</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2 pr-3">
                  {specs.map((spec) => {
                    const catCfg = getCategoryConfig(spec.category);
                    const isExpanded = expandedSpecId === spec.id;
                    const isEditing = expandedSpecId === spec.id + "__editing";

                    return (
                      <div
                        key={spec.id}
                        className="rounded-lg border bg-card text-card-foreground"
                      >
                        <button
                          className="flex items-center gap-2 w-full p-3 text-left hover:bg-accent/50 transition-colors rounded-lg"
                          onClick={() =>
                            setExpandedSpecId(isExpanded ? null : spec.id)
                          }
                        >
                          <span
                            className={cn(
                              "size-2.5 rounded-full shrink-0",
                              catCfg.color
                            )}
                          />
                          <span className="flex-1 text-sm font-medium truncate">
                            {spec.title}
                          </span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            v{spec.version}
                          </Badge>
                          <ChevronDown
                            className={cn(
                              "size-4 text-muted-foreground transition-transform duration-200",
                              isExpanded && "rotate-180"
                            )}
                          />
                        </button>

                        {isExpanded && (
                          <div className="px-3 pb-3">
                            <Separator className="mb-3" />
                            <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                              {spec.content || "暂无内容"}
                            </p>
                            <div className="flex items-center gap-1.5 mt-3">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditSpec(spec);
                                }}
                              >
                                编辑
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startInlineEdit(spec);
                                }}
                              >
                                <Save className="size-3 mr-1" />
                                快速修改
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-destructive hover:text-destructive ml-auto"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteSpec(spec.id);
                                }}
                              >
                                <Trash2 className="size-3" />
                              </Button>
                            </div>
                          </div>
                        )}

                        {isEditing && (
                          <div className="px-3 pb-3">
                            <Separator className="mb-3" />
                            <Textarea
                              className="min-h-[100px] text-xs"
                              value={inlineContent}
                              onChange={(e) => setInlineContent(e.target.value)}
                              placeholder="编辑规格内容..."
                            />
                            <div className="flex items-center gap-1.5 mt-2">
                              <Button
                                size="sm"
                                className="h-7 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  saveInlineEdit(spec);
                                }}
                              >
                                <Check className="size-3 mr-1" />
                                保存
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  cancelInlineEdit(spec);
                                }}
                              >
                                取消
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        </TabsContent>

        {/* ─── Proposals Tab ────────────────────────────── */}
        <TabsContent value="proposals" className="flex-1 mt-0 px-4 pb-4">
          <div className="flex flex-col gap-3 h-full">
            <div className="flex items-center justify-end">
              <Button
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  setProposalForm({
                    title: "",
                    description: "",
                    scope: "",
                    impact: "",
                    tasks: "",
                  });
                  setProposalDialogOpen(true);
                }}
              >
                <Plus className="size-3.5 mr-1" />
                新建提案
              </Button>
            </div>

            <ScrollArea className="flex-1">
              {proposals.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
                  <GitPullRequest className="size-8 opacity-40" />
                  <p className="text-xs">暂无变更提案</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2 pr-3">
                  {proposals.map((p) => {
                    const statusCfg = PROPOSAL_STATUS_CONFIG[p.status] ?? {
                      label: p.status,
                      className: "",
                    };
                    const isExpanded = expandedProposalId === p.id;

                    return (
                      <div
                        key={p.id}
                        className="rounded-lg border bg-card text-card-foreground"
                      >
                        <button
                          className="flex items-center gap-2 w-full p-3 text-left hover:bg-accent/50 transition-colors rounded-lg"
                          onClick={() =>
                            setExpandedProposalId(isExpanded ? null : p.id)
                          }
                        >
                          <Shield className="size-4 text-muted-foreground shrink-0" />
                          <span className="flex-1 text-sm font-medium truncate">
                            {p.title}
                          </span>
                          <Badge
                            variant="outline"
                            className={cn("text-[10px] px-1.5 py-0", statusCfg.className)}
                          >
                            {statusCfg.label}
                          </Badge>
                          <ChevronDown
                            className={cn(
                              "size-4 text-muted-foreground transition-transform duration-200",
                              isExpanded && "rotate-180"
                            )}
                          />
                        </button>

                        {isExpanded && (
                          <div className="px-3 pb-3">
                            <Separator className="mb-3" />
                            <div className="space-y-2 text-xs">
                              {p.description && (
                                <div>
                                  <span className="text-muted-foreground font-medium">
                                    描述：
                                  </span>
                                  <p className="text-foreground mt-0.5 whitespace-pre-wrap">
                                    {p.description}
                                  </p>
                                </div>
                              )}
                              {p.scope && (
                                <div>
                                  <span className="text-muted-foreground font-medium">
                                    范围：
                                  </span>
                                  <p className="text-foreground mt-0.5">
                                    {p.scope}
                                  </p>
                                </div>
                              )}
                              {p.impact && (
                                <div>
                                  <span className="text-muted-foreground font-medium">
                                    影响：
                                  </span>
                                  <p className="text-foreground mt-0.5">
                                    {p.impact}
                                  </p>
                                </div>
                              )}
                              {p.tasks && (
                                <div>
                                  <span className="text-muted-foreground font-medium">
                                    任务：
                                  </span>
                                  <p className="text-foreground mt-0.5 whitespace-pre-wrap">
                                    {p.tasks}
                                  </p>
                                </div>
                              )}
                              <div className="flex items-center gap-3 pt-1 text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="size-3" />
                                  {formatDate(p.createdAt)}
                                </span>
                                {p._count && (
                                  <span className="flex items-center gap-1">
                                    <FileCode className="size-3" />
                                    {p._count.specDeltas} 项变更
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        </TabsContent>

        {/* ─── Snapshots Tab ────────────────────────────── */}
        <TabsContent value="snapshots" className="flex-1 mt-0 px-4 pb-4">
          <div className="flex flex-col gap-3 h-full">
            <div className="flex items-center justify-end">
              <Button
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  setSnapshotForm({
                    label: "",
                    chapterId: "",
                    snapshotType: "manual",
                    chapterContent: "",
                    specSnapshot: "",
                  });
                  setSnapshotDialogOpen(true);
                }}
              >
                <Plus className="size-3.5 mr-1" />
                创建快照
              </Button>
            </div>

            <ScrollArea className="flex-1">
              {snapshots.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
                  <GitCommit className="size-8 opacity-40" />
                  <p className="text-xs">暂无版本快照</p>
                </div>
              ) : (
                <div className="relative pl-6 pr-3">
                  {/* Timeline line */}
                  <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />

                  <div className="flex flex-col gap-1">
                    {snapshots.map((snap) => {
                      const isExpanded = expandedSnapshotId === snap.id;

                      return (
                        <div key={snap.id} className="relative">
                          {/* Timeline dot */}
                          <div
                            className={cn(
                              "absolute -left-6 top-3.5 size-[15px] rounded-full border-2 border-background z-10",
                              snap.snapshotType === "manual"
                                ? "bg-violet-500"
                                : snap.snapshotType === "auto_pre_write"
                                  ? "bg-sky-500"
                                  : "bg-emerald-500"
                            )}
                          />

                          <div className="rounded-lg border bg-card text-card-foreground">
                            <button
                              className="flex items-center gap-2 w-full p-3 text-left hover:bg-accent/50 transition-colors rounded-lg"
                              onClick={() =>
                                setExpandedSnapshotId(
                                  isExpanded ? null : snap.id
                                )
                              }
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium truncate">
                                    {snap.label || `快照 #${snap.chapterNumber}`}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] px-1.5 py-0 shrink-0"
                                  >
                                    {SNAPSHOT_TYPE_LABELS[snap.snapshotType] ??
                                      snap.snapshotType}
                                  </Badge>
                                </div>
                                <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                  <Clock className="size-3" />
                                  {formatDate(snap.createdAt)}
                                </span>
                              </div>
                              <ChevronDown
                                className={cn(
                                  "size-4 text-muted-foreground transition-transform duration-200 shrink-0",
                                  isExpanded && "rotate-180"
                                )}
                              />
                            </button>

                            {isExpanded && (
                              <div className="px-3 pb-3">
                                <Separator className="mb-3" />
                                <div className="space-y-2 text-xs">
                                  <div className="text-muted-foreground">
                                    章节号：{snap.chapterNumber || "无"}
                                  </div>
                                  {snap.chapterContent && (
                                    <div>
                                      <span className="text-muted-foreground font-medium">
                                        章节内容预览：
                                      </span>
                                      <p className="text-foreground mt-0.5 whitespace-pre-wrap max-h-32 overflow-y-auto">
                                        {snap.chapterContent.length > 500
                                          ? snap.chapterContent.slice(0, 500) +
                                            "..."
                                          : snap.chapterContent}
                                      </p>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-1.5 pt-1">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-7 text-xs"
                                      onClick={() => {
                                        navigator.clipboard.writeText(
                                          snap.chapterContent
                                        );
                                      }}
                                    >
                                      <Copy className="size-3 mr-1" />
                                      复制内容
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </ScrollArea>
          </div>
        </TabsContent>

        {/* ─── Branches Tab ─────────────────────────────── */}
        <TabsContent value="branches" className="flex-1 mt-0 px-4 pb-4">
          <div className="flex flex-col gap-3 h-full">
            <div className="flex items-center justify-end">
              <Button
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  setBranchForm({ name: "", description: "" });
                  setBranchDialogOpen(true);
                }}
              >
                <Plus className="size-3.5 mr-1" />
                创建分支
              </Button>
            </div>

            <ScrollArea className="flex-1">
              {branches.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
                  <GitBranch className="size-8 opacity-40" />
                  <p className="text-xs">暂无分支</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2 pr-3">
                  {branches.map((branch) => {
                    const statusCfg =
                      BRANCH_STATUS_CONFIG[branch.status] ?? {
                        label: branch.status,
                        dotColor: "bg-zinc-400",
                      };

                    return (
                      <div
                        key={branch.id}
                        className="rounded-lg border bg-card text-card-foreground p-3"
                      >
                        <div className="flex items-center gap-2">
                          <GitBranch className="size-4 text-muted-foreground shrink-0" />
                          <span className="text-sm font-medium">
                            {branch.name}
                          </span>
                          <span className="flex items-center gap-1.5 ml-auto">
                            <span
                              className={cn(
                                "size-2 rounded-full",
                                statusCfg.dotColor
                              )}
                            />
                            <span className="text-[11px] text-muted-foreground">
                              {statusCfg.label}
                            </span>
                          </span>
                        </div>
                        {branch.description && (
                          <p className="text-xs text-muted-foreground mt-1.5 ml-6">
                            {branch.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2 ml-6 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="size-3" />
                            {formatDate(branch.createdAt)}
                          </span>
                          {branch.parentBranchId && (
                            <span className="flex items-center gap-1">
                              <Bookmark className="size-3" />
                              基于 {branch.parentBranchId.slice(0, 8)}...
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        </TabsContent>
      </Tabs>

      {/* ─── Create / Edit Spec Dialog ─────────────────── */}
      <Dialog open={specDialogOpen} onOpenChange={setSpecDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingSpec ? "编辑规格" : "新建规格"}
            </DialogTitle>
            <DialogDescription>
              {editingSpec
                ? "修改规格文档的内容和分类。"
                : "为小说创建一个新的规格文档。"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                分类
              </label>
              <Select
                value={specForm.category}
                onValueChange={(v) =>
                  setSpecForm((f) => ({ ...f, category: v }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SPEC_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                标题
              </label>
              <Input
                value={specForm.title}
                onChange={(e) =>
                  setSpecForm((f) => ({ ...f, title: e.target.value }))
                }
                placeholder="输入规格标题..."
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                内容
              </label>
              <Textarea
                className="min-h-[120px]"
                value={specForm.content}
                onChange={(e) =>
                  setSpecForm((f) => ({ ...f, content: e.target.value }))
                }
                placeholder="输入规格内容..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeSpecDialog}>
              取消
            </Button>
            <Button
              onClick={
                editingSpec
                  ? () => {
                      handleUpdateSpec(editingSpec.id, specForm.content);
                      closeSpecDialog();
                    }
                  : handleCreateSpec
              }
              disabled={specSaving || !specForm.title.trim()}
            >
              {specSaving ? "保存中..." : editingSpec ? "更新" : "创建"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Create Proposal Dialog ────────────────────── */}
      <Dialog open={proposalDialogOpen} onOpenChange={setProposalDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>新建变更提案</DialogTitle>
            <DialogDescription>
              提出一个针对小说规格的变更提案。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                标题
              </label>
              <Input
                value={proposalForm.title}
                onChange={(e) =>
                  setProposalForm((f) => ({ ...f, title: e.target.value }))
                }
                placeholder="提案标题..."
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                描述
              </label>
              <Textarea
                className="min-h-[80px]"
                value={proposalForm.description}
                onChange={(e) =>
                  setProposalForm((f) => ({
                    ...f,
                    description: e.target.value,
                  }))
                }
                placeholder="描述变更内容..."
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                范围
              </label>
              <Input
                value={proposalForm.scope}
                onChange={(e) =>
                  setProposalForm((f) => ({ ...f, scope: e.target.value }))
                }
                placeholder="影响的范围..."
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                影响
              </label>
              <Input
                value={proposalForm.impact}
                onChange={(e) =>
                  setProposalForm((f) => ({ ...f, impact: e.target.value }))
                }
                placeholder="预期影响..."
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                任务
              </label>
              <Textarea
                className="min-h-[60px]"
                value={proposalForm.tasks}
                onChange={(e) =>
                  setProposalForm((f) => ({ ...f, tasks: e.target.value }))
                }
                placeholder="相关任务（每行一个）..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setProposalDialogOpen(false)}
            >
              取消
            </Button>
            <Button
              onClick={handleCreateProposal}
              disabled={proposalSaving || !proposalForm.title.trim()}
            >
              {proposalSaving ? "创建中..." : "创建"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Create Snapshot Dialog ────────────────────── */}
      <Dialog open={snapshotDialogOpen} onOpenChange={setSnapshotDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>创建版本快照</DialogTitle>
            <DialogDescription>
              保存当前小说内容的快照，便于后续回溯。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                标签
              </label>
              <Input
                value={snapshotForm.label}
                onChange={(e) =>
                  setSnapshotForm((f) => ({ ...f, label: e.target.value }))
                }
                placeholder="快照标签（可选）..."
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                快照类型
              </label>
              <Select
                value={snapshotForm.snapshotType}
                onValueChange={(v) =>
                  setSnapshotForm((f) => ({ ...f, snapshotType: v }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">手动</SelectItem>
                  <SelectItem value="auto_pre_write">写作前自动</SelectItem>
                  <SelectItem value="auto_post_write">写作后自动</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSnapshotDialogOpen(false)}
            >
              取消
            </Button>
            <Button onClick={handleCreateSnapshot} disabled={snapshotSaving}>
              {snapshotSaving ? "创建中..." : "创建"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Create Branch Dialog ──────────────────────── */}
      <Dialog open={branchDialogOpen} onOpenChange={setBranchDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>创建分支</DialogTitle>
            <DialogDescription>
              创建一个新的小说版本分支。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                分支名称
              </label>
              <Input
                value={branchForm.name}
                onChange={(e) =>
                  setBranchForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="分支名称..."
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                描述
              </label>
              <Textarea
                className="min-h-[60px]"
                value={branchForm.description}
                onChange={(e) =>
                  setBranchForm((f) => ({
                    ...f,
                    description: e.target.value,
                  }))
                }
                placeholder="分支描述（可选）..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBranchDialogOpen(false)}
            >
              取消
            </Button>
            <Button
              onClick={handleCreateBranch}
              disabled={branchSaving || !branchForm.name.trim()}
            >
              {branchSaving ? "创建中..." : "创建"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
