"use client";

import { MessageSquare } from "lucide-react";

export function AiAssistantDrawer({ novelId, chapterId }: { novelId: string; chapterId: string | null }) {
  return (
    <div className="p-6">
      <div className="flex flex-col items-center justify-center py-12 gap-4 text-muted-foreground">
        <MessageSquare className="size-10" />
        <p className="text-sm font-medium">AI 助手</p>
        <p className="text-xs">Coming soon — 由其他 Agent 实现完整功能</p>
      </div>
    </div>
  );
}
