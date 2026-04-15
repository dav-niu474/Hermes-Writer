"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, MapPin, Clock, Palette, Sparkles, Cpu, MoreHorizontal, ChevronDown, Globe, Loader2, Pencil, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────
interface WorldSetting {
  id: string;
  novelId: string;
  name: string;
  category: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

interface WorldSheetProps {
  novelId: string;
}

// ─── Category Config ─────────────────────────────────────────────
const CATEGORIES = [
  { key: "geography", label: "地理", icon: MapPin, color: "emerald" } as const,
  { key: "history", label: "历史", icon: Clock, color: "amber" } as const,
  { key: "culture", label: "文化", icon: Palette, color: "rose" } as const,
  { key: "magic", label: "魔法/力量体系", icon: Sparkles, color: "violet" } as const,
  { key: "technology", label: "科技", icon: Cpu, color: "sky" } as const,
  { key: "other", label: "其他", icon: MoreHorizontal, color: "gray" } as const,
] as const;

type CategoryKey = (typeof CATEGORIES)[number]["key"];

const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.key, c])) as Record<
  string,
  (typeof CATEGORIES)[number]
>;

// ─── Color helpers ───────────────────────────────────────────────
function getCategoryColorClasses(color: string) {
  const map: Record<string, { bg: string; text: string; border: string; badge: string; icon: string }> = {
    emerald: {
      bg: "bg-emerald-50 dark:bg-emerald-950/40",
      text: "text-emerald-700 dark:text-emerald-300",
      border: "border-emerald-200 dark:border-emerald-800",
      badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300",
      icon: "text-emerald-500 dark:text-emerald-400",
    },
    amber: {
      bg: "bg-amber-50 dark:bg-amber-950/40",
      text: "text-amber-700 dark:text-amber-300",
      border: "border-amber-200 dark:border-amber-800",
      badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300",
      icon: "text-amber-500 dark:text-amber-400",
    },
    rose: {
      bg: "bg-rose-50 dark:bg-rose-950/40",
      text: "text-rose-700 dark:text-rose-300",
      border: "border-rose-200 dark:border-rose-800",
      badge: "bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300",
      icon: "text-rose-500 dark:text-rose-400",
    },
    violet: {
      bg: "bg-violet-50 dark:bg-violet-950/40",
      text: "text-violet-700 dark:text-violet-300",
      border: "border-violet-200 dark:border-violet-800",
      badge: "bg-violet-100 text-violet-700 dark:bg-violet-900/60 dark:text-violet-300",
      icon: "text-violet-500 dark:text-violet-400",
    },
    sky: {
      bg: "bg-sky-50 dark:bg-sky-950/40",
      text: "text-sky-700 dark:text-sky-300",
      border: "border-sky-200 dark:border-sky-800",
      badge: "bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-300",
      icon: "text-sky-500 dark:text-sky-400",
    },
    gray: {
      bg: "bg-gray-50 dark:bg-gray-900/40",
      text: "text-gray-700 dark:text-gray-300",
      border: "border-gray-200 dark:border-gray-700",
      badge: "bg-gray-100 text-gray-700 dark:bg-gray-800/60 dark:text-gray-300",
      icon: "text-gray-500 dark:text-gray-400",
    },
  };
  return map[color] || map.gray;
}

// ─── Component ───────────────────────────────────────────────────
export function WorldSheet({ novelId }: WorldSheetProps) {
  // State
  const [settings, setSettings] = useState<WorldSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createCategory, setCreateCategory] = useState<CategoryKey>("geography");
  const [createDescription, setCreateDescription] = useState("");
  const [creating, setCreating] = useState(false);

  // Edit form
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState<string>("");
  const [editDescription, setEditDescription] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<WorldSetting | null>(null);
  const [deleting, setDeleting] = useState(false);

  // AI Expand
  const [expandingId, setExpandingId] = useState<string | null>(null);

  // Category group collapse
  const [openCategories, setOpenCategories] = useState<Set<string>>(
    new Set(CATEGORIES.map((c) => c.key))
  );

  // ─── Fetch ─────────────────────────────────────────────────────
  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch(`/api/world-settings?novelId=${novelId}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setSettings(data);
    } catch {
      toast.error("加载世界观设定失败");
    } finally {
      setLoading(false);
    }
  }, [novelId]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // ─── Helpers ───────────────────────────────────────────────────
  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleCategory = (key: string) => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const resetCreateForm = () => {
    setCreateName("");
    setCreateCategory("geography");
    setCreateDescription("");
    setShowCreate(false);
  };

  // ─── CRUD Handlers ─────────────────────────────────────────────
  const handleCreate = async () => {
    if (!createName.trim()) {
      toast.error("请输入设定名称");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/world-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          novelId,
          name: createName.trim(),
          category: createCategory,
          description: createDescription.trim(),
        }),
      });
      if (!res.ok) throw new Error("Failed to create");
      const newSetting = await res.json();
      setSettings((prev) => [newSetting, ...prev]);
      resetCreateForm();
      toast.success("设定创建成功");
      // Open the category if not already
      setOpenCategories((prev) => {
        const next = new Set(prev);
        next.add(createCategory);
        return next;
      });
    } catch {
      toast.error("创建失败");
    } finally {
      setCreating(false);
    }
  };

  const handleStartEdit = (setting: WorldSetting) => {
    setEditingId(setting.id);
    setEditName(setting.name);
    setEditCategory(setting.category);
    setEditDescription(setting.description);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditCategory("");
    setEditDescription("");
  };

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim()) {
      toast.error("请输入设定名称");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/world-settings/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          category: editCategory,
          description: editDescription.trim(),
        }),
      });
      if (!res.ok) throw new Error("Failed to update");
      const updated = await res.json();
      setSettings((prev) => prev.map((s) => (s.id === id ? updated : s)));
      setEditingId(null);
      toast.success("设定已更新");
    } catch {
      toast.error("更新失败");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/world-settings/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      setSettings((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      setExpandedIds((prev) => {
        const next = new Set(prev);
        next.delete(deleteTarget.id);
        return next;
      });
      setDeleteTarget(null);
      toast.success("设定已删除");
    } catch {
      toast.error("删除失败");
    } finally {
      setDeleting(false);
    }
  };

  const handleAIExpand = async (setting: WorldSetting) => {
    setExpandingId(setting.id);
    try {
      const res = await fetch("/api/world-settings/expand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: setting.id }),
      });
      if (!res.ok) throw new Error("Failed to expand");
      const updated = await res.json();
      setSettings((prev) => prev.map((s) => (s.id === setting.id ? updated : s)));
      // If editing this one, update edit form too
      if (editingId === setting.id) {
        setEditDescription(updated.description);
      }
      toast.success("AI 扩展完成");
    } catch {
      toast.error("AI 扩展失败");
    } finally {
      setExpandingId(null);
    }
  };

  // ─── Group settings by category ────────────────────────────────
  const groupedSettings = CATEGORIES.map((cat) => ({
    ...cat,
    items: settings.filter((s) => s.category === cat.key),
  }));

  // ─── Render ────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 mt-4 pb-4">
      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Globe className="size-4" />
          <span>共 {settings.length} 条设定</span>
        </div>
        <Button
          size="sm"
          onClick={() => setShowCreate(!showCreate)}
          className="gap-1.5"
        >
          {showCreate ? (
            <>取消</>
          ) : (
            <>
              <Plus className="size-3.5" />
              新建设定
            </>
          )}
        </Button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
          <p className="text-sm font-medium">创建世界观设定</p>
          <Input
            placeholder="设定名称"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <Select value={createCategory} onValueChange={(v) => setCreateCategory(v as CategoryKey)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="选择分类" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat.key} value={cat.key}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea
            placeholder="设定描述（可选）"
            value={createDescription}
            onChange={(e) => setCreateDescription(e.target.value)}
            rows={3}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={resetCreateForm}>
              取消
            </Button>
            <Button size="sm" onClick={handleCreate} disabled={creating}>
              {creating && <Loader2 className="size-3.5 animate-spin" />}
              创建
            </Button>
          </div>
        </div>
      )}

      <Separator />

      {/* Settings List */}
      <ScrollArea className="h-[calc(100vh-320px)] min-h-[300px]">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : settings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
            <Globe className="size-10" />
            <p className="text-sm font-medium">暂无世界观设定</p>
            <p className="text-xs">点击上方按钮创建第一个设定</p>
          </div>
        ) : (
          <div className="space-y-3 pr-2">
            {groupedSettings.map((group) => {
              const colors = getCategoryColorClasses(group.color);
              const catConfig = CATEGORY_MAP[group.key];
              const CatIcon = catConfig?.icon || MoreHorizontal;
              const isOpen = openCategories.has(group.key);

              if (group.items.length === 0) return null;

              return (
                <Collapsible
                  key={group.key}
                  open={isOpen}
                  onOpenChange={() => toggleCategory(group.key)}
                >
                  <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 group hover:bg-muted/50 rounded-md px-1 transition-colors">
                    <CatIcon className={`size-4 ${colors.icon}`} />
                    <span className={`text-sm font-medium ${colors.text}`}>
                      {group.label}
                    </span>
                    <Badge variant="secondary" className="text-xs px-1.5 py-0">
                      {group.items.length}
                    </Badge>
                    <ChevronDown
                      className={`size-3.5 ml-auto text-muted-foreground transition-transform duration-200 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-2 mt-1 pl-1">
                    {group.items.map((setting) => (
                      <SettingCard
                        key={setting.id}
                        setting={setting}
                        expanded={expandedIds.has(setting.id)}
                        isEditing={editingId === setting.id}
                        isExpanding={expandingId === setting.id}
                        editName={editName}
                        editCategory={editCategory}
                        editDescription={editDescription}
                        onToggleExpand={() => toggleExpanded(setting.id)}
                        onStartEdit={() => handleStartEdit(setting)}
                        onCancelEdit={handleCancelEdit}
                        onSaveEdit={() => handleSaveEdit(setting.id)}
                        onEditNameChange={setEditName}
                        onEditCategoryChange={setEditCategory}
                        onEditDescriptionChange={setEditDescription}
                        saving={saving}
                        onDelete={() => setDeleteTarget(setting)}
                        onAIExpand={() => handleAIExpand(setting)}
                      />
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除设定「{deleteTarget?.name}」吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="size-3.5 animate-spin" />}
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Setting Card Sub-Component ──────────────────────────────────
interface SettingCardProps {
  setting: WorldSetting;
  expanded: boolean;
  isEditing: boolean;
  isExpanding: boolean;
  editName: string;
  editCategory: string;
  editDescription: string;
  onToggleExpand: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onEditNameChange: (v: string) => void;
  onEditCategoryChange: (v: string) => void;
  onEditDescriptionChange: (v: string) => void;
  saving: boolean;
  onDelete: () => void;
  onAIExpand: () => void;
}

function SettingCard({
  setting,
  expanded,
  isEditing,
  isExpanding,
  editName,
  editCategory,
  editDescription,
  onToggleExpand,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onEditNameChange,
  onEditCategoryChange,
  onEditDescriptionChange,
  saving,
  onDelete,
  onAIExpand,
}: SettingCardProps) {
  const catConfig = CATEGORY_MAP[setting.category];
  const colors = getCategoryColorClasses(catConfig?.color || "gray");

  return (
    <div
      className={`rounded-lg border transition-all duration-200 ${
        expanded
          ? `${colors.bg} ${colors.border}`
          : "border-border hover:border-muted-foreground/20"
      }`}
    >
      {/* Collapsed view */}
      <button
        onClick={onToggleExpand}
        className="flex items-start gap-3 w-full p-3 text-left group"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">{setting.name}</span>
            <Badge className={`text-xs px-1.5 py-0 border-0 ${colors.badge}`}>
              {catConfig?.label || setting.category}
            </Badge>
          </div>
          {setting.description && !expanded && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {setting.description}
            </p>
          )}
        </div>
        <ChevronDown
          className={`size-3.5 text-muted-foreground mt-0.5 transition-transform duration-200 shrink-0 ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Expanded view */}
      {expanded && (
        <div className="px-3 pb-3">
          <Separator className="mb-3" />

          {isEditing ? (
            /* Edit mode */
            <div className="space-y-2.5">
              <Input
                value={editName}
                onChange={(e) => onEditNameChange(e.target.value)}
                placeholder="设定名称"
                className="text-sm"
              />
              <Select value={editCategory} onValueChange={onEditCategoryChange}>
                <SelectTrigger className="w-full text-sm">
                  <SelectValue placeholder="选择分类" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.key} value={cat.key}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea
                value={editDescription}
                onChange={(e) => onEditDescriptionChange(e.target.value)}
                placeholder="设定描述"
                rows={4}
                className="text-sm"
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={onCancelEdit} disabled={saving}>
                  取消
                </Button>
                <Button size="sm" onClick={onSaveEdit} disabled={saving}>
                  {saving && <Loader2 className="size-3.5 animate-spin" />}
                  保存
                </Button>
              </div>
            </div>
          ) : (
            /* View mode */
            <div className="space-y-3">
              {setting.description ? (
                <div className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                  {setting.description}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">暂无描述</p>
              )}

              <div className="flex items-center gap-1.5 flex-wrap">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-xs h-7"
                  onClick={onStartEdit}
                >
                  <Pencil className="size-3" />
                  编辑
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-xs h-7"
                  onClick={onAIExpand}
                  disabled={isExpanding}
                >
                  {isExpanding ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Wand2 className="size-3" />
                  )}
                  AI 扩展
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-xs h-7 text-destructive hover:text-destructive"
                  onClick={onDelete}
                >
                  <Trash2 className="size-3" />
                  删除
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
