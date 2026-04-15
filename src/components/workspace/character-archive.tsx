"use client";

import { useState, useCallback } from "react";
import type { Character, CharacterRole, AgentType, Novel } from "@/lib/types";
import { AGENT_DEFINITIONS } from "@/lib/types";
import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Users,
  Plus,
  Sparkles,
  Wand2,
  Trash2,
  Pencil,
  Star,
  Shield,
  Brain,
  Heart,
  ChevronRight,
  X,
  Save,
  Loader2,
  Crown,
  Swords,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ===== Role Configuration =====

interface RoleConfig {
  label: string;
  gradient: string;
  avatarGradient: string;
  badgeClass: string;
  icon: typeof Crown;
  description: string;
}

const ROLE_CONFIG: Record<CharacterRole, RoleConfig> = {
  protagonist: {
    label: "主角",
    gradient: "from-amber-400 to-orange-500",
    avatarGradient: "bg-gradient-to-br from-amber-400 to-orange-500",
    badgeClass: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    icon: Crown,
    description: "故事的主角，核心叙事推动者",
  },
  antagonist: {
    label: "反派",
    gradient: "from-red-400 to-rose-500",
    avatarGradient: "bg-gradient-to-br from-red-400 to-rose-500",
    badgeClass: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-800",
    icon: Swords,
    description: "与主角对立的角色",
  },
  supporting: {
    label: "配角",
    gradient: "from-teal-400 to-cyan-500",
    avatarGradient: "bg-gradient-to-br from-teal-400 to-cyan-500",
    badgeClass: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300 border-teal-200 dark:border-teal-800",
    icon: Shield,
    description: "辅助主角的重要角色",
  },
  minor: {
    label: "龙套",
    gradient: "from-gray-400 to-gray-500",
    avatarGradient: "bg-gradient-to-br from-gray-400 to-gray-500",
    badgeClass: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700",
    icon: Eye,
    description: "次要背景角色",
  },
};

// ===== Props =====

interface CharacterArchiveProps {
  novelId: string;
  characters: Character[];
  onRefresh: () => void;
}

// ===== Empty Character Form =====

interface CharacterFormData {
  name: string;
  role: CharacterRole;
  description: string;
  personality: string;
  appearance: string;
  backstory: string;
}

const EMPTY_FORM: CharacterFormData = {
  name: "",
  role: "supporting",
  description: "",
  personality: "",
  appearance: "",
  backstory: "",
};

// ===== Component =====

export function CharacterArchive({ novelId, characters, onRefresh }: CharacterArchiveProps) {
  const { setSelectedAgent, setShowAgentPanel, setAiMessage } = useAppStore();

  // UI State
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State
  const [createForm, setCreateForm] = useState<CharacterFormData>(EMPTY_FORM);
  const [editForm, setEditForm] = useState<CharacterFormData>(EMPTY_FORM);

  // ===== Create Character =====
  const handleCreate = useCallback(async () => {
    if (!createForm.name.trim()) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/characters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...createForm, novelId }),
      });
      if (res.ok) {
        setShowCreateDialog(false);
        setCreateForm(EMPTY_FORM);
        onRefresh();
      }
    } catch (e) {
      console.error("Failed to create character:", e);
    } finally {
      setIsSaving(false);
    }
  }, [createForm, novelId, onRefresh]);

  // ===== Edit Character =====
  const openEdit = useCallback((char: Character) => {
    setSelectedCharacter(char);
    setIsEditing(true);
    setEditForm({
      name: char.name,
      role: char.role,
      description: char.description,
      personality: char.personality,
      appearance: char.appearance,
      backstory: char.backstory,
    });
  }, []);

  const handleUpdate = useCallback(async () => {
    if (!selectedCharacter || !editForm.name.trim()) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/characters/${selectedCharacter.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editForm, novelId }),
      });
      if (res.ok) {
        setIsEditing(false);
        setSelectedCharacter(null);
        onRefresh();
      }
    } catch (e) {
      console.error("Failed to update character:", e);
    } finally {
      setIsSaving(false);
    }
  }, [selectedCharacter, editForm, novelId, onRefresh]);

  // ===== Delete Character =====
  const handleDelete = useCallback(async (char: Character) => {
    if (!confirm(`确认删除角色「${char.name}」？此操作不可撤销。`)) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/characters?id=${char.id}`, { method: "DELETE" });
      if (res.ok) {
        setSelectedCharacter(null);
        setIsEditing(false);
        onRefresh();
      }
    } catch (e) {
      console.error("Failed to delete character:", e);
    } finally {
      setIsDeleting(false);
    }
  }, [onRefresh]);

  // ===== Ask AI about character =====
  const handleAskAI = useCallback(
    (char: Character) => {
      setSelectedAgent("character");
      setShowAgentPanel(true);
      setAiMessage(
        `分析角色「${char.name}」的设定，提供性格深化、发展建议和情节融入方案。当前设定：${char.description || "无"} 性格：${char.personality || "无"} 外貌：${char.appearance || "无"} 背景：${char.backstory || "无"}`
      );
    },
    [setSelectedAgent, setShowAgentPanel, setAiMessage]
  );

  // ===== Helper: parse personality keywords =====
  const getPersonalityKeywords = (personality: string): string[] => {
    if (!personality) return [];
    return personality
      .split(/[,，、;；\n]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 5);
  };

  // ===== Empty State =====
  if (characters.length === 0 && !selectedCharacter) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 p-6">
        <div className="size-20 rounded-full bg-gradient-to-br from-rose-100 to-pink-100 dark:from-rose-900/30 dark:to-pink-900/30 flex items-center justify-center">
          <Users className="size-10 text-rose-400" />
        </div>
        <div className="text-center max-w-sm">
          <h2 className="text-lg font-semibold mb-2">暂无角色</h2>
          <p className="text-sm text-muted-foreground mb-1">
            为你的故事创建角色，让人物活起来
          </p>
          <p className="text-xs text-muted-foreground/70 mb-6">
            你可以手动创建角色，也可以使用 AI 助手自动生成角色设定
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="size-4 mr-2" />创建角色
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedAgent("character");
                setShowAgentPanel(true);
                setAiMessage("请帮我为这个故事创建几个核心角色，包括主角、反派和配角。请为每个角色提供完整的设定。");
              }}
            >
              <Sparkles className="size-4 mr-2" />AI 创建角色
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ===== Character Detail View =====
  if (selectedCharacter && !isEditing) {
    const char = selectedCharacter;
    const roleConfig = ROLE_CONFIG[char.role];
    const RoleIcon = roleConfig.icon;
    const keywords = getPersonalityKeywords(char.personality);

    return (
      <div className="flex flex-col h-full">
        {/* Back header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1"
            onClick={() => setSelectedCharacter(null)}
          >
            <ChevronRight className="size-4 rotate-180" />
            <span className="text-xs">返回列表</span>
          </Button>
          <Separator orientation="vertical" className="h-4" />
          <span className="text-xs text-muted-foreground">{characters.length} 个角色</span>
        </div>

        <ScrollArea className="flex-1">
          <div className="max-w-2xl mx-auto p-6 space-y-6">
            {/* Character Hero */}
            <div className="flex items-start gap-4">
              <Avatar className="size-16 rounded-xl shadow-lg">
                <AvatarFallback
                  className={cn(
                    "text-white text-xl font-bold rounded-xl bg-gradient-to-br",
                    roleConfig.gradient
                  )}
                >
                  {char.name[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-xl font-bold truncate">{char.name}</h2>
                  <Badge className={cn("text-[10px] border", roleConfig.badgeClass)}>
                    <RoleIcon className="size-3 mr-1" />
                    {roleConfig.label}
                  </Badge>
                </div>
                {char.description && (
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {char.description}
                  </p>
                )}
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                <Button variant="outline" size="sm" className="h-8 gap-1" onClick={() => openEdit(char)}>
                  <Pencil className="size-3.5" />
                  <span className="text-xs">编辑</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1"
                  onClick={() => handleAskAI(char)}
                >
                  <Brain className="size-3.5 text-rose-400" />
                  <span className="text-xs">AI 分析</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(char)}
                  disabled={isDeleting}
                >
                  {isDeleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                </Button>
              </div>
            </div>

            <Separator />

            {/* Personality Keywords */}
            {keywords.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  性格特征
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {keywords.map((kw, i) => (
                    <Badge
                      key={i}
                      variant="secondary"
                      className="text-xs bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-300"
                    >
                      <Heart className="size-3 mr-1" />
                      {kw}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Appearance */}
            {char.appearance && (
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  外貌描写
                </h3>
                <Card className="bg-muted/30">
                  <CardContent className="p-4">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{char.appearance}</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Backstory */}
            {char.backstory && (
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  背景故事
                </h3>
                <Card className="bg-muted/30">
                  <CardContent className="p-4">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{char.backstory}</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Full Personality */}
            {char.personality && (
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  详细性格
                </h3>
                <Card className="bg-muted/30">
                  <CardContent className="p-4">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{char.personality}</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Quick AI Actions */}
            <Separator />
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                AI 助手
              </h3>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                  onClick={() => handleAskAI(char)}
                >
                  <Wand2 className="size-3.5 text-rose-400" />
                  深度分析角色
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                  onClick={() => {
                    setSelectedAgent("character");
                    setShowAgentPanel(true);
                    setAiMessage(`为角色「${char.name}」规划成长弧线，包括关键转折点和内心转变。`);
                  }}
                >
                  <Star className="size-3.5 text-amber-400" />
                  规划成长弧线
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                  onClick={() => {
                    setSelectedAgent("character");
                    setShowAgentPanel(true);
                    setAiMessage(`为角色「${char.name}」设计与其他角色的关系网络和互动模式。`);
                  }}
                >
                  <Shield className="size-3.5 text-teal-400" />
                  角色关系分析
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>
    );
  }

  // ===== Character Edit View =====
  if (selectedCharacter && isEditing) {
    const roleConfig = ROLE_CONFIG[editForm.role];
    const RoleIcon = roleConfig.icon;

    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1"
              onClick={() => {
                setIsEditing(false);
              }}
            >
              <X className="size-4" />
              <span className="text-xs">取消</span>
            </Button>
            <Separator orientation="vertical" className="h-4" />
            <h2 className="text-sm font-semibold">编辑角色</h2>
          </div>
          <Button
            size="sm"
            className="h-8 gap-1.5"
            onClick={handleUpdate}
            disabled={isSaving || !editForm.name.trim()}
          >
            {isSaving ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Save className="size-3.5" />
            )}
            <span className="text-xs">{isSaving ? "保存中..." : "保存"}</span>
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="max-w-2xl mx-auto p-6 space-y-5">
            {/* Avatar preview */}
            <div className="flex items-center gap-3">
              <Avatar className="size-12 rounded-xl">
                <AvatarFallback
                  className={cn(
                    "text-white text-lg font-bold rounded-xl bg-gradient-to-br",
                    roleConfig.gradient
                  )}
                >
                  {editForm.name[0] || "?"}
                </AvatarFallback>
              </Avatar>
              <div>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="text-base font-semibold border-none shadow-none px-0 h-auto focus-visible:ring-0 w-48"
                  placeholder="角色名称"
                />
              </div>
            </div>

            {/* Role */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                角色定位
              </label>
              <Select
                value={editForm.role}
                onValueChange={(v) => setEditForm({ ...editForm, role: v as CharacterRole })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ROLE_CONFIG) as CharacterRole[]).map((role) => {
                    const rc = ROLE_CONFIG[role];
                    const RcIcon = rc.icon;
                    return (
                      <SelectItem key={role} value={role}>
                        <div className="flex items-center gap-2">
                          <RcIcon className="size-4" />
                          <span>{rc.label}</span>
                          <span className="text-xs text-muted-foreground">- {rc.description}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                角色简介
              </label>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="简要描述角色的核心特点和在故事中的作用..."
                className="min-h-[80px] resize-none"
              />
            </div>

            {/* Personality */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                性格特征
              </label>
              <Textarea
                value={editForm.personality}
                onChange={(e) => setEditForm({ ...editForm, personality: e.target.value })}
                placeholder="描述角色的性格特点，可用逗号分隔关键词..."
                className="min-h-[80px] resize-none"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                支持用逗号分隔关键词，如：勇敢、善良、固执、乐观
              </p>
            </div>

            {/* Appearance */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                外貌描写
              </label>
              <Textarea
                value={editForm.appearance}
                onChange={(e) => setEditForm({ ...editForm, appearance: e.target.value })}
                placeholder="描述角色的外貌特征、穿着风格..."
                className="min-h-[80px] resize-none"
              />
            </div>

            {/* Backstory */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                背景故事
              </label>
              <Textarea
                value={editForm.backstory}
                onChange={(e) => setEditForm({ ...editForm, backstory: e.target.value })}
                placeholder="描述角色的过去经历、成长背景..."
                className="min-h-[120px] resize-none"
              />
            </div>

            {/* Delete button */}
            <Separator />
            <div className="flex justify-end">
              <Button
                variant="destructive"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => handleDelete(selectedCharacter)}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Trash2 className="size-3.5" />
                )}
                删除角色
              </Button>
            </div>
          </div>
        </ScrollArea>
      </div>
    );
  }

  // ===== Character Card Grid (default view) =====
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0">
        <div className="flex items-center gap-2">
          <Users className="size-4 text-rose-400" />
          <h2 className="text-sm font-semibold">角色档案</h2>
          <Badge variant="secondary" className="text-[10px]">
            {characters.length} 个角色
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => {
              setSelectedAgent("character");
              setShowAgentPanel(true);
              setAiMessage("请帮我为这个故事创建几个核心角色，包括主角、反派和配角。请为每个角色提供完整的设定。");
            }}
          >
            <Sparkles className="size-3.5 text-rose-400" />
            <span className="hidden sm:inline">AI 创建</span>
          </Button>
          <Button
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => {
              setCreateForm(EMPTY_FORM);
              setShowCreateDialog(true);
            }}
          >
            <Plus className="size-3.5" />
            新建角色
          </Button>
        </div>
      </div>

      {/* Character Grid */}
      <ScrollArea className="flex-1 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {characters.map((char) => {
            const roleConfig = ROLE_CONFIG[char.role];
            const RoleIcon = roleConfig.icon;
            const keywords = getPersonalityKeywords(char.personality);

            return (
              <Card
                key={char.id}
                className="group cursor-pointer rounded-xl border shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200 overflow-hidden"
                onClick={() => setSelectedCharacter(char)}
              >
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-start gap-3">
                    <Avatar className="size-12 rounded-xl shadow-sm">
                      <AvatarFallback
                        className={cn(
                          "text-white text-base font-bold rounded-xl bg-gradient-to-br",
                          roleConfig.gradient
                        )}
                      >
                        {char.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm font-semibold truncate leading-tight mb-1">
                        {char.name}
                      </CardTitle>
                      <Badge className={cn("text-[9px] border", roleConfig.badgeClass)}>
                        <RoleIcon className="size-2.5 mr-0.5" />
                        {roleConfig.label}
                      </Badge>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors flex-shrink-0 mt-1" />
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-2 space-y-3">
                  {char.description && (
                    <CardDescription className="text-xs leading-relaxed line-clamp-2">
                      {char.description}
                    </CardDescription>
                  )}

                  {keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {keywords.map((kw, i) => (
                        <Badge
                          key={i}
                          variant="secondary"
                          className="text-[9px] px-1.5 py-0 bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-300"
                        >
                          {kw}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-dashed">
                    <span className="text-[9px] text-muted-foreground/60">
                      {char.backstory ? "有背景故事" : "暂无背景"}
                    </span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(char);
                        }}
                      >
                        <Pencil className="size-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAskAI(char);
                        }}
                      >
                        <Brain className="size-3 text-rose-400" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>

      {/* Create Character Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="size-5 text-rose-400" />
              创建新角色
            </DialogTitle>
            <DialogDescription>
              为你的故事添加一个新角色，填写角色设定信息
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium">角色名称 *</label>
              <Input
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="输入角色名称"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && createForm.name.trim()) {
                    handleCreate();
                  }
                }}
              />
            </div>

            {/* Role */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium">角色定位</label>
              <Select
                value={createForm.role}
                onValueChange={(v) => setCreateForm({ ...createForm, role: v as CharacterRole })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择角色类型" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ROLE_CONFIG) as CharacterRole[]).map((role) => {
                    const rc = ROLE_CONFIG[role];
                    const RcIcon = rc.icon;
                    return (
                      <SelectItem key={role} value={role}>
                        <div className="flex items-center gap-2">
                          <RcIcon className="size-4" />
                          <span>{rc.label}</span>
                          <span className="text-xs text-muted-foreground">- {rc.description}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium">角色简介</label>
              <Textarea
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                placeholder="简要描述角色的核心特点和在故事中的作用..."
                className="min-h-[80px] resize-none"
              />
            </div>

            {/* Personality */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium">性格特征</label>
              <Textarea
                value={createForm.personality}
                onChange={(e) => setCreateForm({ ...createForm, personality: e.target.value })}
                placeholder="描述角色的性格特点，可用逗号分隔关键词..."
                className="min-h-[80px] resize-none"
              />
              <p className="text-[10px] text-muted-foreground">
                支持用逗号分隔关键词，如：勇敢、善良、固执、乐观
              </p>
            </div>

            {/* Appearance */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium">外貌描写</label>
              <Textarea
                value={createForm.appearance}
                onChange={(e) => setCreateForm({ ...createForm, appearance: e.target.value })}
                placeholder="描述角色的外貌特征、穿着风格..."
                className="min-h-[80px] resize-none"
              />
            </div>

            {/* Backstory */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium">背景故事</label>
              <Textarea
                value={createForm.backstory}
                onChange={(e) => setCreateForm({ ...createForm, backstory: e.target.value })}
                placeholder="描述角色的过去经历、成长背景..."
                className="min-h-[100px] resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              disabled={isSaving}
            >
              取消
            </Button>
            <Button
              onClick={handleCreate}
              disabled={isSaving || !createForm.name.trim()}
            >
              {isSaving ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  创建中...
                </>
              ) : (
                <>
                  <Plus className="size-4 mr-2" />
                  创建角色
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
