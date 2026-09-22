#!/usr/bin/env node
/**
 * notes 数据仓构建脚本（N-T01~N-T06）。
 *
 * 输入：content/ 下的 Obsidian 风格 Markdown（支持 [[双链]] / ![[文章嵌入]] / ![[stackblitz|url]] /
 *       > [!callout] 语法，frontmatter 可选）。
 * 输出（build/，站点通过 raw.githubusercontent.com/GuoxinL/notes/<branch>/build 拉取）：
 *   - posts.json        PostsIndex（列表页）
 *   - posts/<id>.json   每篇 ArticleDoc（详情页）
 *   - all.json          全量 ArticleDoc[]（搜索建索引用）
 *   - search-index.json 轻量搜索文档（slug/title/content/tags）
 *   - comments.json     评论容器映射 { "<slug>": <issue_number> }（方案 Phase 2：Issue 存储式自建评论）
 *
 * 依赖均为成熟社区库（不造轮子）：unified / remark-parse / remark-gfm / remark-math /
 * mdast-util-to-string / unist-util-visit / gray-matter。
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, relative, basename, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import matter from 'gray-matter';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { toString as mdastToString } from 'mdast-util-to-string';
import { visit } from 'unist-util-visit';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, '..');
const CONTENT_DIR = join(REPO, 'content');
const BUILD_DIR = join(REPO, 'build');

/**
 * 仓库 slug（owner/repo）：raw 图片 URL 前缀与产物 `sourceRef` 共用，**改仓库名时只改这里**。
 * Obsidian 风格附件目录：`content/<文章>.assets/`，Markdown 里写相对路径，构建期重写为 RAW_BASE 下的绝对 URL。
 */
const REPO_SLUG = 'GuoxinL/notes';
const RAW_BASE = `https://raw.githubusercontent.com/${REPO_SLUG}/main`;

// ── slug 工具（与站点 app/src/lib/notes/slugify.ts 完全一致）──
function slugifyHeading(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}_-]/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
function dedupHeadingSlugs(texts) {
  const used = new Map();
  return texts.map((t) => {
    const base = slugifyHeading(t) || 'section';
    const c = used.get(base) ?? 0;
    used.set(base, c + 1);
    return c === 0 ? base : `${base}-${c + 1}`;
  });
}

/** series 字段鲁棒归一（评审决策 4：存量兼容）。
 *  - 未定义 → undefined（无系列）
 *  - 字符串 "专栏名" → { name, order: 999 }
 *  - 对象 {name, order} → 缺 order 补 999
 * 注意：total 不读取（评审决策 1），由构建期算实际篇数。 */
function normalizeSeries(fm) {
  if (!fm || !fm.series) return undefined;
  const s = fm.series;
  if (typeof s === 'string') return { name: s.trim(), order: 999 };
  if (typeof s === 'object' && s !== null && typeof s.name === 'string') {
    return { name: s.name.trim(), order: Number(s.order) || 999 };
  }
  return undefined;
}

// ── 评论容器（方案 Phase 2）：每篇文章对应 GuoxinL/notes 的一个 Issue 作为评论存储 ──
// token 解析优先级：GITHUB_TOKEN → GH_TOKEN → 本机 gh auth token（用户 owner 登录即具备 notes Issues 写权限）。
// 返回 '' 表示无可用 token（不建容器，留待 Phase 3 Worker 运行期懒建兜底）。
async function resolveGitHubToken() {
  if (process.env.GITHUB_TOKEN) return String(process.env.GITHUB_TOKEN).trim();
  if (process.env.GH_TOKEN) return String(process.env.GH_TOKEN).trim();
  try {
    const t = execFileSync('gh', ['auth', 'token'], { encoding: 'utf8' }).trim();
    if (t) return t;
  } catch { /* gh 未登录或不可用 */ }
  return '';
}

/** 在 GuoxinL/notes 创建评论容器 Issue，返回 issue_number。失败抛错由调用方记录。 */
async function createCommentIssue(token, slug, title) {
  const res = await fetch(`https://api.github.com/repos/${REPO_SLUG}/issues`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'notes-build',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title,
      body:
        `本 Issue 是 guoxin.space /notes 文章「${slug}」的评论容器，由构建脚本自动创建。\n` +
        `读者经站点使用本站 GitHub 账号登录后，评论将写入此 Issue（经 Cloudflare Worker 代理，token 为读者自身 GitHub access_token）。\n` +
        `请勿在本 Issue 下手动评论。`,
      labels: ['comments-container'],
    }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`GitHub API ${res.status}: ${err.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.number;
}

// ── 自定义 remark 插件 ──
// [[target|alias]] → wikiLink ; ![[target|alias]] → wikiEmbed
// 注意：raw markdown 中的 `[[...]]` 会与 remark 的链接/autolink 解析冲突（尤其是 inner 含 URL 时，
// 如 `![[stackblitz|https://...]]` 会被拆成 text + link 节点）。因此 main() 在 parse 前先用占位符
// 保护 `[[...]]`，解析后由本插件把占位符还原为 wikiLink/wikiEmbed 节点（store 为 placeholder→原始信息）。
const WIKI_OPEN = '';
const WIKI_CLOSE = '';
/**
 * 手写递归遍历，把文本节点里的占位符还原为 wikiLink/wikiEmbed 节点。
 * 不依赖 unist-util-visit（其 visit-parents 对该树形会偶发 `children in undefined`），
 * 改为显式索引管理，splice 后同步推进 `i`，安全无越界。
 */
function walkWikiReplace(node, store) {
  if (!node || !Array.isArray(node.children)) return;
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    if (child.type === 'text' && typeof child.value === 'string') {
      const value = child.value;
      const re = new RegExp(`${WIKI_OPEN}(\\d+)${WIKI_CLOSE}`, 'g');
      let m;
      let last = 0;
      const out = [];
      let changed = false;
      while ((m = re.exec(value))) {
        const full = m[0];
        const info = store.get(full);
        if (!info) continue; // 占位符均由 protect 注入并登记，理论上必命中
        if (m.index > last) out.push({ type: 'text', value: value.slice(last, m.index) });
        const [target, alias] = info.inner.split('|').map((s) => s.trim());
        if (info.bang) {
          if (/^stackblitz$/i.test(target)) {
            out.push({ type: 'wikiEmbed', data: { embedType: 'stackblitz', src: alias } });
          } else {
            out.push({ type: 'wikiEmbed', data: { embedType: 'note', target, title: alias || target } });
          }
        } else {
          out.push({ type: 'wikiLink', value: alias || target, data: { target, alias: alias || undefined } });
        }
        last = m.index + full.length;
        changed = true;
      }
      if (changed) {
        if (last < value.length) out.push({ type: 'text', value: value.slice(last) });
        node.children.splice(i, 1, ...out);
        i += out.length - 1; // 跳过已插入的节点，继续后续兄弟
      }
    } else if ((child.type === 'inlineCode' || child.type === 'code') && typeof child.value === 'string') {
      // 代码语境内的 wiki 语法应保留为字面量（恢复 [[...]] 原文，避免误渲染成链接/嵌入）
      let v = child.value;
      let changed = false;
      for (const [k, info] of store) {
        if (v.includes(k)) {
          const lit = (info.bang ? '![[' : '[[') + info.inner + ']]';
          v = v.split(k).join(lit);
          changed = true;
        }
      }
      if (changed) child.value = v;
    } else if (child.children) {
      walkWikiReplace(child, store);
    }
  }
}

function remarkWikiLinks(store) {
  return (tree) => {
    walkWikiReplace(tree, store);
  };
}

// > [!type] 正文 → blockquote.data.callout = type（剥离 [!type] 标记）
function remarkCallout() {
  return (tree) => {
    visit(tree, 'blockquote', (node) => {
      const first = node.children && node.children[0];
      if (!first || first.type !== 'paragraph') return;
      const txt = first.children && first.children.find((c) => c.type === 'text');
      if (!txt || typeof txt.value !== 'string') return;
      const mm = /^\[!(\w+)\]\s*/.exec(txt.value);
      if (!mm) return;
      const type = mm[1].toLowerCase();
      node.data = { ...(node.data || {}), callout: type };
      txt.value = txt.value.slice(mm[0].length);
    });
  };
}

function remarkStripPositions() {
  return (tree) => {
    visit(tree, (n) => {
      delete n.position;
    });
  };
}

/**
 * 图片（方案 A：随数据仓存，构建期重写为 raw 绝对 URL）。
 *
 * 为什么必须重写：正文在**站点域**渲染，Markdown 里的相对路径（`x.webp` / `./<文章>.assets/x.webp`）
 * 会被浏览器解析成站点根路径 → 404。所以构建期统一改写成
 * `https://raw.githubusercontent.com/<owner>/<repo>/main/<仓库内相对路径>`。
 *
 * 不重写的三类：① `http(s)://` 完整外链 ② `data:` 内联 ③ `/` 开头（视为站点根，由站点自己提供）。
 * 相对路径解析基准 = **该 .md 文件所在目录**（Obsidian 风格：附件放同级的 `<文章>.assets/`）。
 * 顺带做两件校验：文件不存在 → 记入 missing；单图超阈值 → 记入 oversize（均只告警，不阻断构建）。
 */
const IMG_WARN_BYTES = 200 * 1024; // 200KB
function remarkImages(ctx) {
  return (tree) => {
    visit(tree, 'image', (node) => {
      const url = String(node.url ?? '');
      if (!url) return;
      if (/^(https?:)?\/\//i.test(url) || url.startsWith('data:') || url.startsWith('/')) return;
      const clean = url.split(/[?#]/)[0];
      let abs;
      try {
        abs = resolve(dirname(ctx.file), decodeURIComponent(clean));
      } catch {
        abs = resolve(dirname(ctx.file), clean);
      }
      const rel = relative(REPO, abs).split(sep).join('/');
      if (rel.startsWith('..') || !existsSync(abs)) {
        ctx.missing.push(`${relative(REPO, ctx.file).split(sep).join('/')} → ${url}`);
        return;
      }
      const size = statSync(abs).size;
      if (size > IMG_WARN_BYTES) {
        ctx.oversize.push(`${rel}（${Math.round(size / 1024)}KB）`);
      }
      node.url = `${RAW_BASE}/${rel.split('/').map(encodeURIComponent).join('/')}`;
    });
  };
}

/** 每个文档独立构建处理器：wikiStore 持有 parse 前的占位符 → 原始 [[...]] 信息。
 *  顺序关键：remarkWikiLinks 必须紧跟 remarkParse，在 remarkGfm/remarkMath 之前把占位符还原为
 *  wikiLink/wikiEmbed 节点——否则 gfm/math 会把 PUA 占位符字符吞掉，导致还原失败。 */
function createProcessor(wikiStore, imgCtx) {
  return unified()
    .use(remarkParse)
    .use(remarkWikiLinks, wikiStore)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkCallout)
    .use(remarkImages, imgCtx)
    .use(remarkStripPositions);
}

// ── git 历史（N-T05/N-T06）：date 取首提交，updated 取末提交，history 取全量 ──
function gitHistory(absFile) {
  try {
    const rel = relative(REPO, absFile);
    // 用数组传参（execFileSync），避免 format 里的 `|` 被 shell 当成管道
    const out = execFileSync(
      'git',
      ['-C', REPO, 'log', '--pretty=format:%ad|%s', '--date=short', '--', rel],
      { encoding: 'utf8' }
    );
    return out
      .split('\n')
      .map((l) => {
        const i = l.indexOf('|');
        return { date: l.slice(0, i), message: l.slice(i + 1) };
      })
      .filter((e) => e.date);
  } catch {
    return [];
  }
}

function firstParagraphText(tree) {
  let text = '';
  visit(tree, 'paragraph', (n) => {
    if (!text) {
      text = mdastToString(n);
      return false;
    }
  });
  return text;
}

function readingTime(tree) {
  const text = mdastToString(tree);
  const cjk = (text.match(/[一-鿿㐀-䶿]/g) || []).length;
  const latin = (text.replace(/[一-鿿㐀-䶿]/g, ' ').match(/[A-Za-z0-9]+/g) || []).length;
  const words = cjk + latin;
  return { minutes: Math.max(1, Math.round(words / 300)), words };
}

function collectHeadings(tree) {
  const hs = [];
  // 注意：不能用 visit(tree,'heading',fn)（字符串 test 在 unist-util-visit 下会异常多算），
  // 改用无 test 的整体遍历 + 内部类型判断，结果稳定。
  visit(tree, (n) => {
    if (n.type !== 'heading') return;
    hs.push({ node: n, depth: Math.min(Math.max(n.depth ?? 2, 1), 4), text: mdastToString(n) });
  });
  const slugs = dedupHeadingSlugs(hs.map((h) => h.text));
  return hs.map((h, i) => {
    h.node.data = { ...(h.node.data || {}), headingId: slugs[i] };
    return { depth: h.depth, text: h.text, slug: slugs[i] };
  });
}

function normalizeTags(t) {
  if (!t) return [];
  if (Array.isArray(t)) return t.map(String);
  return String(t)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

// YAML 可能把 `date: 2026-09-15` 解析成 Date 对象，统一收敛为 YYYY-MM-DD 字符串
function toISODate(v) {
  if (v == null) return undefined;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v);
}
function todayISO() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function collectReferences(tree, knownSlugs) {
  const refs = [];
  visit(tree, (n) => {
    if (n.type === 'wikiLink') {
      const target = n.data?.target;
      refs.push({
        kind: 'internal',
        label: n.value || target,
        target,
        href: `/notes/${encodeURIComponent(target)}/`,
        exists: knownSlugs.has(target),
      });
    } else if (n.type === 'link') {
      refs.push({ kind: 'external', label: mdastToString(n), href: n.url });
    } else if (n.type === 'footnoteReference') {
      refs.push({ kind: 'footnote', label: n.identifier, footnoteId: n.data?.footnoteId || `fn-${n.identifier}` });
    }
  });
  return refs;
}

function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else if (/\.md$/i.test(e)) out.push(p);
  }
  return out;
}

async function main() {
  if (!existsSync(CONTENT_DIR)) {
    console.error('✗ content/ 不存在');
    process.exit(1);
  }
  const files = walk(CONTENT_DIR);

  // ── pass 1：解析 ──
  const raw = files.map((file) => {
    const content = readFileSync(file, 'utf8');
    const { data: fm, content: body } = matter(content);
    // 先用占位符保护 [[...]] / ![[...]]，避免 remark 的链接/autolink 解析把含 URL 的双链拆坏
    const wikiStore = new Map();
    let wi = 0;
    const protectedBody = body.replace(/(!?)\[\[([^\]]+)\]\]/g, (m, bang, inner) => {
      const key = `${WIKI_OPEN}${wi}${WIKI_CLOSE}`;
      wikiStore.set(key, { bang: bang === '!', inner });
      wi += 1;
      return key;
    });
    const imgCtx = { file, missing: [], oversize: [] };
    const proc = createProcessor(wikiStore, imgCtx);
    const tree = proc.runSync(proc.parse(protectedBody));
    const slug = String(fm.title || basename(file, extname(file)));
    return { file, slug, tree, fm, imgCtx };
  });

  // ── N-T02 文件名/标题唯一性校验 ──
  const seen = new Map();
  for (const r of raw) {
    if (seen.has(r.slug)) {
      console.error(
        `✗ 文件名/标题不唯一：「${r.slug}」重复（${seen.get(r.slug)} 与 ${relative(REPO, r.file)}）`
      );
      process.exit(1);
    }
    seen.set(r.slug, relative(REPO, r.file));
  }

  // ── id：slug 稳定哈希（碰撞追加序号）──
  const ids = new Map();
  for (const r of raw) {
    let id = createHash('sha1').update(r.slug).digest('hex').slice(0, 8);
    let n = 1;
    while ([...ids.values()].includes(id)) {
      id = createHash('sha1').update(r.slug + n).digest('hex').slice(0, 8);
      n++;
    }
    ids.set(r.slug, id);
  }
  const knownSlugs = new Set(raw.map((r) => r.slug));

  // ── pass 2：计算文档 ──
  const docs = raw.map((r) => {
    const fm = r.fm;
    const hist = gitHistory(r.file);
    const date = toISODate(fm.date) || (hist.length ? hist[hist.length - 1].date : todayISO());
    const updated = toISODate(fm.updated) || (hist.length ? hist[0].date : date);
    const tags = normalizeTags(fm.tags);
    const headings = collectHeadings(r.tree);
    const description = String(fm.description || firstParagraphText(r.tree) || '');
    const reading = readingTime(r.tree);
    const references = collectReferences(r.tree, knownSlugs);
    const doc = {
      schemaVersion: 1,
      id: ids.get(r.slug),
      slug: r.slug,
      title: String(fm.title || r.slug),
      date,
      updated,
      description,
      tags,
      category: fm.category ? String(fm.category) : undefined,
      status: fm.status || 'evergreen',
      series: normalizeSeries(fm),
      readingTime: reading,
      headings,
      references,
      history: hist,
      ast: r.tree,
    };
    return { doc, file: r.file };
  });

  // ── 系列分组 + prev/next + total(=实际篇数，评审决策 1) ──
  const seriesGroups = new Map();
  for (const { doc } of docs) {
    if (doc.series) {
      if (!seriesGroups.has(doc.series.name)) seriesGroups.set(doc.series.name, []);
      seriesGroups.get(doc.series.name).push(doc);
    }
  }
  for (const [, arr] of seriesGroups) {
    arr.sort((a, b) => a.series.order - b.series.order);
    const count = arr.length;
    arr.forEach((d, i) => {
      d.series.total = count;
      if (i > 0) d.series.prev = { slug: arr[i - 1].slug, title: arr[i - 1].title };
      if (i < count - 1) d.series.next = { slug: arr[i + 1].slug, title: arr[i + 1].title };
    });
  }

  const summaryBySlug = new Map(docs.map(({ doc }) => [doc.slug, doc]));

  // ── pass 3：富化 wikiLink/wikiEmbed + 反链 ──
  const backlinkMap = new Map();
  const pushBacklink = (target, fromDoc) => {
    const sum = summaryBySlug.get(target);
    if (!sum || sum.slug === fromDoc.slug) return; // 跳过自引用 / 不存在目标
    if (!backlinkMap.has(target)) backlinkMap.set(target, []);
    backlinkMap.get(target).push({ slug: fromDoc.slug, title: fromDoc.title, context: firstParagraphText(fromDoc.ast) });
  };
  for (const { doc } of docs) {
    visit(doc.ast, (n) => {
      if (n.type === 'wikiLink') {
        const target = n.data?.target;
        n.data = {
          ...(n.data || {}),
          exists: knownSlugs.has(target),
          permalink: `/notes/${encodeURIComponent(target)}/`,
        };
        pushBacklink(target, doc);
      } else if (n.type === 'wikiEmbed' && n.data?.embedType === 'note') {
        const target = n.data.target;
        const sum = summaryBySlug.get(target);
        n.data = {
          ...(n.data || {}),
          title: sum ? sum.title : n.data.title || target,
          description: sum ? sum.description : '',
          tags: sum ? sum.tags : [],
        };
        pushBacklink(target, doc);
      }
    });
  }
  for (const { doc } of docs) {
    const bl = backlinkMap.get(doc.slug);
    if (bl && bl.length) doc.backlinks = bl;
  }

  // ── 输出 ──
  mkdirSync(BUILD_DIR, { recursive: true });
  mkdirSync(join(BUILD_DIR, 'posts'), { recursive: true });

  const posts = docs.map(({ doc }) => ({
    id: doc.id,
    slug: doc.slug,
    title: doc.title,
    date: doc.date,
    updated: doc.updated,
    description: doc.description,
    tags: doc.tags,
    category: doc.category,
    status: doc.status,
    series: doc.series ? { name: doc.series.name, order: doc.series.order } : undefined,
    readingTime: doc.readingTime,
  }));
  posts.sort((a, b) =>
    a.date < b.date ? 1 : a.date > b.date ? -1 : a.slug > b.slug ? 1 : -1
  );

  const index = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    sourceRef: REPO_SLUG,
    toolchain: { node: process.version.replace(/^v/, ''), builder: 'notes-build' },
    posts,
    slugToId: Object.fromEntries(docs.map(({ doc }) => [doc.slug, doc.id])),
  };

  writeFileSync(join(BUILD_DIR, 'posts.json'), JSON.stringify(index, null, 2));
  for (const { doc } of docs) {
    writeFileSync(join(BUILD_DIR, 'posts', `${doc.id}.json`), JSON.stringify(doc, null, 2));
  }
  writeFileSync(join(BUILD_DIR, 'all.json'), JSON.stringify(docs.map(({ doc }) => doc), null, 2));
  const search = docs.map(({ doc }) => ({
    slug: doc.slug,
    title: doc.title,
    content: mdastToString(doc.ast),
    tags: doc.tags.join(' '),
  }));
  writeFileSync(join(BUILD_DIR, 'search-index.json'), JSON.stringify(search, null, 2));

  // ── 系列聚合输出（build/series.json，评审决策 2）──
  let seriesDef = [];
  try {
    seriesDef = JSON.parse(readFileSync(join(CONTENT_DIR, 'series.json'), 'utf8'));
  } catch {
    seriesDef = [];
  }
  if (!Array.isArray(seriesDef)) seriesDef = [];
  const defByName = new Map(seriesDef.map((c) => [c.name, c]));
  const seriesOut = [...seriesGroups.keys()].map((name) => {
    const arts = seriesGroups.get(name);
    const def = defByName.get(name) ?? {};
    const dates = arts.map((d) => d.updated || d.date).filter(Boolean);
    return {
      name,
      slug: def.slug ?? slugifyHeading(name),
      cover: def.cover,
      summary: def.summary,
      status: def.status ?? 'active',
      order: def.order ?? 999,
      count: arts.length,
      recentDate: dates.length ? dates.sort().at(-1) : '',
      total: arts.length,
    };
  });
  seriesOut.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  writeFileSync(join(BUILD_DIR, 'series.json'), JSON.stringify(seriesOut, null, 2));

  // ── 评论容器映射（build/comments.json，方案 Phase 2）──
  // slug → issue_number。默认仅产出/保留映射、不创建 Issue（安全、可重复 build）；
  // 设 COMMENTS_BUILD_ISSUES=1 且存在可用 GitHub token 时，才为缺失 slug 幂等创建 Issue 容器。
  const commentsPath = join(BUILD_DIR, 'comments.json');
  let commentsMap = {};
  try { commentsMap = JSON.parse(readFileSync(commentsPath, 'utf8')); } catch { commentsMap = {}; }
  if (typeof commentsMap !== 'object' || commentsMap === null) commentsMap = {};
  const wantedSlugs = docs.map(({ doc }) => doc.slug);
  const missingSlugs = wantedSlugs.filter((s) => !(s in commentsMap));
  let createdCount = 0;
  if (process.env.COMMENTS_BUILD_ISSUES === '1' && missingSlugs.length) {
    const tok = await resolveGitHubToken();
    if (!tok) {
      console.warn(`  ⚠ 未配置 GitHub token，跳过建评论容器；以下 ${missingSlugs.length} 篇将由 Phase 3 运行期懒建兜底：`);
      console.warn('    ' + missingSlugs.join('、'));
    } else {
      for (const slug of missingSlugs) {
        const d = summaryBySlug.get(slug);
        const title = `评论 · ${d ? d.title : slug}`;
        try {
          const num = await createCommentIssue(tok, slug, title);
          commentsMap[slug] = num;
          createdCount++;
          console.log(`  + 建评论容器 #${num} ← ${slug}`);
        } catch (e) {
          console.warn(`  ⚠ 建评论容器失败 ${slug}：${e.message}`);
        }
      }
    }
  } else if (missingSlugs.length) {
    console.log(`  · comments.json：${wantedSlugs.length - missingSlugs.length} 篇已有映射，${missingSlugs.length} 篇待建（设 COMMENTS_BUILD_ISSUES=1 执行建容器）`);
  }
  const sortedKeys = Object.keys(commentsMap).sort();
  const sortedMap = {};
  for (const k of sortedKeys) sortedMap[k] = commentsMap[k];
  writeFileSync(commentsPath, JSON.stringify(sortedMap, null, 2) + '\n');
  console.log(`✓ comments.json：${sortedKeys.length} 条映射（本次新建 ${createdCount}）`);

  console.log(
    `✓ 构建完成：${docs.length} 篇文章 → build/（posts.json + posts/*.json + all.json + search-index.json + series.json + comments.json）`
  );

  // ── 图片校验汇总（只告警，不阻断）：缺失 / 超 200KB ──
  const missing = raw.flatMap((r) => r.imgCtx.missing);
  const oversize = [...new Set(raw.flatMap((r) => r.imgCtx.oversize))];
  if (missing.length) {
    console.warn(`⚠ 图片缺失（相对路径找不到文件，已保留原样）：\n  - ${missing.join('\n  - ')}`);
  }
  if (oversize.length) {
    console.warn(`⚠ 图片超过 ${IMG_WARN_BYTES / 1024}KB（建议压缩或改用对象存储）：\n  - ${oversize.join('\n  - ')}`);
  }
}

main().catch((e) => {
  console.error('✗ 构建失败：', e);
  process.exit(1);
});
