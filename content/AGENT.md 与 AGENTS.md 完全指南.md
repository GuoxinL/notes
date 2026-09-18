---
title: AGENT.md 与 AGENTS.md 完全指南
date: 2026-08-22
tags: [AGENT.md, AGENTS.md, AI 编码助手, Cursor, Claude Code]
description: AGENT.md 与 AGENTS.md 是放在项目根目录的 Markdown 配置文件，为 AI 编码助手提供上下文与行为约束。本文梳理二者定义、核心区别、典型示例、分角色定制方法与初始化 Prompt。
---

整理时间：2026-08-22
来源：ima 知识库对话整理
适用场景：为 AI 编码助手提供项目上下文和行为指导，提升代码生成质量与一致性。

### 一、概述

AGENT.md 和 AGENTS.md 是放置在项目根目录的 Markdown 配置文件，专门为 AI 编码助手（如 Cursor、GitHub Copilot、Claude Code、Codex 等）提供项目上下文、技术栈、编码规范、构建命令和操作边界。它们的目标是让 AI 在首次接触项目时就能快速理解背景，减少重复 Prompt 和错误输出。

两者概念相似，但命名、格式、生态和标准化路径有所不同。本文档系统梳理了它们的定义、区别、示例、定制方法及初始化 Prompt，作为一站式参考。

### 二、AGENT.md 与 AGENTS.md 的定义

#### 2.1 AGENT.md（单数）

- 提出者：API Evangelist / Amp 团队
- 特点：支持 YAML frontmatter 作为结构化元数据，可定义 project、stack、conventions、instructions、avoid 等字段，并支持 JSON Schema 校验。
- 核心理念：单一事实源 + 可验证 + 可派生。可通过 CLI 工具（如 agentmd generate）生成 Cursor、Claude、Copilot 等工具的专用指令文件。
- 生态：需通过适配器或符号链接方式接入多数工具，社区正在逐步推广。
#### 2.2 AGENTS.md（复数）

- 提出者：社区实践 → Linux 基金会 AAIF（Agentic AI Foundation）管理
- 特点：纯 Markdown 为主，YAML frontmatter 可选，形式上更自由，轻量通用。
- 核心理念：开箱即用、跨工具兼容、零学习成本。
- 生态：被 28+ 工具和 60,000+ 开源项目原生支持，包括 OpenAI Codex、GitHub Copilot、Cursor、Windsurf、Devin、Aider、Zed 等。
### 三、核心区别对比

表格

||||
|---|---|---|
|格式规范|支持 YAML frontmatter，结构化元数据丰富|纯 Markdown 为主，YAML frontmatter 可选|
|元数据设计|字段丰富（version, role, priorities, tech, rules, change-policy），可 JSON Schema 校验|通常仅 name/description，主要指令在 body 中|
|工具原生支持|较少，需适配器或符号链接|广泛，28+ 工具原生支持|
|标准化组织|API Evangelist / Amp 团队|Linux 基金会 AAIF|
|适用场景|单一事实源 + 可验证 + 自动生成工具配置|开箱即用、跨工具通用、快速上手|
|学习成本|中等，需了解 frontmatter 规范|低，纯 Markdown 即可|


### 四、示例

#### 4.1 AGENT.md 示例（含 YAML frontmatter）

```yaml

---
project: "my-api-project"
description: "A REST API built with Node.js and Express serving mobile and web clients."
instructions:
  - "Follow the existing code style and patterns"
  - "Write tests for all new functionality"
  - "Keep functions small and focused"
stack:
  language: "JavaScript"
  framework: "Express"
  runtime: "Node.js 20"
  package_manager: "npm"
conventions:
  style: "ESLint with Airbnb config"
  naming: "camelCase for variables, PascalCase for classes"
  testing: "Jest with coverage > 80%"
  documentation: "JSDoc for all public functions"
tools:
  - "eslint"
  - "jest"
  - "prettier"
  - "husky"
avoid:
  - "jQuery"
  - "callbacks (use async/await)"
  - "var (use const/let)"
focus:
  - "src/"
  - "tests/"
context: "This project is a microservice in a larger distributed system."
---
```

#### 4.2 AGENTS.md 示例（纯 Markdown，简洁版）

```markdown

## AGENTS.md

### Setup commands
- Install deps: `pnpm install`
- Start dev server: `pnpm dev`
- Run tests: `pnpm test`

### Code style
- TypeScript strict mode
- Single quotes, no semicolons
- Use functional patterns where possible
```

#### 4.3 AGENTS.md 示例（多角色定义，含 YAML frontmatter）

```markdown

---
name: docs_agent
description: Expert technical writer for this project
---

You are an expert technical writer.

### Your role
- Fluent in Markdown, can read TypeScript code
- Write for developer audience, focus on clarity and practical examples

### Project knowledge
- **Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS
- **File Structure:**
  - `src/` – Application code (read from here)
  - `docs/` – All documentation (write to here)

### Commands
- Build docs: `npm run docs:build`
- Lint markdown: `npx markdownlint docs/`

### Boundaries
- ✅ **Always do:** Write new files to `docs/`, follow style examples
- ⚠️ **Ask first:** Before modifying existing documents in a major way
- 🚫 **Never do:** Modify code in `src/`, edit config files, commit secrets
```

### 五、定制不同角色的 AGENTS.md

#### 5.1 通用核心原则

- 指令命令化：提供精确的 shell 命令，而非模糊描述。
- 划定红线：明确禁止事项，防止 AI 过度热心。
- 保持简洁：200–500 行是实践最佳区间，前 100 行最重要。
- 维护更新：在修改架构或规范时同步更新。
#### 5.2 前端项目 AGENTS.md

```markdown

## AGENTS.md — 前端项目

### 角色设定
你是一个资深前端工程师，正在开发一个面向 C 端用户的电商平台。

### 技术栈
- 框架：React 18 + TypeScript 5.7 strict
- 样式：Tailwind CSS 4 + shadcn/ui
- 状态管理：Zustand（禁止引入 Redux、Jotai、MobX）
- 路由：Next.js 15 App Router
- 测试：Vitest + Playwright

### 编码规范
- 组件使用函数式组件 + Hooks，不使用 Class 组件
- 文件名：kebab-case.ts；React 组件：PascalCase.tsx
- 所有 API 请求放在 `src/services/` 目录下
- 组件 Props 必须有明确的 TypeScript 类型定义
- 禁止使用 `any`，使用 `unknown` 并收窄类型
- 文件不超过 200 行，超过请拆分
- 导入顺序：第三方库 → 内部模块 → 相对路径

### 测试要求
- 测试文件与源码同目录，命名为 `*.test.tsx`
- 最小覆盖：happy path + 一个错误用例 + 一个边界用例
- 覆盖率不低于 80%

### 禁止事项
- 不要引入新的第三方依赖，除非先在对话中讨论
- 不要修改 ESLint / Prettier / tsconfig 配置
- 不要使用内联样式（`style={{...}}`）
- 不要修改 `package-lock.json`
```

#### 5.3 后端项目 AGENTS.md

```markdown

## AGENTS.md — 后端项目

### 角色设定
你是一个资深后端工程师，负责开发 B2B SaaS 计费平台的后端服务。

### 技术栈
- 运行时：Node 20.11（通过 .nvmrc 锁定）
- 包管理器：pnpm 9.x（禁止使用 npm 或 yarn）
- 框架：Fastify 4
- 数据库：PostgreSQL 16 + Prisma 5
- 输入验证：Zod（所有 API 边界必须使用）

### 代码规范
- 异步/等待模式，禁止使用 `.then()` 链
- 错误处理：禁止抛异常，统一返回 `Result<T, E>` 类型
- 所有数据库查询必须通过 service 层，禁止在路由中直接使用 Prisma
- 写操作必须使用事务

### API 路由模式
每个路由处理器遵循以下顺序：
1. 输入验证（Zod schema）
2. 鉴权检查（中间件已处理，但需验证权限）
3. 业务逻辑（调用 service 层）
4. 返回类型化响应

### 测试要求
- 单元测试覆盖率不低于 80%（`packages/shared` 目录）
- 集成测试覆盖所有 API 端点
- 禁止 Mock 数据库——使用测试数据库 + 事务回滚

### 禁止事项
- 不要使用 `legacy/lib/utils/date.ts`——使用 date-fns
- 不要添加新依赖而不更新此文件
- 不要在任何代码中内嵌密钥——使用安全的密钥存储
- 不要在未确认的情况下重构现有代码
```

#### 5.4 产品经理 / 需求设计 AGENTS.md

```markdown

## AGENTS.md — 产品设计

### 角色设定
你是一个资深产品经理，负责定义产品需求和用户体验设计。你的输出将被开发团队直接使用。

### 输出格式规范
所有需求文档必须遵循以下结构：
- **用户故事**：As a [角色], I want to [功能], so that [价值]
- **验收标准**：Given-When-Then 格式，可测试
- **交互说明**：包含状态流转（空状态、加载态、错误态、边界情况）

### 文档规范
- 使用 Markdown 编写，保持层次清晰
- 包含原型图的 Figma 链接或交互示意图
- 每个功能点必须标注优先级（P0/P1/P2）
- 涉及 API 的需注明数据字段和接口预期

### 常用工具
- 原型设计：Figma（链接需嵌入）
- 流程图：Mermaid 语法嵌入
- 用户流程：泳道图表示

### 禁止事项
- 不要直接输出开发技术方案
- 不要编写数据库 schema 或 API 实现细节
- 不要包含机密信息或未公开的商务策略
- 不要输出代码——这是产品设计文档，不是技术实现
```

### 六、万能 Prompt 初始化 AGENTS.md

以下是一个经过验证的综合 Prompt，可直接复制给任意 LLM，根据项目信息自动生成 AGENTS.md。

```markdown

你是一位资深软件架构师和技术文档专家。请根据以下项目信息，生成一份完整的 AGENTS.md 文件。

### 输出要求
- 只输出 AGENTS.md 内容，从 `# AGENTS.md` 标题开始，不要额外解释
- 使用标准 Markdown，命令用代码块包裹
- 若信息缺失，用 `> TODO:` 标记，不要编造
- 保持简洁，总长度不超过 12k Token

### 必须包含的章节（按顺序）

#### 1. 项目概述
一句话描述 + 项目定位（如"面向开发者的开源 API 网关"）

#### 2. 技术栈
- 语言/运行时（含精确版本，如 Node.js 20）
- 框架（如 Next.js 14 App Router）
- 数据库/ORM
- 包管理器
- 构建工具
- 基础设施/CI/CD

#### 3. 项目结构
核心目录树 + 每个顶级目录的一句话说明

#### 4. 开发命令
- 安装依赖：`pnpm install`
- 启动开发：`pnpm dev`
- 运行测试：`pnpm test`
- 代码检查：`pnpm lint`
- 类型检查：`pnpm typecheck`
- 构建：`pnpm build`

#### 5. 代码规范
- 命名约定（camelCase / PascalCase / UPPER_SNAKE_CASE）
- 缩进与格式化
- 导入顺序
- 文件组织规则
- 组件/函数编写模式

#### 6. 测试策略
- 测试框架和位置
- 覆盖率要求
- 运行方式（本地 + CI）

#### 7. 安全与边界
- **Always do**：必须做的事
- **Ask first**：需要先询问的事
- **Never do**：绝对禁止的事（如修改数据库 schema、提交密钥等）

#### 8. 工作流
- 提交信息格式
- 分支命名
- PR 要求

### 项目信息
[在这里粘贴你的项目信息：
- 项目类型和功能
- 技术栈（语言、框架、数据库、版本）
- package.json / requirements.txt 等配置文件内容
- 项目独有的工具和约定
- 目录结构（可用 tree 命令输出）
- CI/CD 配置要点
]
```

#### 使用建议

快速上手：将上述 Prompt 复制到 ChatGPT / Claude / Gemini，在「项目信息」处填入项目详情（最简单的方式：粘贴 package.json + tree 输出），AI 即可生成一份完整的 AGENTS.md。

- 






迭代优化：不需要一开始就完美。建议路径：

- 第 1 步（5 分钟）：添加构建、测试、lint 命令——最高 ROI。
- 第 2 步（5 分钟）：添加技术栈和目录结构说明。
- 第 3 步（5 分钟）：添加边界规则（先写 Never do，再写 Ask first）。
- 第 4 步（持续）：每次 AI 犯错时，在 AGENTS.md 中加一条规则。
- 



维护提醒：在 AGENTS.md 末尾加上：

> 当代码库发生变化时，请确保 AGENTS.md 同步更新。

### 七、总结与最佳实践

表格

|||
|---|---|
|从零开始的新项目|AGENTS.md（纯 Markdown，跨工具兼容，开箱即用）|
|需要严格规则管理和多工具统一规则源|AGENT.md（YAML frontmatter + JSON Schema 校验 + CLI 派生）|
|两者可以共存|仓库中放一个简短的 AGENTS.md 用于通用指引，同时放一个更丰富的 AGENT.md 供深度使用|
|大型 Monorepo|根目录放通用 AGENTS.md，各子目录放专属 AGENTS.md（AI 自动读取就近优先级最高）|
|多角色协作（前端+后端+产品）|使用多 agent 定义（YAML frontmatter 分隔多个角色块）|


核心原则：指令命令化、划定红线、保持简洁、持续迭代。有了 AGENTS.md，AI 的首次输出质量将大幅提升，团队协作效率也会显著改善。
