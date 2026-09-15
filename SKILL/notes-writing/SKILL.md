---
name: notes-writing
description: 把知识沉淀成一篇 Notes 文章（Obsidian 风格 Markdown）。典型触发：和 AI 讨论完一个问题后想「记下来 / 沉淀一下 / 写成文章 / 存进 notes / 收录到知识库」；或要新增、修订 notes 数据仓里的文章，补 frontmatter，写双链/嵌入/Callout/公式/表格/脚注等语法，跑 `npm run build` + `npm run validate` 生成数据。在 notes 数据仓内工作：写 `content/*.md` → 构建产物 → 校验。内置完整示例模板与最小模板，供照抄改。
agent_created: true
---

# notes-writing：把知识沉淀成一篇 Notes 文章

## 何时使用本 skill

**用**：
- 一段对话里聊出了结论 / 排查过程 / 方案决策，用户想**沉淀下来**（说法如「记一下」「沉淀成文章」「存进 notes」「写到知识库」「别让我下次再问一遍」）
- 用户要新增或修订 `content/` 下的文章，或要补 frontmatter / 双链 / Callout 等语法
- 改完文章要**编译数据**（`npm run build` + `npm run validate`）并推送
- 拿不准某个语法（双链、嵌入、公式、表格、脚注）渲染器支不支持

**不用**：
- 只是聊天、没有落盘意图——别自作主张创建文件
- 改的是**站点代码 / 构建脚本**（渲染器、样式、管线）——那是维护者的活，见 §0「职责边界」

## 0. 工作前提

**本 skill 在「notes 数据仓」根目录运行，下文所有路径均相对仓库根，不写绝对路径。**
不确定当前是否在仓库根：看得到 `package.json` + `content/` + `scripts/` 三件套即可。

| 项 | 位置 / 说明 |
| --- | --- |
| 文章存放 | `content/**/*.md`——**文件名 basename 即 slug/标题**（frontmatter `title` 可覆盖） |
| 构建 | `npm run build`（生成 `build/`）+ `npm run validate`（契约校验），**两条都要跑** |
| 产物 | `build/posts.json`、`build/posts/<id>.json`、`build/all.json`、`build/search-index.json`——**随提交进仓** |
| 消费方 | 站点**运行时**拉取 `raw.githubusercontent.com/<owner>/<repo>/main/build/**`；`<owner>/<repo>` 以本仓 `git remote -v` 为准，不用猜。**具体是哪个站点由部署方决定，本 skill 不绑定任何站点** |
| 生效延迟 | GitHub raw CDN 约 5 分钟；浏览器强刷即可 |

### 谁做什么

一次发布是一条完整链路：**定标题并查重 → 写 `content/*.md` → `npm run build` + `npm run validate` → 把 `build/` 产物随代码提交推送 → 确认站点能读到新文章**。

分工如下——**机械劳动全部由 SKILL 承担，人只做判断与拍板**：

| 环节 | 谁做 | 说明 |
| --- | --- | --- |
| 拟定标题 / slug + **查重** | **SKILL** | 查重扫描 `content/` 全部文件名与 `title`；撞名直接报错并给候选名，不硬写 |
| 建文件、写 frontmatter | **SKILL** | 人给主题与要点，SKILL 成文；`date` 取当天 |
| **抽取标签 `tags`** | **SKILL** | 按 §2.1 规则从正文抽取，**优先复用仓里已有标签**，不让人手填 |
| 写正文 | 人提供 / SKILL 代写后**必须给人过目** | 从对话沉淀时，SKILL 直接把讨论结论整理成文 |
| `npm run build` + `npm run validate` | **SKILL** | 两条都要跑，必须全绿；失败要自己读懂报错修到通过 |
| 提交 + 推送（含 `build/` 产物） | **SKILL** | 见 §1 第 6–7 步 |
| 确认站点能读到 | **SKILL** | 校验 raw URL 与文章是否出现在列表 |
| **拍板**：标题定稿、内容取舍、是否发布 | **人** | SKILL 不得在未确认时擅自推送（除非用户已明确授权「你直接发」） |

**不归本 skill 管**（需要时找数据仓维护者）：改 `scripts/` 构建脚本、给渲染器加新语法支持、分支基线维护（如 `example` 分支同步）、站点代码与站点侧测试 fixture。

**文案口径（消费站点的默认约定，可随站点调整）**：模块名 / 导航 / 页面标题写 **Notes**；句子里的通名写「文章」（「暂无 Notes」这类混排读着别扭）。

## 1. 写文章 SOP

> **从对话沉淀时**：先定主题边界——**一次一篇**，别把三个话题塞进一篇文章；标题写「问题 / 结论」（如 `Qwik 的 resumability 是怎么工作的`），不要写成「与 AI 的讨论记录」。定好再往下走。

> 除「标题定稿 / 内容取舍 / 是否发布」要人拍板，以下步骤**全部由 SKILL 执行**（标注 `[人]` 的才需要人参与）。

1. **定 slug 并查重** `[SKILL]`：中文标题即可（如 `Qwik 与 SSR 笔记`）。查重扫 `content/` 全部文件名与 `title`——slug 重复会让构建直接 `exit 1`；撞名时报错并给候选名，**不硬写**。标题定稿 `[人]`。
2. **建文件** `[SKILL]`：`content/<标题>.md`。
3. **写 frontmatter** `[SKILL]`：最小集 `title` / `date` / `tags` / `description`；**`tags` 由 SKILL 按 §2.1 抽取**，不要让人手填（详见 §2）。
4. **写正文** `[人/SKILL]`：**从 `##` 二级标题起步**，不要用 `#`（原因见 §4 红线 1）。从对话沉淀时由 SKILL 整理成文，**成稿必须给人过目** `[人]`。
5. **编译校验** `[SKILL]`：`npm run build && npm run validate`，必须全绿；报错要自己读明白并修到通过。
6. **提交** `[SKILL]`：`git add -A && git commit -m "<人话描述>"`——**commit message 会显示在该文章的「更新历史」区块**，别写 `update` 这类废话。
7. **推送** `[SKILL，需授权]`（沙箱内需绕开 known_hosts 写入）：
   ```bash
   find .git -name "*.lock" -delete   # 沙箱常残留 lock，写操作前先清
   GIT_SSH_COMMAND="ssh -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no -o BatchMode=yes" git push origin main
   ```
8. **确认生效** `[SKILL]`：`curl -s https://raw.githubusercontent.com/<owner>/<repo>/main/build/posts.json` 返回 200 且含新文章。

## 2. frontmatter 字段

```yaml
---
title: 文章标题            # 可选；缺省=文件名 basename
date: 2026-09-15          # 可选；缺省取该文件 git 首提交日，再缺省取今天
updated: 2026-09-16       # 可选；缺省取 git 末提交日
description: 一句话摘要     # 可选；缺省取正文首段（列表页卡片用，强烈建议手写）
tags: [qwik, ssr]          # 由 SKILL 按 §2.1 抽取，不让人手填；数组或逗号串，缺省 []
category: 前端             # 可选
status: evergreen          # 可选，缺省 evergreen
series:                    # 可选；total/prev/next 由管线自动算，不要手写
  name: Markdown 实战
  order: 1
---
```

`date` 用 `YYYY-MM-DD`。YAML 会把它解析成 Date 对象，管线已收敛为字符串，**别加引号以外的花活**。

### 2.1 标签抽取规则（由 SKILL 执行，不打扰用户）

1. **来源**：从标题与正文抽**主题 / 技术名词**，不抽动词、形容词。
2. **数量**：**3–5 个**，宁少勿多。
3. **复用优先**（关键）：先扫 `content/*.md` 已有的 `tags` 取并集（或读 `build/posts.json` 的 tags 统计）——**同一概念必须复用已有写法**，禁止造同义词：`qwik` / `qwikjs` 只留一个，`构建` / `build` 只留一个。
4. **粒度**：不要过宽（`技术`、`笔记`——无检索价值），也不要过窄（只有这一篇用得到、不构成主题）。
5. **形式**：英文小写、多词用连字符（`ci-cd`）；中文标签就纯中文；**单个标签内不混中英**。
6. 抽完在提交前的回复里**列出最终 tags 供人过目**（写进汇报即可，不必停下来等答复）。

## 3. 语法速查（站点渲染器实际支持的节点）

| 语法 | 写法 | 说明 |
| --- | --- | --- |
| 标题 | `## 二级` / `### 三级` / `#### 四级` | 自动生成锚点 id（中文标题可用，`slugify` 保留中日韩字符） |
| 强调 | `**粗**` `*斜*` `~~删~~` `` `行内码` `` | |
| 列表 | `- 项` / `1. 项` | 任务列表 `- [x] 已完成` 渲染为禁用勾选框 |
| 表格 | GFM 表格 | **必须有表头分隔行** `| --- |`；表头行渲染在 `tbody` 内（当前无 `thead`） |
| 代码 | ```` ```ts ```` | Prism 高亮，主题随站点明暗切换；带复制按钮 |
| Mermaid | ```` ```mermaid ```` | 运行时懒加载渲染，主题跟随明暗 |
| 数学 | `$行内$` / `$$块$$` | KaTeX 懒加载 |
| 脚注 | `正文[^1]` + `[^1]: 脚注内容` | 上下标双向跳转 |
| Callout | `> [!tip] 正文` | 6 型：`note` 说明 / `tip` 提示 / `info` 信息 / `warning` 警告 / `danger` 危险 / `quote` 引用 |
| 双链 | `[[目标标题]]` / `[[目标标题\|别名]]` | 目标存在=实线，不存在=虚线（缺失样式） |
| 文章嵌入 | `![[目标标题]]` | 渲染目标文章的预览卡（标题/描述/标签），可点击跳转 |
| StackBlitz 嵌入 | `![[stackblitz\|https://stackblitz.com/...]]` | 嵌入 iframe |
| 图片 | `![alt](url)` | 支持 data URI |
| 分割线 | `---` | |
| 内嵌 HTML | `<p class="md-note">…</p>` | **不经清洗直接 `dangerouslySetInnerHTML`**，风险自负，尽量不用（见红线 4） |

**双链/嵌入的目标必须等于目标文章的 slug**（文件名 basename 或 frontmatter `title`），写错会变虚线「缺失」样式。引用关系会自动生成**反链**（目标文章底部「被以下文章引用」）；**自引用不产生反链**。

## 4. 红线（踩了就出问题）

1. **正文不要用 `#`**：`#` 会被正常渲染成 `<h1 class="md-h1">`（不是 bug），但**文章标题本身已经是一个 h1**（`.notes-article-title`），正文再来一个 h1 会让同页出现两个一级标题，大纲与目录层级混乱。所以正文一律 `##` 起步，标题写进 frontmatter `title`。
2. **slug 必须唯一**，否则构建报 `✗ 文件名/标题不唯一` 并 `exit 1`。
3. **想展示 `[[语法]]` 字面量，就放进反引号或代码块**——管线会把代码语境内的 `[[...]]` 还原为原文（这是特性）；放在正文里会被解析成真链接。
4. **内嵌 HTML 不清洗**：禁止 `<script>` / `on*` 事件 / 外链 `<iframe>`（站点不做 sanitize，会原样注入）。
5. **Mermaid 节点标签不要含 `[[` 或 `[]`**——会被解析成 Mermaid 的「子程序节点」语法而 Parse error。要写就换成中文方括号或引号包裹。
6. **代码块元信息 `filename="x.ts"` / `{2-3}` 当前未生效**：管线尚未注入 `codeMeta`，站点只显示语言标签。**暂时别依赖**（示例模板里也不使用）。
7. 表格缺表头分隔行、脚注只写引用不写定义，都会让渲染缺块——写完必须 `npm run build` + `npm run validate` 通过。

## 5. 示例模板（照抄改，放在 `assets/`）

| 文件 | 用途 |
| --- | --- |
| `assets/example-full.md` | **完整功能模板**：frontmatter 全字段 + 全部支持语法。写复杂文章时照它搭骨架。 |
| `assets/example-minimal.md` | **最小可用模板**：frontmatter 最小集 + 三段正文 + Callout + 双链。日常速记从它开始。 |

用法：**复制 → 放到 `content/<你的标题>.md`（文件名即 slug）→ 改 frontmatter → 逐段替换正文 → 删掉用不到的语法块 → 按 §1 编译提交**。

## 6. 质量自检（交付前逐条过）

- [ ] 文件名 = 目标 slug，且 `content/` 内无重名
- [ ] frontmatter 有 `title` / `date` / `tags` / `description`（`description` 手写，别让首段顶替）
- [ ] 正文无 `#`；标题层级 `##` → `###` 递进
- [ ] 双链目标拼写与既有文章 slug 完全一致
- [ ] `npm run build` 通过、`npm run validate` 全绿
- [ ] commit message 是给人看的（会进「更新历史」）
- [ ] 推送后 raw URL 200 且列表里能搜到新文章
