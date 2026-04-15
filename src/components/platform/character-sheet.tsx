"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  Trash2,
  Crown,
  Swords,
  Shield,
  Eye,
  ChevronDown,
  Sparkles,
  Loader2,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Character, CharacterRole } from "@/lib/types";

// ===== Constants =====

interface CharacterSheetProps {
  novelId: string;
}

const ROLE_CONFIG: Record<
  CharacterRole,
  { label: string; color: string; bg: string; icon: React.ReactNode }
> = {
  protagonist: {
    label: "主角",
    color: "from-amber-400 to-orange-500",
    bg: "bg-amber-50 dark:bg-amber-900/30",
    icon: <Crown className="size-3.5" />,
  },
  antagonist: {
    label: "反派",
    color: "from-rose-400 to-red-500",
    bg: "bg-rose-50 dark:bg-rose-900/30",
    icon: <Swords className="size-3.5" />,
  },
  supporting: {
    label: "配角",
    color: "from-sky-400 to-blue-500",
    bg: "bg-sky-50 dark:bg-sky-900/30",
    icon: <Shield className="size-3.5" />,
  },
  minor: {
    label: "龙套",
    color: "from-gray-400 to-gray-500",
    bg: "bg-gray-50 dark:bg-gray-900/30",
    icon: <Eye className="size-3.5" />,
  },
};

const EMPTY_FORM = {
  name: "",
  role: "supporting" as CharacterRole,
  description: "",
  personality: "",
  appearance: "",
  backstory: "",
};

// ===== Component =====

export function CharacterSheet({ novelId }: CharacterSheetProps) {
  // Data state
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);

  // UI state
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [aiAnalyzingId, setAiAnalyzingId] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiResultId, setAiResultId] = useState<string | null>(null);

  // Form state
  const [createForm, setCreateForm] = useState({ ...EMPTY_FORM });
  const [editForm, setEditForm] = useState({ ...EMPTY_FORM });

  // ===== Data Fetching =====

  const loadCharacters = useCallback(async () => {
    try {
      const res = await fetch(`/api/characters?novelId=${novelId}`);
      if (res.ok) {
        const data = await res.json();
        setCharacters(data);
      }
    } catch (err) {
      console.error("Failed to load characters:", err);
    } finally {
      setLoading(false);
    }
  }, [novelId]);

  useEffect(() => {
    loadCharacters();
  }, [loadCharacters]);

  // ===== CRUD Operations =====

  async function handleCreate() {
    if (!createForm.name.trim()) return;
    try {
      const res = await fetch("/api/characters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...createForm, novelId }),
      });
      if (res.ok) {
        setCreateForm({ ...EMPTY_FORM });
        setShowCreateForm(false);
        await loadCharacters();
      }
    } catch (err) {
      console.error("Failed to create character:", err);
    }
  }

  function startEdit(character: Character) {
    setEditingId(character.id);
    setEditForm({
      name: character.name,
      role: character.role,
      description: character.description,
      personality: character.personality,
      appearance: character.appearance,
      backstory: character.backstory,
    });
  }

  async function handleUpdate() {
    if (!editingId || !editForm.name.trim()) return;
    try {
      const res = await fetch(`/api/characters/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        setEditingId(null);
        setEditForm({ ...EMPTY_FORM });
        await loadCharacters();
      }
    } catch (err) {
      console.error("Failed to update character:", err);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/characters/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setDeleteConfirmId(null);
        setExpandedId(null);
        if (editingId === id) {
          setEditingId(null);
          setEditForm({ ...EMPTY_FORM });
        }
        await loadCharacters();
      }
    } catch (err) {
      console.error("Failed to delete character:", err);
    }
  }

  // ===== AI Analysis =====

  async function handleAiAnalysis(character: Character) {
    setAiAnalyzingId(character.id);
    setAiResult(null);
    setAiResultId(character.id);
    try {
      const res = await fetch("/api/agents/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentType: "planner",
          novelId,
          message: `请对这个角色进行深度分析：\n\n角色名称：${character.name}\n角色定位：${ROLE_CONFIG[character.role as CharacterRole]?.label || character.role}\n描述：${character.description}\n性格：${character.personality}\n外貌：${character.appearance}\n背景：${character.backstory}\n\n请从以下维度进行分析：\n1. 角色定位与核心冲突\n2. 性格深度与成长潜力\n3. 与其他角色的关系建议\n4. 情节发展建议\n5. 可能的隐藏设定`,
          stream: false,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiResult(data.output || "分析完成，但未返回结果。");
      } else {
        const errData = await res.json();
        setAiResult(`分析失败：${errData.error || "未知错误"}`);
      }
    } catch (err) {
      setAiResult("分析请求失败，请稍后重试。");
    } finally {
      setAiAnalyzingId(null);
    }
  }

  // ===== Helpers =====

  function getPersonalityPills(personality: string) {
    if (!personality.trim()) return [];
    return personality
      .split(/[,，、;；\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
    setAiResult(null);
    setAiResultId(null);
  }

  // ===== Render: Loading =====

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ===== Render: Empty State =====

  if (characters.length === 0 && !showCreateForm) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4 px-4">
        <div className="size-16 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 flex items-center justify-center">
          <Crown className="size-7 text-amber-500" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium mb-1">还没有角色</p>
          <p className="text-xs text-muted-foreground mb-4">
            为你的作品创建第一个角色吧
          </p>
          <Button size="sm" onClick={() => setShowCreateForm(true)}>
            <Plus className="size-3.5 mr-1.5" />
            创建角色
          </Button>
        </div>
      </div>
    );
  }

  // ===== Render: Main Content =====

  return (
    <div className="flex flex-col gap-4 mt-2">
      {/* Header with create button */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          共 {characters.length} 个角色
        </span>
        {!showCreateForm && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 text-xs"
            onClick={() => setShowCreateForm(true)}
          >
            <Plus className="size-3.5" />
            添加角色
          </Button>
        )}
      </div>

      <ScrollArea className="h-[calc(100vh-220px)]">
        <div className="flex flex-col gap-3 pr-3 pb-4">
          {/* ===== Create Form ===== */}
          {showCreateForm && (
            <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">创建新角色</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs text-muted-foreground"
                  onClick={() => {
                    setShowCreateForm(false);
                    setCreateForm({ ...EMPTY_FORM });
                  }}
                >
                  取消
                </Button>
              </div>
              <div className="grid gap-3">
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <Input
                    value={createForm.name}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, name: e.target.value })
                    }
                    placeholder="角色名称"
                    className="h-8 text-sm"
                  />
                  <Select
                    value={createForm.role}
                    onValueChange={(v) =>
                      setCreateForm({
                        ...createForm,
                        role: v as CharacterRole,
                      })
                    }
                  >
                    <SelectTrigger className="h-8 w-[88px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="protagonist">主角</SelectItem>
                      <SelectItem value="antagonist">反派</SelectItem>
                      <SelectItem value="supporting">配角</SelectItem>
                      <SelectItem value="minor">龙套</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Textarea
                  value={createForm.personality}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      personality: e.target.value,
                    })
                  }
                  placeholder="性格特点（逗号分隔）"
                  rows={2}
                  className="text-sm resize-none"
                />
                <Textarea
                  value={createForm.description}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      description: e.target.value,
                    })
                  }
                  placeholder="角色描述"
                  rows={2}
                  className="text-sm resize-none"
                />
                <Textarea
                  value={createForm.appearance}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      appearance: e.target.value,
                    })
                  }
                  placeholder="外貌特征"
                  rows={2}
                  className="text-sm resize-none"
                />
                <Textarea
                  value={createForm.backstory}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      backstory: e.target.value,
                    })
                  }
                  placeholder="背景故事"
                  rows={2}
                  className="text-sm resize-none"
                />
                <Button
                  size="sm"
                  onClick={handleCreate}
                  disabled={!createForm.name.trim()}
                  className="h-8"
                >
                  创建角色
                </Button>
              </div>
            </div>
          )}

          {/* ===== Character Cards ===== */}
          {characters.map((character) => {
            const roleConf = ROLE_CONFIG[character.role as CharacterRole];
            const isExpanded = expandedId === character.id;
            const isEditing = editingId === character.id;
            const isDeleting = deleteConfirmId === character.id;
            const pills = getPersonalityPills(character.personality);

            return (
              <div
                key={character.id}
                className={cn(
                  "rounded-xl border transition-all duration-200",
                  roleConf?.bg,
                  isExpanded
                    ? "border-primary/20 shadow-sm"
                    : "border-transparent hover:border-border/60"
                )}
              >
                {/* ===== Card Header (always visible) ===== */}
                <button
                  className="w-full flex items-start gap-3 p-3 text-left"
                  onClick={() => {
                    if (isEditing) return;
                    toggleExpand(character.id);
                  }}
                >
                  {/* Avatar */}
                  <div
                    className={cn(
                      "size-10 rounded-full bg-gradient-to-br flex items-center justify-center flex-shrink-0 text-white font-bold text-sm shadow-sm",
                      roleConf?.color || "from-gray-400 to-gray-500"
                    )}
                  >
                    {character.name.charAt(0)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold truncate">
                        {character.name}
                      </span>
                      {roleConf && (
                        <Badge
                          variant="secondary"
                          className="h-5 px-1.5 text-[10px] gap-0.5 font-medium"
                        >
                          {roleConf.icon}
                          {roleConf.label}
                        </Badge>
                      )}
                    </div>
                    {character.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {character.description}
                      </p>
                    )}
                    {pills.length > 0 && !isExpanded && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {pills.slice(0, 4).map((pill, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] bg-background/60 text-muted-foreground"
                          >
                            {pill}
                          </span>
                        ))}
                        {pills.length > 4 && (
                          <span className="text-[10px] text-muted-foreground px-1">
                            +{pills.length - 4}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Expand chevron */}
                  <ChevronDown
                    className={cn(
                      "size-4 text-muted-foreground flex-shrink-0 mt-1 transition-transform duration-200",
                      isExpanded && "rotate-180"
                    )}
                  />
                </button>

                {/* ===== Expanded Details ===== */}
                {isExpanded && !isEditing && (
                  <div className="px-3 pb-3">
                    <Separator className="mb-3 opacity-50" />

                    {/* Personality pills */}
                    {pills.length > 0 && (
                      <div className="mb-3">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">
                          性格特点
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {pills.map((pill, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-background/80 text-foreground border border-border/50"
                            >
                              {pill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Description */}
                    {character.description && (
                      <div className="mb-3">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">
                          角色描述
                        </p>
                        <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap">
                          {character.description}
                        </p>
                      </div>
                    )}

                    {/* Appearance */}
                    {character.appearance && (
                      <div className="mb-3">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">
                          外貌特征
                        </p>
                        <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap">
                          {character.appearance}
                        </p>
                      </div>
                    )}

                    {/* Backstory */}
                    {character.backstory && (
                      <div className="mb-3">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">
                          背景故事
                        </p>
                        <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap">
                          {character.backstory}
                        </p>
                      </div>
                    )}

                    {/* AI Analysis result */}
                    {aiResultId === character.id && aiResult && (
                      <div className="mb-3">
                        <Separator className="mb-3 opacity-50" />
                        <div className="rounded-lg bg-violet-50 dark:bg-violet-900/20 border border-violet-200/50 dark:border-violet-800/30 p-3">
                          <p className="text-[10px] uppercase tracking-wider text-violet-600 dark:text-violet-400 font-medium mb-1.5 flex items-center gap-1">
                            <Sparkles className="size-3" />
                            AI 深度分析
                          </p>
                          <div className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                            {aiResult}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          startEdit(character);
                        }}
                      >
                        <Pencil className="size-3" />
                        编辑
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAiAnalysis(character);
                        }}
                        disabled={aiAnalyzingId === character.id}
                      >
                        {aiAnalyzingId === character.id ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <Sparkles className="size-3" />
                        )}
                        AI 深度分析
                      </Button>
                      {isDeleting ? (
                        <div className="flex items-center gap-1.5 ml-auto">
                          <span className="text-[10px] text-destructive">
                            确认删除？
                          </span>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(character.id);
                            }}
                          >
                            确认
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmId(null);
                            }}
                          >
                            取消
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 ml-auto"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(character.id);
                          }}
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* ===== Edit Mode ===== */}
                {isExpanded && isEditing && (
                  <div className="px-3 pb-3">
                    <Separator className="mb-3 opacity-50" />
                    <div className="grid gap-3">
                      <div className="grid grid-cols-[1fr_auto] gap-2">
                        <Input
                          value={editForm.name}
                          onChange={(e) =>
                            setEditForm({ ...editForm, name: e.target.value })
                          }
                          placeholder="角色名称"
                          className="h-8 text-sm"
                          autoFocus
                        />
                        <Select
                          value={editForm.role}
                          onValueChange={(v) =>
                            setEditForm({
                              ...editForm,
                              role: v as CharacterRole,
                            })
                          }
                        >
                          <SelectTrigger className="h-8 w-[88px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="protagonist">主角</SelectItem>
                            <SelectItem value="antagonist">反派</SelectItem>
                            <SelectItem value="supporting">配角</SelectItem>
                            <SelectItem value="minor">龙套</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Textarea
                        value={editForm.personality}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            personality: e.target.value,
                          })
                        }
                        placeholder="性格特点（逗号分隔）"
                        rows={2}
                        className="text-sm resize-none"
                      />
                      <Textarea
                        value={editForm.description}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            description: e.target.value,
                          })
                        }
                        placeholder="角色描述"
                        rows={2}
                        className="text-sm resize-none"
                      />
                      <Textarea
                        value={editForm.appearance}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            appearance: e.target.value,
                          })
                        }
                        placeholder="外貌特征"
                        rows={2}
                        className="text-sm resize-none"
                      />
                      <Textarea
                        value={editForm.backstory}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            backstory: e.target.value,
                          })
                        }
                        placeholder="背景故事"
                        rows={2}
                        className="text-sm resize-none"
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={handleUpdate}
                          disabled={!editForm.name.trim()}
                          className="h-8"
                        >
                          保存修改
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => {
                            setEditingId(null);
                            setEditForm({ ...EMPTY_FORM });
                          }}
                        >
                          取消
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
