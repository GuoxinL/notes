#!/usr/bin/env node
/**
 * 校验 build/ 产出严格对齐站点 app/src/lib/notes/types.ts 的 ArticleDoc / PostsIndex 契约。
 * 用法：node scripts/validate.mjs
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { visit } from 'unist-util-visit';
import { toString as mdastToString } from 'mdast-util-to-string';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BUILD = join(__dirname, '..', 'build');

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

let errors = 0;
const fail = (m) => {
  console.error('  ✗', m);
  errors++;
};
const ok = (m) => console.log('  ✓', m);

const index = JSON.parse(readFileSync(join(BUILD, 'posts.json'), 'utf8'));
if (index.schemaVersion !== 1) fail('posts.json schemaVersion !== 1');
else ok('posts.json schemaVersion = 1');
if (!index.posts?.length) fail('posts.json 无 posts');
else ok(`posts.json 含 ${index.posts.length} 篇`);
if (!index.slugToId || typeof index.slugToId !== 'object') fail('posts.json 缺 slugToId');
for (const p of index.posts) {
  if (!p.id || !p.slug || !p.title) fail(`post 缺字段 id/slug/title: ${JSON.stringify(p)}`);
  if (index.slugToId[p.slug] !== p.id) fail(`slugToId[${p.slug}] !== ${p.id}`);
}

const all = JSON.parse(readFileSync(join(BUILD, 'all.json'), 'utf8'));
const allById = new Map(all.map((d) => [d.id, d]));

const postFiles = readdirSync(join(BUILD, 'posts'));
for (const f of postFiles) {
  if (!f.endsWith('.json')) continue;
  const doc = JSON.parse(readFileSync(join(BUILD, 'posts', f), 'utf8'));
  if (!allById.has(doc.id)) fail(`posts/${f} 不在 all.json 中`);
  for (const k of ['schemaVersion', 'id', 'slug', 'title', 'date', 'tags', 'status', 'readingTime', 'headings', 'references', 'ast']) {
    if (doc[k] === undefined) fail(`${doc.slug}: 缺字段 ${k}`);
  }
  if (doc.schemaVersion !== 1) fail(`${doc.slug}: schemaVersion !== 1`);
  let hasPos = false;
  visit(doc.ast, (n) => {
    if (n.position) hasPos = true;
  });
  if (hasPos) fail(`${doc.slug}: ast 仍含 position`);
  visit(doc.ast, (n) => {
    if (n.type === 'wikiLink' && !n.data?.target) fail(`${doc.slug}: wikiLink 缺 data.target`);
    if (n.type === 'wikiEmbed' && !n.data?.embedType) fail(`${doc.slug}: wikiEmbed 缺 data.embedType`);
    // 图片：构建期应已把相对路径重写为 raw 绝对 URL；漏重写会让浏览器按站点根解析 → 404
    if (n.type === 'image') {
      const u = String(n.url ?? '');
      if (!/^https?:\/\//i.test(u) && !u.startsWith('data:')) {
        fail(`${doc.slug}: 图片 URL 未重写为绝对地址 → ${u}（应写相对路径交给构建期重写，或写完整 URL）`);
      }
    }
  });
  const hs = [];
  // 不能用 visit(tree,'heading',fn)（mist-util-visit 字符串 test 异常多算），
  // 与 build.mjs 一致：无 test 整体遍历 + 内部类型判断。
  visit(doc.ast, (n) => {
    if (n.type === 'heading') hs.push(mdastToString(n));
  });
  const expect = dedupHeadingSlugs(hs);
  const got = doc.headings.map((h) => h.slug);
  if (JSON.stringify(expect) !== JSON.stringify(got)) fail(`${doc.slug}: heading slug 不一致\n  期望=${expect}\n  实际=${got}`);
  if (doc.headings.length !== hs.length) fail(`${doc.slug}: headings.length(${doc.headings.length}) != ast(${hs.length})`);
  if (doc.series) {
    if (doc.series.total == null) fail(`${doc.slug}: series 缺 total`);
    if (doc.series.order == null) fail(`${doc.slug}: series 缺 order`);
  }
}

// ── series.json（评审决策 2）──
const VALID_STATUS = new Set(['active', 'completed', 'wip', 'archived']);
try {
  const series = JSON.parse(readFileSync(join(BUILD, 'series.json'), 'utf8'));
  if (!Array.isArray(series)) fail('series.json 不是数组');
  else {
    ok(`series.json 含 ${series.length} 个专栏`);
    const seen = new Set();
    for (const c of series) {
      if (!c.name) fail(`series 条目缺 name: ${JSON.stringify(c)}`);
      if (seen.has(c.name)) fail(`series name 重复: ${c.name}`);
      seen.add(c.name);
      if (!c.slug) fail(`series ${c.name} 缺 slug`);
      if (c.status != null && !VALID_STATUS.has(c.status)) fail(`series ${c.name} status 非法: ${c.status}`);
      if (typeof c.count !== 'number' || c.count < 0) fail(`series ${c.name} count 非法`);
      if (typeof c.total !== 'number' || c.total < 0) fail(`series ${c.name} total 非法`);
      if (c.total !== c.count) fail(`series ${c.name} total(${c.total}) != count(${c.count})（评审决策 1：恒相等）`);
      // 反向校验：series.name 必须在文章中存在（否则是孤儿专栏）
      const hasArticle = index.posts.some((p) => p.series?.name === c.name);
      if (!hasArticle) fail(`series ${c.name} 在文章中无对应系列（孤儿专栏）`);
    }
    // 反向校验：文章 series.name 都应被 series.json 富集（warning 不阻断）
    for (const p of index.posts) {
      if (p.series && !seen.has(p.series.name)) {
        console.warn(`  ⚠ 文章 series.name="${p.series.name}" 未在 series.json 登记（将出默认卡片）`);
      }
    }
  }
} catch (e) {
  fail(`series.json 读取/解析失败: ${e.message}`);
}

console.log(errors === 0 ? '\n✓ 全部校验通过' : `\n✗ ${errors} 处校验失败`);
process.exit(errors === 0 ? 0 : 1);
