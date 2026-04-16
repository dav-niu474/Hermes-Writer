"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect, useMemo, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import { AVAILABLE_MODELS } from "@/lib/ai";
import {
  DEFAULT_AGENT_CONFIGS,
  type AgentType,
  type AgentConfig,
  type AgentSkill,
  type AgentTool,
  type AgentMemory,
} from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import {
  Wand2,
  Map,
  PenTool,
  SpellCheck,
  Users,
  Globe,
  ClipboardCheck,
  Settings2,
  Zap,
  Wrench,
  Brain,
  MessageSquarePlus,
  Trash2,
  RotateCcw,
  Info,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const AGENT_ICONS: Record<AgentType, React.ReactNode> = {
  hermes: <Wand2 className="size-5" />,
  planner: <Map className="size-5" />,
  writer: <PenTool className="size-5" />,
  editor: <SpellCheck className="size-5" />,
  character: <Users className="size-5" />,
  worldbuilder: <Globe className="size-5" />,
  reviewer: <ClipboardCheck className="size-5" />,
};

const AGENT_COLORS: Record<AgentType, string> = {
  hermes: "from-amber-400 to-orange-500",
  planner: "from-emerald-400 to-green-500",
  writer: "from-violet-400 to-purple-500",
  editor: "from-sky-400 to-blue-500",
  character: "from-rose-400 to-pink-500",
  worldbuilder: "from-orange-400 to-amber-500",
  reviewer: "from-teal-400 to-cyan-500",
};

const AGENT_ACCENT_COLORS: Record<AgentType, { bg: string; text: string; border: string; light: string }> = {
  hermes: { bg: "bg-amber-500", text: "text-amber-600", border: "border-amber-200 dark:border-amber-800/40", light: "bg-amber-50 dark:bg-amber-950/20" },
  planner: { bg: "bg-emerald-500", text: "text-emerald-600", border: "border-emerald-200 dark:border-emerald-800/40", light: "bg-emerald-50 dark:bg-emerald-950/20" },
  writer: { bg: "bg-violet-500", text: "text-violet-600", border: "border-violet-200 dark:border-violet-800/40", light: "bg-violet-50 dark:bg-violet-950/20" },
  editor: { bg: "bg-sky-500", text: "text-sky-600", border: "border-sky-200 dark:border-sky-800/40", light: "bg-sky-50 dark:bg-sky-950/20" },
  character: { bg: "bg-rose-500", text: "text-rose-600", border: "border-rose-200 dark:border-rose-800/40", light: "bg-rose-50 dark:bg-rose-950/20" },
  worldbuilder: { bg: "bg-orange-500", text: "text-orange-600", border: "border-orange-200 dark:border-orange-800/40", light: "bg-orange-50 dark:bg-orange-950/20" },
  reviewer: { bg: "bg-teal-500", text: "text-teal-600", border: "border-teal-200 dark:border-teal-800/40", light: "bg-teal-50 dark:bg-teal-950/20" },
};

interface AgentConfigDialogProps {
  agentType: AgentType | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AgentConfigDialog({ agentType, open, onOpenChange }: AgentConfigDialogProps) {
  const { agentConfigs, setAgentConfig, updateAgentConfig } = useAppStore();

  const config = agentType ? agentConfigs[agentType] : null;
  const accent = agentType ? AGENT_ACCENT_COLORS[agentType] : null;

  const [localConfig, setLocalConfig] = useState<AgentConfig | null>(null);
  const [promptTab, setPromptTab] = useState<"edit" | "preview">("edit");
  const [newMemory, setNewMemory] = useState("");

  // Initialize local config when dialog opens or agentType changes
  useEffect(() => {
    if (open && agentType && agentConfigs[agentType]) {
      setLocalConfig(JSON.parse(JSON.stringify(agentConfigs[agentType])));
      setPromptTab("edit");
      setNewMemory("");
    } else if (!open) {
      setLocalConfig(null);
    }
  }, [agentType, open, agentConfigs]);

  // Compute effective prompt (base + enabled skills)
  const effectivePrompt = useMemo(() => {
    if (!localConfig) return "";
    const skillsPrompts = localConfig.skills
      .filter((s) => s.enabled)
      .map((s) => s.prompt)
      .join("");
    return localConfig.systemPrompt + skillsPrompts;
  }, [localConfig]);

  const handleSave = useCallback(() => {
    if (agentType && localConfig) {
      setAgentConfig(agentType, localConfig);
      onOpenChange(false);
    }
  }, [agentType, localConfig, setAgentConfig, onOpenChange]);

  const handleReset = useCallback(() => {
    if (agentType) {
      const defaultConfig = JSON.parse(JSON.stringify(DEFAULT_AGENT_CONFIGS[agentType]));
      setLocalConfig(defaultConfig);
    }
  }, [agentType]);

  const toggleSkill = useCallback((skillId: string) => {
    if (!localConfig) return;
    setLocalConfig((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        skills: prev.skills.map((s) =>
          s.id === skillId ? { ...s, enabled: !s.enabled } : s
        ),
      };
    });
  }, [localConfig]);

  const toggleTool = useCallback((toolId: string) => {
    if (!localConfig) return;
    setLocalConfig((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        tools: prev.tools.map((t) =>
          t.id === toolId ? { ...t, enabled: !t.enabled } : t
        ),
      };
    });
  }, [localConfig]);

  const addMemory = useCallback(() => {
    if (!localConfig || !newMemory.trim()) return;
    const memory: AgentMemory = {
      id: `mem-${Date.now()}`,
      content: newMemory.trim(),
      createdAt: new Date().toISOString(),
    };
    setLocalConfig((prev) => {
      if (!prev) return prev;
      return { ...prev, memories: [...prev.memories, memory] };
    });
    setNewMemory("");
  }, [localConfig, newMemory]);

  const removeMemory = useCallback((memoryId: string) => {
    if (!localConfig) return;
    setLocalConfig((prev) => {
      if (!prev) return prev;
      return { ...prev, memories: prev.memories.filter((m) => m.id !== memoryId) };
    });
  }, [localConfig]);

  if (!config || !localConfig || !agentType || !accent) return null;

  const activeSkillsCount = localConfig.skills.filter((s) => s.enabled).length;
  const activeToolsCount = localConfig.tools.filter((t) => t.enabled).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0">
        {/* Header */}
        <div className={cn("px-6 py-4 border-b flex-shrink-0", accent.light)}>
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className={cn("flex items-center justify-center size-10 rounded-xl bg-gradient-to-br text-white shadow-lg", AGENT_COLORS[agentType])}>
                {AGENT_ICONS[agentType]}
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-lg">{localConfig.name}</DialogTitle>
                <DialogDescription className="mt-0.5">{localConfig.description}</DialogDescription>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Badge variant="outline" className="text-[10px] gap-1">
                  <Zap className="size-2.5" />{activeSkillsCount} 技能
                </Badge>
                <Badge variant="outline" className="text-[10px] gap-1">
                  <Wrench className="size-2.5" />{activeToolsCount} 工具
                </Badge>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="basic" className="flex-1 flex flex-col min-h-0">
          <div className="px-6 pt-3 flex-shrink-0">
            <TabsList className="w-full grid grid-cols-5 h-9">
              <TabsTrigger value="basic" className="text-xs gap-1.5">
                <Settings2 className="size-3" />
                <span className="hidden sm:inline">基本信息</span>
                <span className="sm:hidden">基础</span>
              </TabsTrigger>
              <TabsTrigger value="skills" className="text-xs gap-1.5">
                <Zap className="size-3" />
                <span>技能</span>
              </TabsTrigger>
              <TabsTrigger value="tools" className="text-xs gap-1.5">
                <Wrench className="size-3" />
                <span>工具</span>
              </TabsTrigger>
              <TabsTrigger value="prompt" className="text-xs gap-1.5">
                <MessageSquarePlus className="size-3" />
                <span>提示词</span>
              </TabsTrigger>
              <TabsTrigger value="memory" className="text-xs gap-1.5">
                <Brain className="size-3" />
                <span>记忆</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1">
            {/* Tab: Basic Info */}
            <TabsContent value="basic" className="p-6 mt-0 space-y-5">
              <div className="grid gap-5">
                {/* Preferred Model */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium flex items-center gap-1.5">
                    首选模型
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="size-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="text-xs">Agent 默认使用的 AI 模型，可在创作面板中切换</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <Select
                    value={localConfig.preferredModel}
                    onValueChange={(v) => setLocalConfig((prev) => prev ? { ...prev, preferredModel: v } : prev)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABLE_MODELS.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          <div className="flex items-center gap-2">
                            <span>{m.name}</span>
                            <span className={cn(
                              "text-[9px] px-1.5 py-0.5 rounded-full font-medium",
                              m.speed === "fast" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
                              m.speed === "balanced" && "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
                              m.speed === "powerful" && "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400",
                            )}>
                              {m.speed === "fast" ? "⚡极速" : m.speed === "balanced" ? "⚖️均衡" : "🚀强力"}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* Temperature */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium flex items-center gap-1.5">
                      温度 (Temperature)
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="size-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent className="text-xs">较低的值更确定，较高的值更创意</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Label>
                    <span className={cn("text-sm font-semibold", accent.text)}>{localConfig.temperature.toFixed(1)}</span>
                  </div>
                  <Slider
                    value={[localConfig.temperature]}
                    onValueChange={([v]) => setLocalConfig((prev) => prev ? { ...prev, temperature: v } : prev)}
                    min={0}
                    max={1}
                    step={0.1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>精确 (0.0)</span>
                    <span>平衡 (0.5)</span>
                    <span>创意 (1.0)</span>
                  </div>
                </div>

                {/* Max Tokens */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium flex items-center gap-1.5">
                      最大 Token 数
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="size-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent className="text-xs">单次生成的最大长度</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Label>
                    <span className={cn("text-sm font-semibold", accent.text)}>{localConfig.maxTokens}</span>
                  </div>
                  <Slider
                    value={[localConfig.maxTokens]}
                    onValueChange={([v]) => setLocalConfig((prev) => prev ? { ...prev, maxTokens: v } : prev)}
                    min={512}
                    max={8192}
                    step={256}
                    className="w-full"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>512</span>
                    <span>4096</span>
                    <span>8192</span>
                  </div>
                </div>

                <Separator />

                {/* Capabilities */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">核心能力</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {localConfig.capabilities.map((cap) => (
                      <Badge key={cap} className={cn("text-[10px]", accent.light, accent.text, "border-0")}>
                        {cap}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Tab: Skills */}
            <TabsContent value="skills" className="p-6 mt-0 space-y-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-muted-foreground">启用技能后，对应的提示词将自动附加到系统提示词中</p>
                <Badge variant="outline" className="text-[10px]">
                  {activeSkillsCount}/{localConfig.skills.length} 已启用
                </Badge>
              </div>
              <div className="space-y-2">
                {localConfig.skills.map((skill) => (
                  <div
                    key={skill.id}
                    className={cn(
                      "rounded-lg border p-3 transition-all",
                      skill.enabled
                        ? cn(accent.light, accent.border)
                        : "bg-muted/30 border-border opacity-70"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={cn("text-xs font-semibold", skill.enabled && accent.text)}>
                            {skill.name}
                          </span>
                          {skill.enabled && (
                            <Badge className={cn("text-[9px] px-1.5", accent.bg, "text-white border-0")}>
                              已启用
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground">{skill.description}</p>
                      </div>
                      <Switch
                        checked={skill.enabled}
                        onCheckedChange={() => toggleSkill(skill.id)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Tab: Tools */}
            <TabsContent value="tools" className="p-6 mt-0 space-y-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-muted-foreground">启用或禁用该 Agent 可使用的工具</p>
                <Badge variant="outline" className="text-[10px]">
                  {activeToolsCount}/{localConfig.tools.length} 已启用
                </Badge>
              </div>
              <div className="space-y-2">
                {localConfig.tools.map((tool) => (
                  <div
                    key={tool.id}
                    className={cn(
                      "rounded-lg border p-3 transition-all",
                      tool.enabled
                        ? cn(accent.light, accent.border)
                        : "bg-muted/30 border-border opacity-70"
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <div className={cn("flex items-center justify-center size-8 rounded-lg flex-shrink-0",
                          tool.enabled ? cn(accent.bg, "text-white") : "bg-muted text-muted-foreground"
                        )}>
                          <Wrench className="size-3.5" />
                        </div>
                        <div className="min-w-0">
                          <span className={cn("text-xs font-semibold block", tool.enabled && accent.text)}>
                            {tool.name}
                          </span>
                          <p className="text-[10px] text-muted-foreground truncate">{tool.description}</p>
                        </div>
                      </div>
                      <Switch
                        checked={tool.enabled}
                        onCheckedChange={() => toggleTool(tool.id)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Tab: System Prompt */}
            <TabsContent value="prompt" className="p-6 mt-0 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <button
                  className={cn(
                    "px-3 py-1 rounded-md text-xs font-medium transition-colors",
                    promptTab === "edit" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                  onClick={() => setPromptTab("edit")}
                >
                  编辑提示词
                </button>
                <button
                  className={cn(
                    "px-3 py-1 rounded-md text-xs font-medium transition-colors",
                    promptTab === "preview" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                  onClick={() => setPromptTab("preview")}
                >
                  预览最终提示词
                </button>
              </div>

              {promptTab === "edit" ? (
                <div className="space-y-2">
                  <Label className="text-xs font-medium">基础系统提示词</Label>
                  <Textarea
                    value={localConfig.systemPrompt}
                    onChange={(e) => setLocalConfig((prev) => prev ? { ...prev, systemPrompt: e.target.value } : prev)}
                    className="min-h-[300px] text-xs font-mono leading-relaxed"
                    placeholder="输入系统提示词..."
                  />
                  <p className="text-[10px] text-muted-foreground">
                    最终提示词 = 基础提示词 + 已启用技能的附加提示词
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="text-xs font-medium">
                    最终有效提示词
                    <Badge variant="outline" className="ml-2 text-[9px]">{effectivePrompt.length} 字符</Badge>
                  </Label>
                  <div className="rounded-lg border bg-muted/30 p-4 max-h-[400px] overflow-y-auto">
                    <pre className="text-xs font-mono leading-relaxed whitespace-pre-wrap text-foreground">
                      {effectivePrompt}
                    </pre>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Tab: Memory */}
            <TabsContent value="memory" className="p-6 mt-0 space-y-4">
              <div className="space-y-2 mb-3">
                <p className="text-xs text-muted-foreground">
                  记忆会在发送消息给该 Agent 时自动包含在上下文中，帮助 Agent 记住重要信息
                </p>
                <Badge variant="outline" className="text-[10px]">
                  {localConfig.memories.length} 条记忆
                </Badge>
              </div>

              {/* Add Memory */}
              <div className="flex gap-2">
                <Input
                  value={newMemory}
                  onChange={(e) => setNewMemory(e.target.value)}
                  placeholder="添加新的记忆内容..."
                  className="text-xs h-9"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addMemory();
                    }
                  }}
                />
                <Button
                  size="sm"
                  className="h-9 px-3"
                  onClick={addMemory}
                  disabled={!newMemory.trim()}
                >
                  添加
                </Button>
              </div>

              {/* Memory List */}
              {localConfig.memories.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Brain className="size-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs">暂无记忆</p>
                  <p className="text-[10px] mt-0.5">添加记忆帮助 Agent 记住重要创作信息</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {localConfig.memories.map((mem) => (
                    <div
                      key={mem.id}
                      className="group flex items-start gap-2 rounded-lg border p-2.5 transition-colors hover:bg-muted/50"
                    >
                      <div className={cn("flex items-center justify-center size-5 rounded-md flex-shrink-0 mt-0.5", accent.light, accent.text)}>
                        <Brain className="size-2.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs leading-relaxed">{mem.content}</p>
                        <p className="text-[9px] text-muted-foreground mt-1">
                          {new Date(mem.createdAt).toLocaleString("zh-CN")}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 text-destructive"
                        onClick={() => removeMemory(mem.id)}
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t flex-shrink-0 bg-background">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs gap-1.5 text-muted-foreground"
            onClick={handleReset}
          >
            <RotateCcw className="size-3" />
            恢复默认
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="text-xs" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button
              size="sm"
              className="text-xs"
              onClick={handleSave}
            >
              保存配置
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
