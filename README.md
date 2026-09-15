# notes

`guoxin.space` 站点 **/notes** 板块的**公开数据源仓**（N-T01~N-T06）。

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
