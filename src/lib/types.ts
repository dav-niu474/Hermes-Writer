// Novel Platform Types

export type NovelStatus = "draft" | "writing" | "completed" | "published";
export type ChapterStatus = "draft" | "writing" | "review" | "completed";
export type CharacterRole = "protagonist" | "antagonist" | "supporting" | "minor";
export type WorldSettingCategory = "geography" | "history" | "culture" | "magic" | "technology" | "other";
export type AgentType = "hermes" | "planner" | "writer" | "editor" | "character" | "worldbuilder" | "reviewer";
export type AgentTaskStatus = "pending" | "running" | "completed" | "failed";
export type ViewType = "dashboard" | "novels" | "workspace" | "agents";

export interface Novel {
  id: string;
  title: string;
  description: string;
  genre: string;
  coverImage: string;
  status: NovelStatus;
  wordCount: number;
  createdAt: string;
  updatedAt: string;
  chapters?: Chapter[];
  characters?: Character[];
  worldSettings?: WorldSetting[];
  _count?: { chapters: number; characters: number; agentTasks: number };
}

export interface Chapter {
  id: string;
  novelId: string;
  title: string;
  content: string;
  summary: string;
  chapterNumber: number;
  status: ChapterStatus;
  wordCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Character {
  id: string;
  novelId: string;
  name: string;
  role: CharacterRole;
  description: string;
  personality: string;
  appearance: string;
  backstory: string;
  avatarUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorldSetting {
  id: string;
  novelId: string;
  name: string;
  category: WorldSettingCategory;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgentTask {
  id: string;
  novelId: string;
  chapterId: string | null;
  agentType: AgentType;
  status: AgentTaskStatus;
  input: string;
  output: string;
  errorMessage: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgentDefinition {
  type: AgentType;
  name: string;
  description: string;
  icon: string;
  color: string;
  capabilities: string[];
}

export const AGENT_DEFINITIONS: AgentDefinition[] = [
  {
    type: "hermes",
    name: "Hermes 主控",
    description: "全局编排器，协调所有 Agent 协同工作，管理创作流程",
    icon: "Wand2",
    color: "amber",
    capabilities: ["流程编排", "任务分配", "质量监控", "上下文管理"]
  },
  {
    type: "planner",
    name: "剧情策划师",
    description: "负责故事大纲、情节走向、章节规划和叙事结构设计",
    icon: "Map",
    color: "emerald",
    capabilities: ["大纲生成", "情节规划", "章节设计", "伏笔设置"]
  },
  {
    type: "writer",
    name: "内容创作者",
    description: "根据大纲和设定进行章节内容的创作和续写",
    icon: "PenTool",
    color: "violet",
    capabilities: ["章节撰写", "对话创作", "场景描写", "情感表达"]
  },
  {
    type: "editor",
    name: "文字编辑",
    description: "对创作内容进行润色、优化和一致性检查",
    icon: "SpellCheck",
    color: "sky",
    capabilities: ["文字润色", "语法修正", "风格统一", "节奏优化"]
  },
  {
    type: "character",
    name: "角色管家",
    description: "管理和维护角色设定，确保人物行为和性格的一致性",
    icon: "Users",
    color: "rose",
    capabilities: ["角色创建", "性格分析", "关系管理", "成长弧线"]
  },
  {
    type: "worldbuilder",
    name: "世界观构建师",
    description: "构建和维护小说世界观，包括地理、历史、文化等设定",
    icon: "Globe",
    color: "orange",
    capabilities: ["世界构建", "规则设定", "文化设计", "背景完善"]
  },
  {
    type: "reviewer",
    name: "质量审核员",
    description: "对创作内容进行全面质量评审，提供改进建议",
    icon: "ClipboardCheck",
    color: "teal",
    capabilities: ["质量评审", "逻辑检查", "读者视角", "评分建议"]
  }
];

export const GENRE_OPTIONS = [
  "玄幻", "仙侠", "都市", "科幻", "历史", "游戏", "悬疑", "恐怖",
  "军事", "言情", "武侠", "奇幻", "轻小说", "末世", "重生", "穿越"
];

export const NOVEL_STATUS_MAP: Record<NovelStatus, { label: string; color: string }> = {
  draft: { label: "草稿", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  writing: { label: "创作中", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  completed: { label: "已完成", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
  published: { label: "已发布", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" }
};

export const CHAPTER_STATUS_MAP: Record<ChapterStatus, { label: string; color: string }> = {
  draft: { label: "草稿", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  writing: { label: "写作中", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  review: { label: "审核中", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  completed: { label: "已完成", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" }
};

// Available AI Models
export interface LLMModel {
  id: string;
  name: string;
  provider: string;
  description: string;
}

export const AVAILABLE_MODELS: LLMModel[] = [
  { id: "glm-4-7", name: "GLM 4.7", provider: "NVIDIA NIM", description: "智谱 GLM-4.7 大语言模型" },
  { id: "glm-5", name: "GLM 5", provider: "NVIDIA NIM", description: "智谱 GLM-5 旗舰模型" },
  { id: "kimi-2.5", name: "Kimi 2.5", provider: "NVIDIA NIM", description: "Moonshot Kimi 2.5 模型" },
];
