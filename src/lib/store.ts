import { create } from "zustand";
import type { Novel, Chapter, Character, WorldSetting, AgentTask, ViewType } from "./types";

interface AppState {
  // Navigation
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;

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
}

export const useAppStore = create<AppState>((set) => ({
  // Navigation
  currentView: "dashboard",
  setCurrentView: (view) => set({ currentView: view }),

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
  setWorldSettings: (settings) => set({ worldSettings }),
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
}));
