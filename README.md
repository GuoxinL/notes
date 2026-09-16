# notes

`guoxin.space` 站点 **/notes** 板块的**公开数据源仓**（N-T01~N-T06）。

## 分支

| 分支 | 定位 | 内容 |
| --- | --- | --- |
| `main` | **用户文档分支**（站点取数来源：`raw.githubusercontent.com/GuoxinL/notes/main/build/...`） | `content/` 下是正式文章；`scripts/` 构建脚本；`build/` 提交态产物 |
| `example` | **完整基线分支**（脚本 + 示例文档 + 数据产物，供新环境起步 / AI 写作参考 / 站点 e2e fixture 对照） | 与 `main` 同构，但保留的是**示例型**文章与配套产物 |

**同步红线**：`scripts/` 构建脚本或示例文档发生变化时，**必须同步到 `example` 分支**（保持基线最新）。依据 guoxin.space 的 `CONSTRAINTS.md` **C-54**。同步方式：`git checkout example && git cherry-pick <commit>`（或 `git merge main`，仅在确认不夹带用户文章时）。

仓内存 Obsidian 风格的 Markdown 文章（`content/`），由 `scripts/build.mjs` 构建为站点消费的 JSON 产物（`build/`），通过 `raw.githubusercontent.com/GuoxinL/notes/<branch>/build/...` 直接拉取。

## 写作 Skill（随仓分发）

本仓自带写作技能，人和 AI 都可以直接用：

| 路径 | 说明 |
| --- | --- |
| `SKILL/notes-writing/SKILL.md` | 主文档：frontmatter 字段表、语法速查、7 条红线、质量自检清单 |
| `SKILL/notes-writing/assets/example-full.md` | 完整功能模板（全字段 + 全部支持语法） |
| `SKILL/notes-writing/assets/example-minimal.md` | 最小可用模板（日常速记起手） |

> 放在 `SKILL/` 而非 `.workbuddy/` / `.codebuddy/`——那些是具体工具的专属目录，**不入库**（见 `.gitignore`）。`SKILL/` 与工具无关，任何 AI / 编辑器都能直接读。

- **AI**：在本仓工作时会自动加载该 skill，按其 SOP 写文章并跑 `npm run build` + `npm run validate`。
- **人**：直接复制 `assets/example-*.md` 到 `content/<标题>.md`（文件名即 slug），改 frontmatter 与正文即可。
- skill 内容随本仓走，**修改后请同步到 `example` 分支**（见上方「分支」节）。

## 写作约定

- 一篇文章 = `content/` 下一个 `.md` 文件，**文件名（basename）即 slug / 标题**（可用 frontmatter `title` 覆盖）。
- frontmatter（可选）：`title` / `date` / `updated` / `description` / `tags` / `category` / `status` / `series`。
- 支持语法：
  - 双链：`[[文章标题]]` 或 `[[文章标题|显示名]]`
  - 文章嵌入卡片：`![[文章标题]]`
  - StackBlitz 交互示例：`![[stackblitz|https://stackblitz.com/...]]`
  - Obsidian Callout：`> [!note] 正文`（类型：note/tip/info/warning/danger/quote）
  - 公式：`$行内$` / `$$块$$`；表格、任务列表、脚注、代码高亮（` ```ts filename="x.ts" {2-3} `）等标准 GFM。
  - 图片（方案 A：随数据仓存，构建期重写为 raw 绝对 URL）：`![alt](<文章>.assets/<语义名>.webp)`。详见下方「图片约定」。

## 构建

```bash
npm install
npm run build      # 生成 build/
npm run validate   # 校验产物对齐站点 types.ts 契约
```

## 产物（build/）

| 文件 | 用途 |
| --- | --- |
| `posts.json` | `PostsIndex`：列表页（含 `slugToId`） |
| `posts/<id>.json` | 每篇 `ArticleDoc`：详情页 |
| `all.json` | 全量 `ArticleDoc[]`：搜索建索引 |
| `search-index.json` | 轻量搜索文档 |

`date` / `updated` / `history` 取自该文件的 git 提交历史（N-T05）；文件名/标题唯一性在构建期强制校验（N-T02）。

## 图片约定

正文在**站点域**渲染，Markdown 里的相对路径会被浏览器按站点根解析 → 404。因此图片采用**方案 A**：图片随数据仓提交，构建期由 `scripts/build.mjs` 把相对路径重写为 `raw.githubusercontent.com/GuoxinL/notes/main/<仓库内相对路径>` 的绝对 URL，站点零配置直接显示。

| 项 | 约定 |
| --- | --- |
| 目录 | Obsidian 风格：`content/<文章>.assets/`（`<文章>` 与 `.md` 文件名一致） |
| 命名 | 小写 + 连字符的语义名，如 `arch-flow.webp`、`demo.svg`，避免中文/空格 |
| 格式 | `webp`（首选，体积小）/ `svg`（矢量、图标）；不强制但建议 |
| 单图体积 | **≤ 200KB**（超阈值构建只告警不阻断，建议压缩或改用对象存储） |
| 引用写法 | `![alt](示例文章.assets/arch-flow.webp)`（相对 `.md` 所在目录） |
| 不重写的三类 | ① `http(s)://` 完整外链 ② `data:` 内联 ③ `/` 开头（视为站点根，由站点自己提供） |
| 缺失文件 | 相对路径找不到文件 → 构建告警并保留原样（不会 404 到 raw，但会显示裂图） |

> ⚠️ 本仓为**公开仓库**：图片会随 `content/<文章>.assets/` 一并公开，且经 `raw.githubusercontent.com` 直链。请勿放涉密/隐私图；大图建议走对象存储后用完整外链。

> 写 `http(s)://` 完整外链或 `/` 站点根图时，**构建期不重写**（跳过校验），可用作「引用外部图 / 站点自带图」场景。
