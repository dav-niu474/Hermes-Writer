import { create } from "zustand";
import type { Novel, Chapter, Character, WorldSetting, AgentTask, ViewType, AgentConfig, AgentType } from "./types";
import { DEFAULT_AGENT_CONFIGS } from "./types";

// Load agent configs from localStorage
function loadAgentConfigs(): Record<string, AgentConfig> {
  if (typeof window === "undefined") return {} as Record<string, AgentConfig>;
  try {
    const saved = localStorage.getItem("hermes-agent-configs");
    if (saved) {
      const parsed = JSON.parse(saved) as Record<string, AgentConfig>;
      // Merge with defaults to ensure new fields are present
      const merged: Record<string, AgentConfig> = { ...DEFAULT_AGENT_CONFIGS };
      for (const key of Object.keys(parsed) as AgentType[]) {
        if (merged[key] && parsed[key]) {
          merged[key] = { ...merged[key], ...parsed[key] };
        }
      }
      return merged;
    }
  } catch (e) {
    console.error("Failed to load agent configs:", e);
  }
  return { ...DEFAULT_AGENT_CONFIGS };
}

function saveAgentConfigs(configs: Record<string, AgentConfig>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("hermes-agent-configs", JSON.stringify(configs));
  } catch (e) {
    console.error("Failed to save agent configs:", e);
  }
}

// Workspace navigation tabs for the Hermes Canvas double-layer structure
export type WorkspaceCreativeTab = "outline" | "characters" | "worldview";
export type WorkspaceEngineeringTab = "version";
export type WorkspaceTab = WorkspaceCreativeTab | WorkspaceEngineeringTab;

interface AppState {
  // Navigation
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;

  // Workspace Canvas navigation
  workspaceTab: WorkspaceTab;
  setWorkspaceTab: (tab: WorkspaceTab) => void;
  engineeringCollapsed: boolean;
  setEngineeringCollapsed: (v: boolean) => void;

  // Novel selection
  selectedNovelId: string | null;
  selectedChapterId: string | null;
  setSelectedNovel: (id: string | null) => void;
  setSelectedChapter: (id: string | null) => void;

  // Data
  novels: Novel[];
  setNovels: (novels: Novel[]) => void;
  currentNovel: Novel | null;
  setCurrentNovel: (novel: Novel | null) => void;
  chapters: Chapter[];
  setChapters: (chapters: Chapter[]) => void;
  characters: Character[];
  setCharacters: (characters: Character[]) => void;
  worldSettings: WorldSetting[];
  setWorldSettings: (settings: WorldSetting[]) => void;
  agentTasks: AgentTask[];
  setAgentTasks: (tasks: AgentTask[]) => void;

  // UI State
  isCreatingNovel: boolean;
  setIsCreatingNovel: (v: boolean) => void;
  isAgentRunning: boolean;
  setIsAgentRunning: (v: boolean) => void;
  activeAgentPanel: string | null;
  setActiveAgentPanel: (agent: string | null) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;

  // Agent Configuration
  agentConfigs: Record<string, AgentConfig>;
  _setAgentConfigsInternal: (configs: Record<string, AgentConfig>) => void;
  setAgentConfig: (type: string, config: AgentConfig) => void;
  updateAgentConfig: (type: string, updates: Partial<AgentConfig>) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Navigation
  currentView: "dashboard",
  setCurrentView: (view) => set({ currentView: view }),

  // Workspace Canvas navigation
  workspaceTab: "outline",
  setWorkspaceTab: (tab) => set({ workspaceTab: tab }),
  engineeringCollapsed: false,
  setEngineeringCollapsed: (v) => set({ engineeringCollapsed: v }),

  // Novel selection
  selectedNovelId: null,
  selectedChapterId: null,
  setSelectedNovel: (id) => set({ selectedNovelId: id, selectedChapterId: null }),
  setSelectedChapter: (id) => set({ selectedChapterId: id }),

  // Data
  novels: [],
  setNovels: (novels) => set({ novels }),
  currentNovel: null,
  setCurrentNovel: (novel) => set({ currentNovel: novel }),
  chapters: [],
  setChapters: (chapters) => set({ chapters }),
  characters: [],
  setCharacters: (characters) => set({ characters }),
  worldSettings: [],
  setWorldSettings: (settings) => set({ worldSettings: settings }),
  agentTasks: [],
  setAgentTasks: (tasks) => set({ agentTasks: tasks }),

  // UI State
  isCreatingNovel: false,
  setIsCreatingNovel: (v) => set({ isCreatingNovel: v }),
  isAgentRunning: false,
  setIsAgentRunning: (v) => set({ isAgentRunning: v }),
  activeAgentPanel: null,
  setActiveAgentPanel: (agent) => set({ activeAgentPanel: agent }),
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  // Agent Configuration - initialize from localStorage or defaults
  agentConfigs: { ...DEFAULT_AGENT_CONFIGS },
  _setAgentConfigsInternal: (configs) => set({ agentConfigs: configs }),
  setAgentConfig: (type, config) => {
    const newConfigs = { ...get().agentConfigs, [type]: config };
    set({ agentConfigs: newConfigs });
    saveAgentConfigs(newConfigs);
  },
  updateAgentConfig: (type, updates) => {
    const current = get().agentConfigs[type];
    if (!current) return;
    const newConfig = { ...current, ...updates };
    const newConfigs = { ...get().agentConfigs, [type]: newConfig };
    set({ agentConfigs: newConfigs });
    saveAgentConfigs(newConfigs);
  },
}));
