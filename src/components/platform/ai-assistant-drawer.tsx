"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Send,
  Loader2,
  Sparkles,
  Bot,
  RotateCcw,
  Copy,
  StopCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ===== Types =====
interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  agentType?: string;
}

const AVAILABLE_AGENTS = [
  { value: "hermes", label: "Hermes 主控", color: "text-amber-500" },
  { value: "planner", label: "剧情策划师", color: "text-emerald-500" },
  { value: "writer", label: "内容创作者", color: "text-violet-500" },
  { value: "character", label: "角色管家", color: "text-rose-500" },
  { value: "worldbuilder", label: "世界观构建师", color: "text-orange-500" },
  { value: "editor", label: "文字编辑", color: "text-sky-500" },
  { value: "reviewer", label: "质量审核员", color: "text-teal-500" },
];

const QUICK_PROMPTS = [
  "帮我续写下一段剧情",
  "分析这个角色是否立体",
  "检查当前章节的逻辑漏洞",
  "给这段文字润色优化",
  "设计一个有趣的情节转折",
  "丰富这个场景的环境描写",
];

// ===== Main Component =====
export function AiAssistantDrawer({
  novelId,
  chapterId,
  chapterContent,
  prefill,
}: {
  novelId: string;
  chapterId: string | null;
  chapterContent?: string;
  prefill?: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState("hermes");
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Pre-fill input when prefill prop changes
  useEffect(() => {
    if (prefill && prefill.trim()) {
      setInput(prefill);
      // Auto-focus the input
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [prefill]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 200);
    return () => clearTimeout(timer);
  }, []);

  const sendMessage = useCallback(async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || loading) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/agents/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentType: selectedAgent,
          novelId,
          chapterId,
          message: messageText,
          chapterContent: chapterContent?.slice(0, 3000),
          stream: false,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "请求失败");
      }

      const data = await res.json();
      const output = data.output || data.content || data.text || "（AI 未返回内容）";

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: output,
        timestamp: new Date(),
        agentType: selectedAgent,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      if (err.name === "AbortError") return;
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `请求失败: ${err.message || "未知错误"}`,
        timestamp: new Date(),
        agentType: selectedAgent,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      abortRef.current = null;
      inputRef.current?.focus();
    }
  }, [input, loading, selectedAgent, novelId, chapterId, chapterContent]);

  const stopGeneration = () => {
    abortRef.current?.abort();
    setLoading(false);
  };

  const clearChat = () => {
    setMessages([]);
  };

  const copyMessage = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const agentConfig = AVAILABLE_AGENTS.find((a) => a.value === selectedAgent);

  return (
    <div className="flex flex-col h-full">
      {/* Agent Selector + Controls */}
      <div className="flex items-center gap-2 px-4 py-2 border-b flex-shrink-0">
        <Bot className={cn("size-4", agentConfig?.color || "text-muted-foreground")} />
        <Select value={selectedAgent} onValueChange={setSelectedAgent}>
          <SelectTrigger className="h-7 w-[130px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AVAILABLE_AGENTS.map((agent) => (
              <SelectItem key={agent.value} value={agent.value}>
                <span className={cn(agent.color)}>{agent.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {messages.length > 0 && (
          <Button variant="ghost" size="icon" className="size-7 ml-auto" onClick={clearChat}>
            <RotateCcw className="size-3.5" />
          </Button>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1">
        <div ref={scrollRef} className="p-4 space-y-4">
          {messages.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center py-8 gap-4">
              <div className="size-14 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 flex items-center justify-center">
                <Sparkles className="size-7 text-amber-500" />
              </div>
              <div className="text-center max-w-sm">
                <p className="text-sm font-medium mb-1">AI 写作助手</p>
                <p className="text-xs text-muted-foreground mb-4">
                  选择一个专业 Agent，输入你的需求获取帮助
                </p>
              </div>
              <div className="grid gap-1.5 w-full max-w-sm">
                <p className="text-[10px] text-muted-foreground font-medium px-1">快速指令</p>
                {QUICK_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    className="text-left text-xs px-3 py-2 rounded-lg border hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
                    onClick={() => sendMessage(prompt)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Chat Messages */
            messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex gap-2.5",
                  msg.role === "user" ? "flex-row-reverse" : "flex-row"
                )}
              >
                {/* Avatar */}
                <div className={cn(
                  "flex items-center justify-center size-7 rounded-full flex-shrink-0 mt-0.5",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-gradient-to-br from-amber-400 to-orange-500 text-white"
                )}>
                  {msg.role === "user" ? (
                    <span className="text-[10px] font-bold">我</span>
                  ) : (
                    <Bot className="size-3.5" />
                  )}
                </div>

                {/* Content */}
                <div className={cn(
                  "flex flex-col gap-1 max-w-[80%]",
                  msg.role === "user" ? "items-end" : "items-start"
                )}>
                  <div className="flex items-center gap-1.5">
                    {msg.agentType && (
                      <Badge variant="outline" className="text-[9px] h-4 px-1">
                        {AVAILABLE_AGENTS.find((a) => a.value === msg.agentType)?.label}
                      </Badge>
                    )}
                    <span className="text-[9px] text-muted-foreground">
                      {msg.timestamp.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div className={cn(
                    "rounded-xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}>
                    {msg.content}
                  </div>
                  {msg.role === "assistant" && (
                    <button
                      className="text-[9px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5"
                      onClick={() => copyMessage(msg.content)}
                    >
                      <Copy className="size-2.5" />复制
                    </button>
                  )}
                </div>
              </div>
            ))
          )}

          {/* Loading indicator */}
          {loading && (
            <div className="flex gap-2.5">
              <div className="size-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center flex-shrink-0">
                <Bot className="size-3.5" />
              </div>
              <div className="bg-muted rounded-xl px-3.5 py-2.5">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="size-3 animate-spin" />
                  <span>{agentConfig?.label}正在思考...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t px-4 py-3 flex-shrink-0">
        <div className="flex gap-2">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入你的创作需求... (Enter 发送)"
            className="min-h-[40px] max-h-[120px] resize-none text-sm"
            rows={1}
            disabled={loading}
          />
          {loading ? (
            <Button
              variant="outline"
              size="icon"
              className="flex-shrink-0 size-9"
              onClick={stopGeneration}
            >
              <StopCircle className="size-4" />
            </Button>
          ) : (
            <Button
              size="icon"
              className="flex-shrink-0 size-9 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
              onClick={() => sendMessage()}
              disabled={!input.trim()}
            >
              <Send className="size-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
