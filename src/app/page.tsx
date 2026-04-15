"use client";

import { useEffect } from "react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { useAppStore } from "@/lib/store";
import { AppSidebar } from "@/components/platform/app-sidebar";
import { DashboardView } from "@/components/platform/dashboard-view";
import { NovelsView } from "@/components/platform/novels-view";
import { WorkspaceView } from "@/components/platform/workspace-view";
import { AgentsView } from "@/components/platform/agents-view";
import { CreateNovelDialog } from "@/components/platform/create-novel-dialog";
import { StoryWizardDemoButton } from "@/components/platform/story-wizard-demo";

export default function Home() {
  const { currentView } = useAppStore();

  // Auto-initialize database on first load (silent, idempotent)
  useEffect(() => {
    fetch("/api/db/init", { method: "POST" }).catch(() => {
      // Silently ignore — API routes also auto-init via ensureDbInitialized()
    });
  }, []);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Hermes Writer</span>
            <span>/</span>
            <span>
              {currentView === "dashboard" && "工作台"}
              {currentView === "novels" && "作品管理"}
              {currentView === "workspace" && "创作空间"}
              {currentView === "agents" && "Agent 系统"}
            </span>
          </div>
        </header>
        <main className="flex-1 overflow-hidden">
          {currentView === "dashboard" && <DashboardView />}
          {currentView === "novels" && <NovelsView />}
          {currentView === "workspace" && <WorkspaceView />}
          {currentView === "agents" && <AgentsView />}
        </main>
      </SidebarInset>

      {/* Global Create Novel Dialog — accessible from any view */}
      <CreateNovelDialog />

      {/* Story Wizard — accessible from dashboard */}
      <StoryWizardDemoButton />
    </SidebarProvider>
  );
}
