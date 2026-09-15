# notes

`guoxin.space` 站点 **/notes** 板块的**公开数据源仓**（N-T01~N-T06）。

## 分支

| 分支 | 定位 | 内容 |
| --- | --- | --- |
| `main` | **用户文档分支**（站点取数来源：`raw.githubusercontent.com/GuoxinL/notes/main/build/...`） | `content/` 下是正式文章；`scripts/` 构建脚本；`build/` 提交态产物 |
| `example` | **完整基线分支**（脚本 + 示例文档 + 数据产物，供新环境起步 / AI 写作参考 / 站点 e2e fixture 对照） | 与 `main` 同构，但保留的是**示例型**文章与配套产物 |

**同步红线**：`scripts/` 构建脚本或示例文档发生变化时，**必须同步到 `example` 分支**（保持基线最新）。依据 guoxin.space 的 `CONSTRAINTS.md` **C-54**。同步方式：`git checkout example && git cherry-pick <commit>`（或 `git merge main`，仅在确认不夹带用户文章时）。

仓内存 Obsidian 风格的 Markdown 文章（`content/`），由 `scripts/build.mjs` 构建为站点消费的 JSON 产物（`build/`），通过 `raw.githubusercontent.com/GuoxinL/notes/<branch>/build/...` 直接拉取。

## 写作约定

- 一篇文章 = `content/` 下一个 `.md` 文件，**文件名（basename）即 slug / 标题**（可用 frontmatter `title` 覆盖）。
- frontmatter（可选）：`title` / `date` / `updated` / `description` / `tags` / `category` / `status` / `series`。
- 支持语法：
  - 双链：`[[文章标题]]` 或 `[[文章标题|显示名]]`
  - 文章嵌入卡片：`![[文章标题]]`
  - StackBlitz 交互示例：`![[stackblitz|https://stackblitz.com/...]]`
  - Obsidian Callout：`> [!note] 正文`（类型：note/tip/info/warning/danger/quote）
  - 公式：`$行内$` / `$$块$$`；表格、任务列表、脚注、代码高亮（` ```ts filename="x.ts" {2-3} `）等标准 GFM。

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
