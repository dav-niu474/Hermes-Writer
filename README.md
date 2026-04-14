<div align="center">

# ✍️ Hermes Writer

**AI 全流程网文创作平台**

基于 Hermes Agent 多智能体架构，集剧情策划、内容创作、角色管理、世界观构建、质量审核于一体的智能网文创作平台

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38bdf8)](https://tailwindcss.com/)
[![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-latest-black)](https://ui.shadcn.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6-2d3748)](https://www.prisma.io/)
[![NVIDIA NIM](https://img.shields.io/badge/NVIDIA_NIM-GLM_4.7%20%7C%20GLM_5%20%7C%20Kimi_2.5-76b900)](https://build.nvidia.com/)

</div>

---

## 🌟 项目简介

Hermes Writer 是一个面向网文作者的全流程 AI 创作平台，核心创新在于采用了 **Hermes Agent 多智能体架构**。平台将复杂的网文创作过程拆解为 7 个专业 Agent，每个 Agent 负责创作链路中的特定环节，通过协同编排实现从创意构思到成稿输出的全自动化辅助。

### 核心亮点

- 🤖 **7 个专业 AI Agent** — 覆盖创作全流程的每个环节
- 🪄 **Hermes 智能编排** — 主控 Agent 自动协调各 Agent 协同工作
- 🧠 **多模型支持** — 集成 NVIDIA NIM，支持 GLM 4.7 / GLM 5 / Kimi 2.5 切换
- 📝 **三栏创作空间** — 可调节的章节管理 + 编辑器 + AI 助手面板
- 💾 **自动保存** — 实时保存创作内容，永不丢失
- 🌙 **暗色模式** — 完整的明暗主题支持
- 📱 **响应式设计** — 移动端到桌面端全适配

---

## 🏗️ 技术架构

### 技术栈

| 类别 | 技术 |
|------|------|
| **框架** | Next.js 16 (App Router) |
| **语言** | TypeScript 5 |
| **样式** | Tailwind CSS 4 + shadcn/ui |
| **数据库** | Prisma ORM + SQLite |
| **状态管理** | Zustand + TanStack Query |
| **AI 服务** | NVIDIA NIM (GLM 4.7, GLM 5, Kimi 2.5) |
| **认证** | NextAuth.js v4 |
| **动画** | Framer Motion |
| **部署** | Vercel |

### Hermes Agent 架构

```
                    ┌──────────────────────┐
                    │   Hermes 主控 Agent   │
                    │  (流程编排 & 任务分配)  │
                    └──────────┬───────────┘
                               │
           ┌───────────┬───────┼────────┬──────────┐
           ▼           ▼       ▼        ▼          ▼
    ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
    │ 剧情策划师 │ │ 角色管家  │ │ 世界观构建│ │ 质量审核员│
    │ Planner  │ │Character │ │WorldBuild│ │ Reviewer │
    └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘
         │            │            │            │
         └────────────┴─────┬──────┴────────────┘
                           ▼
                  ┌──────────────┐
                  │  内容创作者   │
                  │   Writer     │
                  └──────┬───────┘
                         ▼
                  ┌──────────────┐
                  │  文字编辑    │
                  │   Editor    │
                  └──────────────┘
```

### Agent 职责说明

| Agent | 名称 | 核心能力 |
|-------|------|----------|
| 🪄 **Hermes** | 主控 Agent | 流程编排、任务分配、质量监控、上下文管理 |
| 🗺️ **Planner** | 剧情策划师 | 大纲生成、情节规划、章节设计、伏笔设置 |
| ✍️ **Writer** | 内容创作者 | 章节撰写、对话创作、场景描写、情感表达 |
| 📝 **Editor** | 文字编辑 | 文字润色、语法修正、风格统一、节奏优化 |
| 👥 **Character** | 角色管家 | 角色创建、性格分析、关系管理、成长弧线 |
| 🌍 **WorldBuilder** | 世界观构建师 | 世界构建、规则设定、文化设计、背景完善 |
| ✅ **Reviewer** | 质量审核员 | 质量评审、逻辑检查、读者视角、评分建议 |

---

## 🚀 快速开始

### 环境要求

- Node.js >= 18
- Bun >= 1.0 (推荐)
- Git

### 安装

```bash
# 克隆仓库
git clone https://github.com/dav-niu474/Hermes-Writer.git
cd Hermes-Writer

# 安装依赖
bun install

# 配置环境变量
cp .env.example .env.local

# 初始化数据库
bun run db:push

# 启动开发服务器
bun run dev
```

### 环境变量

```env
# 数据库
DATABASE_URL="file:./db/custom.db"

# NVIDIA NIM API
NVIDIA_API_KEY="your_nvidia_api_key"
NVIDIA_BASE_URL="https://integrate.api.nvidia.com/v1"

# NextAuth (可选)
NEXTAUTH_SECRET="your_nextauth_secret"
NEXTAUTH_URL="http://localhost:3000"
```

---

## 📂 项目结构

```
Hermes-Writer/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # 根布局 (主题/字体)
│   │   ├── page.tsx            # 主页面 (视图路由)
│   │   ├── globals.css         # 全局样式
│   │   └── api/
│   │       ├── novels/         # 作品 CRUD API
│   │       │   ├── route.ts
│   │       │   └── [id]/
│   │       │       ├── route.ts
│   │       │       └── chapters/route.ts
│   │       ├── chapters/
│   │       │   └── [id]/route.ts
│   │       ├── characters/
│   │       │   └── route.ts
│   │       └── agents/
│   │           └── generate/route.ts  # AI Agent 生成 API
│   ├── components/
│   │   ├── platform/
│   │   │   ├── app-sidebar.tsx       # 侧边栏导航
│   │   │   ├── dashboard-view.tsx    # 工作台视图
│   │   │   ├── novels-view.tsx       # 作品管理视图
│   │   │   ├── workspace-view.tsx    # 创作空间视图
│   │   │   └── agents-view.tsx       # Agent 系统视图
│   │   └── ui/                       # shadcn/ui 组件
│   ├── lib/
│   │   ├── types.ts                  # 类型定义 & Agent 配置
│   │   ├── store.ts                  # Zustand 状态管理
│   │   ├── db.ts                     # Prisma 数据库客户端
│   │   └── ai.ts                     # NVIDIA NIM LLM 客户端
│   └── hooks/                        # 自定义 Hooks
├── prisma/
│   └── schema.prisma                 # 数据库模型定义
├── public/                           # 静态资源
├── .env.example                      # 环境变量示例
└── package.json
```

---

## 📋 开发迭代计划

### Phase 1: 核心基础 ✅ (已完成)

- [x] 项目脚手架搭建 (Next.js 16 + TypeScript + Tailwind CSS 4)
- [x] 数据库设计与实现 (Novel, Chapter, Character, WorldSetting, AgentTask)
- [x] RESTful API 设计与实现 (作品/章节/角色 CRUD)
- [x] Hermes Agent 系统设计 (7 个专业 Agent 定义)
- [x] AI Agent 生成 API 集成 (NVIDIA NIM)
- [x] 四大视图实现 (工作台/作品管理/创作空间/Agent 系统)
- [x] 三栏可调节创作空间布局
- [x] AI 助手面板 (Agent 切换 + 快捷指令 + 采纳功能)
- [x] 暗色模式支持
- [x] 响应式设计
- [x] GitHub 仓库建立与代码推送
- [x] Vercel 部署

### Phase 2: 功能增强 🚧 (进行中)

- [x] 多模型支持 (GLM 4.7, GLM 5, Kimi 2.5)
- [x] 模型切换 UI (创作空间中选择模型)
- [x] 世界观构建面板 (创建/管理世界观设定)
- [x] 角色 AI 对话 (与角色进行沉浸式对话)
- [x] 章节大纲视图 (可视化的故事大纲编辑器)
- [x] 导出功能 (导出为 TXT/Markdown)
- [x] 批量章节操作 (批量生成、批量审核)
- [x] Agent 任务历史 (查看所有 Agent 操作记录)
- [x] 写作统计面板 (字数趋势、创作进度、Agent 使用统计)
- [x] 流式响应 (AI 生成时实时流式展示)
- [x] Prompt 模板系统 (自定义 Agent 的 Prompt)

### Phase 3: 进阶功能 📋 (计划中)

- [ ] 用户认证系统 (NextAuth.js 集成)
- [ ] 多用户协作 (实时协作编辑)
- [ ] 版本控制 (章节内容的历史版本对比)
- [ ] 智能续写 (基于上下文的智能续写建议)
- [ ] 角色关系图谱 (可视化的角色关系网络)
- [ ] 世界地图编辑器 (可视化的世界地理设计)
- [ ] 时间线编辑器 (故事时间线可视化)
- [ ] AI 配音 (TTS 朗读章节内容)
- [ ] AI 插图生成 (根据场景描述生成插图)
- [ ] 多语言支持 (中英文切换)
- [ ] 移动端 APP (React Native / Capacitor)
- [ ] 插件系统 (第三方 Agent 扩展)

### Phase 4: 生态建设 📋 (远期规划)

- [ ] 开放 API (允许第三方接入 Agent 能力)
- [ ] Agent 市场 (用户分享和下载自定义 Agent)
- [ ] 写作社区 (作品分享、评论、排行榜)
- [ ] 付费系统 (高级 AI 功能订阅)
- [ ] 出版对接 (一键对接网文平台发布)
- [ ] 数据分析 (读者行为分析、推荐算法)

---

## 🔧 开发命令

```bash
# 开发
bun run dev          # 启动开发服务器 (端口 3000)

# 数据库
bun run db:push      # 推送 Schema 到数据库
bun run db:generate  # 生成 Prisma Client
bun run db:migrate   # 运行数据库迁移

# 代码质量
bun run lint         # ESLint 检查

# 构建
bun run build        # 生产环境构建
bun run start        # 启动生产服务器
```

---

## 📄 License

MIT License

---

## 👥 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 发起 Pull Request

---

<div align="center">

**Built with ❤️ by Hermes Writer Team**

Powered by [NVIDIA NIM](https://build.nvidia.com/) | [Next.js](https://nextjs.org/) | [shadcn/ui](https://ui.shadcn.com/)

</div>

