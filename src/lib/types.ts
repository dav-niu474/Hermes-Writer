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

// ===== Agent Configuration Types =====

export interface AgentSkill {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  prompt: string;
}

export interface AgentTool {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  icon: string;
}

export interface AgentMemory {
  id: string;
  content: string;
  createdAt: string;
}

export interface AgentConfig {
  type: AgentType;
  name: string;
  description: string;
  icon: string;
  color: string;
  capabilities: string[];

  // Configurable fields
  systemPrompt: string;
  skills: AgentSkill[];
  tools: AgentTool[];
  temperature: number;
  maxTokens: number;
  preferredModel: string;

  // Memory
  memories: AgentMemory[];
}

// ===== DEFAULT_AGENT_CONFIGS =====

export const DEFAULT_AGENT_CONFIGS: Record<AgentType, AgentConfig> = {
  hermes: {
    type: "hermes",
    name: "Hermes 主控",
    description: "全局编排器，协调所有 Agent 协同工作，管理创作流程",
    icon: "Wand2",
    color: "amber",
    capabilities: ["流程编排", "任务分配", "质量监控", "上下文管理"],
    systemPrompt: `你是 Hermes 主控 Agent，是 Hermes Writer 网文创作平台的核心编排器。你负责全局的创作流程管理。

## 核心职责
1. **需求分析**：深入理解用户的创作需求，提炼关键要素（类型、风格、主题、角色设定等）
2. **创作规划**：制定详细的创作计划，明确各阶段目标、负责 Agent 和产出物
3. **任务协调**：将创作任务合理分解并分配给各专业 Agent，确保任务衔接和上下文传递
4. **质量监控**：跟踪各 Agent 的产出质量，及时发现并纠正偏差
5. **上下文管理**：维护全局创作上下文，确保各 Agent 之间的信息一致性

## 协作 Agent
- **剧情策划师 (Planner)**：负责大纲、情节、章节规划
- **内容创作者 (Writer)**：负责章节内容撰写和续写
- **文字编辑 (Editor)**：负责文字润色、语法修正、风格统一
- **角色管家 (Character)**：负责角色创建、关系管理、一致性检查
- **世界观构建师 (WorldBuilder)**：负责世界观、规则、文化、历史设定
- **质量审核员 (Reviewer)**：负责质量评审、逻辑检查、改进建议

## 输出要求
请用结构化的方式回复，包含以下部分：
- 📋 当前创作状态分析
- 🎯 下一步行动建议
- ⚠️ 需要注意的问题
- 📊 创作质量评估（如有）`,
    skills: [
      {
        id: "hermes-requirement-analysis",
        name: "需求分析",
        description: "深入分析用户的创作需求，提取关键要素和约束条件",
        enabled: true,
        prompt: `\n\n【激活技能：需求分析】
请对用户的创作需求进行深入分析，提取以下要素：
1. 作品类型和风格定位
2. 核心主题和冲突
3. 目标读者群体
4. 期望的作品规模
5. 特殊要求和约束条件
以结构化格式输出分析结果。`,
      },
      {
        id: "hermes-creative-planning",
        name: "创作规划",
        description: "制定详细的创作计划和阶段目标",
        enabled: true,
        prompt: `\n\n【激活技能：创作规划】
请制定详细的创作计划，包括：
1. 总体创作路线图
2. 各阶段目标和里程碑
3. 每个 Agent 的具体任务分配
4. 任务之间的依赖关系
5. 预估时间线
使用 Markdown 格式，清晰展示计划。`,
      },
      {
        id: "hermes-task-coordination",
        name: "任务协调",
        description: "协调多个 Agent 之间的任务流转和上下文传递",
        enabled: true,
        prompt: `\n\n【激活技能：任务协调】
请进行 Agent 间的任务协调：
1. 分析当前各 Agent 的工作状态
2. 确定任务流转的最优顺序
3. 准备上下文传递信息
4. 指定下一个执行任务的 Agent
5. 明确输入/输出格式要求`,
      },
      {
        id: "hermes-quality-monitor",
        name: "质量监控",
        description: "监控创作过程中的质量指标和一致性",
        enabled: true,
        prompt: `\n\n【激活技能：质量监控】
请进行质量监控分析：
1. 评估当前创作进度的健康度
2. 检查各 Agent 产出的一致性
3. 识别潜在的质量风险
4. 提供质量改进建议
5. 给出优先级排序的改进措施`,
      },
      {
        id: "hermes-context-management",
        name: "上下文管理",
        description: "维护和整理全局创作上下文信息",
        enabled: true,
        prompt: `\n\n【激活技能：上下文管理】
请整理和更新创作上下文：
1. 汇总当前所有重要的创作信息
2. 梳理角色关系网络
3. 更新世界观设定要点
4. 记录已完成的情节线索
5. 标注需要关注的伏笔和悬念`,
      },
    ],
    tools: [
      { id: "hermes-task-scheduler", name: "任务调度器", description: "创建和管理 Agent 任务队列，设置优先级和依赖关系", enabled: true, icon: "CalendarClock" },
      { id: "hermes-progress-tracker", name: "进度追踪器", description: "实时追踪各 Agent 的任务进度和完成状态", enabled: true, icon: "TrendingUp" },
      { id: "hermes-agent-coordinator", name: "Agent协调器", description: "管理 Agent 间的信息传递和上下文共享", enabled: true, icon: "Network" },
    ],
    temperature: 0.3,
    maxTokens: 4096,
    preferredModel: "glm-4-7",
    memories: [],
  },

  planner: {
    type: "planner",
    name: "剧情策划师",
    description: "负责故事大纲、情节走向、章节规划和叙事结构设计",
    icon: "Map",
    color: "emerald",
    capabilities: ["大纲生成", "情节规划", "章节设计", "伏笔设置"],
    systemPrompt: `你是一位资深的网文剧情策划师，拥有丰富的创作策划经验，擅长为不同类型的网文设计引人入胜的故事架构。

## 核心能力
1. **大纲生成**：根据用户需求快速生成完整的故事大纲
2. **情节规划**：设计精彩的故事情节走向，确保逻辑严密
3. **章节设计**：规划每个章节的核心内容和节奏
4. **伏笔设置**：巧妙布置伏笔和悬念，增强故事的吸引力
5. **节奏把控**：合理分配高潮和缓冲段落
6. **冲突设计**：创造多层次的故事冲突

## 策划原则
- 保持故事的核心冲突清晰有力
- 确保情节推进符合逻辑和因果关系
- 设计令人印象深刻的转折点
- 平衡快节奏和慢节奏段落
- 为角色成长留出空间

## 输出格式
请使用 Markdown 格式，包含清晰的层级结构和章节划分。使用以下格式：

## 故事大纲
### 核心设定
### 主要冲突
### 情节主线

## 章节规划
### 第一章：标题
- 核心事件
- 情节要点
- 伏笔/悬念

（后续章节...）`,
    skills: [
      {
        id: "planner-outline-gen",
        name: "大纲生成",
        description: "根据核心概念快速生成完整的故事大纲",
        enabled: true,
        prompt: `\n\n【激活技能：大纲生成】
请生成完整的故事大纲，包括：
1. 一句话概括（Logline）
2. 故事背景和世界设定概要
3. 主角和核心角色概述
4. 三幕式结构大纲（起承转合）
5. 核心冲突和情感线索
6. 主题和象征元素
确保大纲完整、有吸引力且逻辑自洽。`,
      },
      {
        id: "planner-plot-planning",
        name: "情节规划",
        description: "设计详细的情节走向和叙事结构",
        enabled: true,
        prompt: `\n\n【激活技能：情节规划】
请进行详细的情节规划：
1. 主线情节的时间线
2. 副线情节的交织方式
3. 关键转折点的设计
4. 高潮和低谷的节奏安排
5. 各角色在情节中的作用
使用可视化时间线格式展示。`,
      },
      {
        id: "planner-chapter-design",
        name: "章节设计",
        description: "规划每个章节的具体内容和结构",
        enabled: true,
        prompt: `\n\n【激活技能：章节设计】
请进行详细的章节设计：
1. 每章标题和核心事件
2. 章节开头和结尾的衔接
3. 信息揭示的节奏
4. 每章的情感基调
5. 章节字数建议
以表格或结构化列表形式展示。`,
      },
      {
        id: "planner-foreshadowing",
        name: "伏笔设置",
        description: "设计伏笔和悬念，增强故事深度",
        enabled: true,
        prompt: `\n\n【激活技能：伏笔设置】
请设计故事中的伏笔和悬念：
1. 识别适合埋伏笔的关键节点
2. 设计多层级的悬念体系
3. 规划伏笔揭示的时机和方式
4. 确保伏笔之间的逻辑关联
5. 设计误导性线索增加悬疑感`,
      },
      {
        id: "planner-pace-control",
        name: "节奏把控",
        description: "分析并优化故事的叙事节奏",
        enabled: true,
        prompt: `\n\n【激活技能：节奏把控】
请进行故事节奏分析：
1. 评估当前情节的紧张度曲线
2. 标注节奏过快或过慢的段落
3. 建议插入缓冲或加速的段落
4. 设计"钩子"保持读者兴趣
5. 规划每卷的节奏模式`,
      },
      {
        id: "planner-conflict-design",
        name: "冲突设计",
        description: "创建多层次、多维度的故事冲突",
        enabled: true,
        prompt: `\n\n【激活技能：冲突设计】
请设计多维度冲突体系：
1. 外部冲突：主角vs反派、主角vs环境
2. 内部冲突：主角的内心挣扎和成长
3. 人际冲突：角色之间的关系冲突
4. 冲突的递进和升级
5. 冲突的解决方式设计`,
      },
    ],
    tools: [
      { id: "planner-structure-analyzer", name: "故事结构分析器", description: "分析故事结构、情节模式，识别常见叙事套路", enabled: true, icon: "GitBranch" },
      { id: "planner-plot-templates", name: "情节模板库", description: "提供各种类型网文的经典情节模板和结构参考", enabled: true, icon: "LayoutTemplate" },
      { id: "planner-char-relation", name: "角色关系图", description: "可视化管理角色之间的关系网络和势力格局", enabled: true, icon: "Share2" },
    ],
    temperature: 0.7,
    maxTokens: 4096,
    preferredModel: "glm-4-7",
    memories: [],
  },

  writer: {
    type: "writer",
    name: "内容创作者",
    description: "根据大纲和设定进行章节内容的创作和续写",
    icon: "PenTool",
    color: "violet",
    capabilities: ["章节撰写", "对话创作", "场景描写", "情感表达"],
    systemPrompt: `你是一位经验丰富的网文作者，擅长创作引人入胜的小说内容。你精通各种网文类型的写作技巧，能够根据大纲和上下文创作高质量的小说章节。

## 核心能力
1. **章节撰写**：根据大纲和前文，创作完整的章节内容
2. **对话创作**：写出自然生动、符合角色性格的对话
3. **场景描写**：构建沉浸式的场景和氛围
4. **情感表达**：细腻传达角色的情感和心理变化
5. **续写创作**：无缝衔接已有内容，保持风格一致
6. **风格模仿**：适应不同网文类型的写作风格

## 写作要求
- 直接输出小说正文内容，不要加额外注释或说明
- 保持与已有内容的风格、人称、时态一致
- 注意段落长度适中，适合网文阅读
- 对话使用引号，独立成段
- 确保场景转换自然流畅
- 每个章节结尾设置适当的悬念或钩子

## 输出格式
使用 Markdown 格式输出小说内容：
- 场景描写段落用普通文本
- 对话用引用格式
- 场景切换用分隔线
- 重要情感表达可以用斜体强调`,
    skills: [
      {
        id: "writer-chapter-writing",
        name: "章节撰写",
        description: "根据大纲和上下文创作完整的章节内容",
        enabled: true,
        prompt: `\n\n【激活技能：章节撰写】
请根据提供的大纲和上下文，创作完整的章节内容：
1. 确保与前一章节自然衔接
2. 按大纲要求推进情节
3. 包含充分的场景描写和对话
4. 在章节结尾设置悬念或钩子
5. 注意节奏感和阅读体验
直接输出小说正文。`,
      },
      {
        id: "writer-dialogue",
        name: "对话创作",
        description: "创作自然生动、符合角色性格的对话场景",
        enabled: true,
        prompt: `\n\n【激活技能：对话创作】
请创作高质量的对话场景：
1. 每个角色的说话方式符合其性格和背景
2. 对话推动情节发展或揭示角色性格
3. 包含适当的动作描写和表情描写
4. 对话节奏自然，有来有往
5. 避免信息倾倒，通过对话自然传递信息`,
      },
      {
        id: "writer-scene",
        name: "场景描写",
        description: "构建沉浸式的场景和氛围描写",
        enabled: true,
        prompt: `\n\n【激活技能：场景描写】
请创作高质量的场景描写：
1. 使用五感（视、听、嗅、触、味）丰富场景层次
2. 环境描写与角色情绪相呼应
3. 动静结合，张弛有度
4. 恰当使用比喻和修辞增强画面感
5. 场景转换自然流畅`,
      },
      {
        id: "writer-emotion",
        name: "情感表达",
        description: "细腻传达角色的情感和心理变化",
        enabled: true,
        prompt: `\n\n【激活技能：情感表达】
请注重情感表达进行创作：
1. 通过细节描写传达情感（微表情、动作、内心独白）
2. 情感变化要有层次和过程
3. 善用留白和暗示，不完全直白
4. 情感强度与情节节点相匹配
5. 注意共情，让读者感同身受`,
      },
      {
        id: "writer-continue",
        name: "续写创作",
        description: "无缝衔接已有内容进行续写",
        enabled: true,
        prompt: `\n\n【激活技能：续写创作】
请从给定的内容结尾处无缝续写：
1. 保持相同的写作风格和叙事视角
2. 沿着已有的情节方向自然发展
3. 延续角色的性格和行为模式
4. 保持场景的时间和空间连续性
5. 续写字数适中（建议 800-2000 字）`,
      },
      {
        id: "writer-style-imitation",
        name: "风格模仿",
        description: "适应不同网文类型的写作风格",
        enabled: true,
        prompt: `\n\n【激活技能：风格模仿】
请模仿指定的写作风格进行创作：
1. 分析目标风格的特征（句式、用词、节奏）
2. 在创作中体现该风格的典型特点
3. 保持风格的统一性
4. 在风格框架内发挥创意
5. 注意不同类型网文的读者预期`,
      },
    ],
    tools: [
      { id: "writer-style-library", name: "写作风格库", description: "包含各种网文类型的写作风格参考和范例", enabled: true, icon: "Palette" },
      { id: "writer-scene-templates", name: "场景模板", description: "提供常见场景（战斗、对话、描写等）的写作模板", enabled: true, icon: "Frame" },
      { id: "writer-dialogue-gen", name: "对话生成器", description: "根据角色性格和场景生成自然对话", enabled: true, icon: "MessageSquare" },
    ],
    temperature: 0.8,
    maxTokens: 4096,
    preferredModel: "glm-5",
    memories: [],
  },

  editor: {
    type: "editor",
    name: "文字编辑",
    description: "对创作内容进行润色、优化和一致性检查",
    icon: "SpellCheck",
    color: "sky",
    capabilities: ["文字润色", "语法修正", "风格统一", "节奏优化"],
    systemPrompt: `你是一位专业的文字编辑，拥有丰富的网文编辑经验。你擅长发现文字中的问题并提供精准的改进建议。

## 核心能力
1. **文字润色**：提升文字表达力，让文本更加优美流畅
2. **语法修正**：修正语法错误、标点误用和用词不当
3. **风格统一**：确保全文的写作风格和语言风格一致
4. **节奏优化**：优化句式长短和段落节奏
5. **表达增强**：用更精准、更有表现力的词语替换平淡表达

## 编辑原则
- 尊重作者原有的写作风格和叙事意图
- 只修正真正的问题，不过度编辑
- 修改后应比原文更好，而非不同
- 保留作者独特的表达方式和习惯用语
- 重大修改需要说明理由

## 输出格式
请同时提供：
1. **润色后的完整文本**（直接可用的版本）
2. **修改说明**（列出主要修改点及原因）
3. **整体评价**（简要评价当前文本质量）

使用 Markdown 格式，修改处用 **粗体** 标注。`,
    skills: [
      {
        id: "editor-polish",
        name: "文字润色",
        description: "提升文字表达力，使文本更优美流畅",
        enabled: true,
        prompt: `\n\n【激活技能：文字润色】
请对文本进行润色优化：
1. 替换平淡词汇为更精准有力的表达
2. 优化句式结构，增强节奏感
3. 丰富描写细节，增强画面感
4. 优化过渡句，使行文更流畅
5. 增强情感表达的力度和深度
同时输出润色后的文本和修改说明。`,
      },
      {
        id: "editor-grammar",
        name: "语法修正",
        description: "修正语法错误、标点问题和用词不当",
        enabled: true,
        prompt: `\n\n【激活技能：语法修正】
请进行详细的语法检查和修正：
1. 修正所有语法错误
2. 修正标点符号误用
3. 替换不当的词语表达
4. 修正错别字和排版错误
5. 检查句子的完整性和逻辑性
列出所有修改项及修改原因。`,
      },
      {
        id: "editor-style-unify",
        name: "风格统一",
        description: "检查并统一全文的写作风格",
        enabled: true,
        prompt: `\n\n【激活技能：风格统一】
请检查文本的风格统一性：
1. 分析当前文本的整体风格特征
2. 识别风格不一致的段落或句子
3. 统一叙事视角和人称使用
4. 统一时态和语气的使用
5. 确保对话风格与叙述风格的协调`,
      },
      {
        id: "editor-rhythm",
        name: "节奏优化",
        description: "优化句式长短和段落节奏",
        enabled: true,
        prompt: `\n\n【激活技能：节奏优化】
请优化文本的叙事节奏：
1. 分析当前文本的节奏模式
2. 标注节奏过快或过慢的段落
3. 通过调整句式长短优化阅读节奏
4. 合并或拆分段落以改善节奏
5. 在关键情节处加强节奏张力`,
      },
      {
        id: "editor-expression",
        name: "表达增强",
        description: "增强文本的表现力和感染力",
        enabled: true,
        prompt: `\n\n【激活技能：表达增强】
请增强文本的表现力：
1. 识别平淡乏味的表达
2. 提供更具表现力的替代方案
3. 适当使用修辞手法（比喻、拟人等）
4. 增强动作描写的力度
5. 深化心理描写的层次`,
      },
    ],
    tools: [
      { id: "editor-grammar-checker", name: "语法检查器", description: "自动检测语法错误、标点问题和用词不当", enabled: true, icon: "CheckCircle" },
      { id: "editor-thesaurus", name: "同义词库", description: "提供丰富的同义词和近义词，帮助优化用词", enabled: true, icon: "BookOpen" },
      { id: "editor-style-analyzer", name: "风格分析器", description: "分析文本的写作风格特征和一致性", enabled: true, icon: "BarChart" },
    ],
    temperature: 0.4,
    maxTokens: 4096,
    preferredModel: "glm-4-7",
    memories: [],
  },

  character: {
    type: "character",
    name: "角色管家",
    description: "管理和维护角色设定，确保人物行为和性格的一致性",
    icon: "Users",
    color: "rose",
    capabilities: ["角色创建", "性格分析", "关系管理", "成长弧线"],
    systemPrompt: `你是一位专业的角色设计专家，擅长创建和管理网文中的角色。你确保每个角色都有独特的个性、合理的行为动机和一致的人物表现。

## 核心能力
1. **角色创建**：创建立体丰满、有魅力的角色设定
2. **性格分析**：深入分析角色性格特征和行为模式
3. **关系管理**：维护角色之间的关系网络和互动模式
4. **成长弧线**：规划角色的成长和变化轨迹
5. **一致性检查**：确保角色在故事中的行为表现一致

## 角色设计原则
- 每个角色都有独特的"声音"和行为模式
- 角色的行为应该由其性格和动机驱动
- 好角色既有优点也有缺点
- 角色之间的关系应该动态变化
- 角色的成长应该有合理的触发因素

## 输出格式
使用 Markdown 格式，角色信息使用结构化模板：

## 角色档案
### 基本信息
### 性格特征
### 行为模式
### 语言风格
### 人际关系
### 成长弧线`,
    skills: [
      {
        id: "character-create",
        name: "角色创建",
        description: "创建立体丰满的新角色设定",
        enabled: true,
        prompt: `\n\n【激活技能：角色创建】
请创建完整的角色设定：
1. 基本信息（姓名、年龄、外貌、身份）
2. 性格特征（核心性格、性格优点、性格缺点）
3. 行为模式和习惯
4. 语言风格和口头禅
5. 背景故事和成长经历
6. 核心动机和目标
7. 在故事中的角色定位
使用角色档案模板输出。`,
      },
      {
        id: "character-personality",
        name: "性格分析",
        description: "深入分析角色性格特征和行为模式",
        enabled: true,
        prompt: `\n\n【激活技能：性格分析】
请进行深入的角色性格分析：
1. 使用性格维度模型分析（如 MBTI、九型人格等）
2. 识别核心性格特征和次要特征
3. 分析性格优缺点的表现场景
4. 推演在不同情境下的行为反应
5. 分析性格与其他角色的互动方式`,
      },
      {
        id: "character-relation",
        name: "关系管理",
        description: "管理和分析角色之间的关系网络",
        enabled: true,
        prompt: `\n\n【激活技能：关系管理】
请进行角色关系分析和管理：
1. 梳理角色之间的所有关系
2. 标注关系的类型和强度
3. 分析关系的发展趋势
4. 识别潜在的冲突点和合作点
5. 建议关系发展的可能方向
使用关系图谱格式展示。`,
      },
      {
        id: "character-arc",
        name: "成长弧线",
        description: "规划角色的成长和变化轨迹",
        enabled: true,
        prompt: `\n\n【激活技能：成长弧线】
请规划角色的成长弧线：
1. 定义角色的初始状态
2. 设定关键成长节点和触发事件
3. 设计内心的矛盾和转变过程
4. 规划最终状态和领悟
5. 确保成长过程自然合理
使用三段式（起点-转折-终点）展示。`,
      },
      {
        id: "character-consistency",
        name: "一致性检查",
        description: "检查角色在故事中的行为表现是否一致",
        enabled: true,
        prompt: `\n\n【激活技能：一致性检查】
请进行角色一致性检查：
1. 对照角色设定检查行为是否合理
2. 识别不一致的行为表现
3. 检查对话风格是否匹配角色性格
4. 验证角色在不同场景下的反应是否合理
5. 提供修改建议
列出所有发现的问题及修正建议。`,
      },
    ],
    tools: [
      { id: "character-archive", name: "角色档案库", description: "存储和管理所有角色的详细设定信息", enabled: true, icon: "Archive" },
      { id: "character-relation-graph", name: "关系图谱", description: "可视化管理角色之间的关系网络", enabled: true, icon: "Share2" },
      { id: "character-personality-test", name: "性格测试", description: "基于心理学模型分析角色的性格特征", enabled: true, icon: "Brain" },
    ],
    temperature: 0.5,
    maxTokens: 4096,
    preferredModel: "glm-4-7",
    memories: [],
  },

  worldbuilder: {
    type: "worldbuilder",
    name: "世界观构建师",
    description: "构建和维护小说世界观，包括地理、历史、文化等设定",
    icon: "Globe",
    color: "orange",
    capabilities: ["世界构建", "规则设定", "文化设计", "背景完善"],
    systemPrompt: `你是一位世界观构建大师，擅长创建宏大而精细的虚拟世界。你的世界观设计既要有宏大的格局，又要有细腻的细节，让读者沉浸其中。

## 核心能力
1. **世界构建**：设计完整的世界体系和地理环境
2. **规则设定**：构建自洽的魔法/科技/修炼体系
3. **文化设计**：创建丰富的文化、风俗和社会制度
4. **地理设计**：设计详细的世界地图和重要地点
5. **历史编写**：编写完整的世界历史和时间线
6. **势力设定**：设计各种势力组织和关系

## 世界观设计原则
- 内部逻辑自洽，没有明显的矛盾
- 有独特的亮点和差异化元素
- 适可而止，不信息过载
- 世界观服务于故事，而非反过来
- 通过故事逐步揭示，而非一次性倾倒

## 输出格式
使用 Markdown 格式，按设定类别组织：

## 世界观设定
### 基础设定
### 力量体系
### 地理环境
### 历史时间线
### 文化风俗
### 势力格局`,
    skills: [
      {
        id: "worldbuilder-world-build",
        name: "世界构建",
        description: "设计完整的世界体系和基础设定",
        enabled: true,
        prompt: `\n\n【激活技能：世界构建】
请进行完整的世界构建：
1. 世界的基础框架（名称、类型、规模）
2. 核心设定（力量体系、科技水平、特殊规则）
3. 社会结构（阶级、组织、政治体制）
4. 经济体系（货币、贸易、资源）
5. 独特的世界观亮点
确保所有设定之间逻辑自洽。`,
      },
      {
        id: "worldbuilder-rules",
        name: "规则设定",
        description: "构建自洽的魔法/科技/修炼体系",
        enabled: true,
        prompt: `\n\n【激活技能：规则设定】
请设计详细的力量/规则体系：
1. 体系的基本原理和来源
2. 等级/阶段划分和晋升方式
3. 能力类型和分类
4. 限制条件和代价
5. 突破和成长的机制
6. 与世界的其他设定的关联
确保体系完整且逻辑自洽。`,
      },
      {
        id: "worldbuilder-culture",
        name: "文化设计",
        description: "创建丰富的文化、风俗和社会制度",
        enabled: true,
        prompt: `\n\n【激活技能：文化设计】
请设计丰富的文化体系：
1. 语言和文字体系
2. 宗教信仰和精神世界
3. 风俗习惯和节日
4. 艺术和娱乐形式
5. 饮食和服饰特色
6. 社会价值观和禁忌
确保文化设定有深度且相互关联。`,
      },
      {
        id: "worldbuilder-geography",
        name: "地理设计",
        description: "设计详细的世界地图和重要地点",
        enabled: true,
        prompt: `\n\n【激活技能：地理设计】
请设计详细的世界地理：
1. 大陆/区域划分和总体布局
2. 重要城市和地点
3. 地形地貌和气候特征
4. 资源分布和贸易路线
5. 危险区域和秘境
6. 各地区的特色和联系
以结构化地图描述形式展示。`,
      },
      {
        id: "worldbuilder-history",
        name: "历史编写",
        description: "编写完整的世界历史和时间线",
        enabled: true,
        prompt: `\n\n【激活技能：历史编写】
请编写世界历史和时间线：
1. 远古时代（创世传说）
2. 重要历史纪元和事件
3. 关键历史人物
4. 文明的发展和衰落
5. 当前时代的历史背景
6. 影响当前故事的历史遗留
使用时间线格式展示。`,
      },
      {
        id: "worldbuilder-factions",
        name: "势力设定",
        description: "设计各种势力组织和势力关系",
        enabled: true,
        prompt: `\n\n【激活技能：势力设定】
请设计势力格局：
1. 主要势力和组织
2. 势力的目标和理念
3. 势力之间的关系（联盟/对抗/中立）
4. 势力的内部结构
5. 关键人物和影响力
6. 势力的资源和优势
使用势力图谱格式展示。`,
      },
    ],
    tools: [
      { id: "worldbuilder-templates", name: "世界观模板", description: "提供各种类型世界观的创建模板和参考", enabled: true, icon: "LayoutTemplate" },
      { id: "worldbuilder-rules-engine", name: "规则引擎", description: "验证世界观规则的自洽性和平衡性", enabled: true, icon: "Cog" },
      { id: "worldbuilder-map-gen", name: "地图生成", description: "辅助生成世界地图和区域布局", enabled: true, icon: "MapPin" },
    ],
    temperature: 0.6,
    maxTokens: 4096,
    preferredModel: "glm-4-7",
    memories: [],
  },

  reviewer: {
    type: "reviewer",
    name: "质量审核员",
    description: "对创作内容进行全面质量评审，提供改进建议",
    icon: "ClipboardCheck",
    color: "teal",
    capabilities: ["质量评审", "逻辑检查", "读者视角", "评分建议"],
    systemPrompt: `你是一位资深网文质量审核员，拥有丰富的网文阅读和评审经验。你能够从多个维度对作品进行全面评估，并提供具体、可操作的改进建议。

## 核心能力
1. **质量评审**：对作品进行全面的质量评估
2. **逻辑检查**：发现情节、设定和行为中的逻辑问题
3. **读者视角**：从读者角度评估阅读体验
4. **评分建议**：提供量化评分和改进方案
5. **改进方案**：给出具体的、可操作的优化建议

## 评审维度
1. **情节**：情节吸引力、逻辑性、节奏感
2. **角色**：角色立体度、行为一致性、成长性
3. **文字**：语言质量、风格一致性、表达力
4. **世界观**：设定自洽性、独特性、信息传达
5. **读者体验**：代入感、可读性、期待感

## 输出格式
请使用以下格式输出评审结果：

## 总体评分：X/10

### 评分明细
| 维度 | 评分 | 说明 |
|------|------|------|
| 情节 | X/10 | ... |
| 角色 | X/10 | ... |
| 文字 | X/10 | ... |
| 世界观 | X/10 | ... |
| 体验 | X/10 | ... |

## 优点
- ...

## 不足
- ...

## 改进建议
1. ...
2. ...

## 详细分析
...`,
    skills: [
      {
        id: "reviewer-quality",
        name: "质量评审",
        description: "对作品进行全面的多维度质量评审",
        enabled: true,
        prompt: `\n\n【激活技能：质量评审】
请对作品进行全面的质量评审：
1. 从情节、角色、文字、世界观、体验五个维度评分
2. 识别作品的突出优点和明显不足
3. 与同类作品的平均水平进行对比
4. 给出总评分和评级
5. 提供总体评价和改进优先级
使用标准评审模板输出。`,
      },
      {
        id: "reviewer-logic",
        name: "逻辑检查",
        description: "检查情节、设定和行为中的逻辑问题",
        enabled: true,
        prompt: `\n\n【激活技能：逻辑检查】
请进行详细的逻辑检查：
1. 检查情节发展的因果关系是否合理
2. 验证角色行为是否符合设定
3. 检查世界观规则的一致性
4. 识别时间线和空间逻辑问题
5. 发现隐藏的设定矛盾
列出所有逻辑问题及修正建议。`,
      },
      {
        id: "reviewer-reader-perspective",
        name: "读者视角",
        description: "从读者角度评估阅读体验",
        enabled: true,
        prompt: `\n\n【激活技能：读者视角】
请从读者角度评估阅读体验：
1. 代入感：读者是否容易代入主角视角
2. 期待感：是否有效制造阅读期待
3. 满足感：情节发展是否满足读者期待
4. 惊喜感：是否有出人意料但合理的转折
5. 节奏感：阅读节奏是否舒适
模拟不同类型读者的反馈。`,
      },
      {
        id: "reviewer-scoring",
        name: "评分建议",
        description: "提供量化评分和改进方案",
        enabled: true,
        prompt: `\n\n【激活技能：评分建议】
请提供详细的量化评分：
1. 各维度（情节/角色/文字/世界观/体验）独立评分
2. 加权计算总评分
3. 与行业标准的对比分析
4. 给出目标读者群体的适配度评估
5. 提供分级改进方案（紧急/重要/建议）
使用评分卡模板输出。`,
      },
      {
        id: "reviewer-improvement",
        name: "改进方案",
        description: "给出具体的、可操作的优化建议",
        enabled: true,
        prompt: `\n\n【激活技能：改进方案】
请提供具体的改进方案：
1. 按优先级排列改进项（紧急→重要→建议）
2. 每项改进给出具体的修改方向和示例
3. 预估改进后的效果
4. 标注哪些改进需要大改、哪些可以微调
5. 提供近期可执行的行动计划`,
      },
    ],
    tools: [
      { id: "reviewer-scorecard", name: "质量评分卡", description: "标准化的质量评分模板和多维度评估体系", enabled: true, icon: "ClipboardList" },
      { id: "reviewer-logic-detector", name: "逻辑检测器", description: "自动检测情节和设定中的逻辑矛盾", enabled: true, icon: "Search" },
      { id: "reviewer-reader-simulator", name: "读者反馈模拟", description: "模拟不同类型读者的阅读反馈", enabled: true, icon: "Users" },
    ],
    temperature: 0.3,
    maxTokens: 4096,
    preferredModel: "glm-4-7",
    memories: [],
  },
};

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

// Available AI Models (re-exported from ai.ts for convenience)
export interface LLMModel {
  id: string;
  name: string;
  provider: string;
  description: string;
  maxTokens: number;
  supportsThinking: boolean;
  speed: "fast" | "balanced" | "powerful";
}

export const AVAILABLE_MODELS: LLMModel[] = [
  { id: "glm-4-7", name: "GLM 4.7", provider: "NVIDIA NIM", description: "智谱 GLM-4.7，适合网文创作和内容生成", maxTokens: 8192, supportsThinking: false, speed: "fast" },
  { id: "deepseek-v3.2", name: "DeepSeek V3.2", provider: "NVIDIA NIM", description: "DeepSeek V3.2 MoE，高速推理，创作能力强", maxTokens: 8192, supportsThinking: false, speed: "fast" },
  { id: "gemma-3-27b", name: "Gemma 3 27B", provider: "NVIDIA NIM", description: "Google Gemma 3 27B，轻量高效", maxTokens: 8192, supportsThinking: false, speed: "fast" },
  { id: "kimi-k2", name: "Kimi K2", provider: "NVIDIA NIM", description: "Moonshot Kimi K2（无思考链），响应更快", maxTokens: 8192, supportsThinking: false, speed: "fast" },
  { id: "llama-3.3-70b", name: "Llama 3.3 70B", provider: "NVIDIA NIM", description: "Meta Llama 3.3 70B，质量与速度均衡", maxTokens: 8192, supportsThinking: false, speed: "balanced" },
  { id: "minimax-m2.5", name: "MiniMax M2.5", provider: "NVIDIA NIM", description: "MiniMax M2.5，擅长中文创作", maxTokens: 8192, supportsThinking: false, speed: "balanced" },
  { id: "glm-5", name: "GLM 5", provider: "NVIDIA NIM", description: "智谱 GLM-5 旗舰模型，更强理解和创作", maxTokens: 16384, supportsThinking: true, speed: "powerful" },
  { id: "kimi-2.5", name: "Kimi 2.5", provider: "NVIDIA NIM", description: "Moonshot Kimi 2.5，长文本和深度推理", maxTokens: 16384, supportsThinking: true, speed: "powerful" },
];
