"use client";

import { useAppStore } from "@/lib/store";
import { AGENT_DEFINITIONS } from "@/lib/types";
import type { ViewType } from "@/lib/types";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  BookOpen,
  PenSquare,
  Bot,
  Feather,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const navItems: { view: ViewType; label: string; icon: React.ReactNode }[] = [
  { view: "dashboard", label: "工作台", icon: <LayoutDashboard className="size-4" /> },
  { view: "novels", label: "作品管理", icon: <BookOpen className="size-4" /> },
  { view: "workspace", label: "创作空间", icon: <PenSquare className="size-4" /> },
  { view: "agents", label: "Agent 系统", icon: <Bot className="size-4" /> },
];

export function AppSidebar() {
  const { currentView, setCurrentView, selectedNovel, isAgentRunning } = useAppStore();

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" tooltip="Hermes Writer">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-white">
                <Feather className="size-4" />
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-semibold">Hermes Writer</span>
                <span className="text-xs text-muted-foreground">AI 网文创作平台</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>导航</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.view}>
                  <SidebarMenuButton
                    isActive={currentView === item.view}
                    tooltip={item.label}
                    onClick={() => setCurrentView(item.view)}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                    {item.view === "workspace" && isAgentRunning && (
                      <Sparkles className="size-3 text-amber-500 animate-pulse ml-auto" />
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {selectedNovel && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>Hermes Agent</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {AGENT_DEFINITIONS.slice(0, 5).map((agent) => (
                    <SidebarMenuItem key={agent.type}>
                      <SidebarMenuButton tooltip={agent.name}>
                        <Badge variant="outline" className="size-5 p-0 justify-center">
                          <span className="text-[10px]">{agent.name[0]}</span>
                        </Badge>
                        <span className="text-xs truncate">{agent.name}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarFooter>
        <div className="px-2 py-1.5">
          <p className="text-xs text-muted-foreground text-center">
            Powered by Hermes Agent
          </p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
