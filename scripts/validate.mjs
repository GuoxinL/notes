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
  });
  const hs = [];
  visit(doc.ast, 'heading', (n) => hs.push(mdastToString(n)));
  const expect = dedupHeadingSlugs(hs);
  const got = doc.headings.map((h) => h.slug);
  if (JSON.stringify(expect) !== JSON.stringify(got)) fail(`${doc.slug}: heading slug 不一致\n  期望=${expect}\n  实际=${got}`);
  if (doc.headings.length !== hs.length) fail(`${doc.slug}: headings.length(${doc.headings.length}) != ast(${hs.length})`);
  if (doc.series) {
    if (doc.series.total == null) fail(`${doc.slug}: series 缺 total`);
    if (doc.series.order == null) fail(`${doc.slug}: series 缺 order`);
  }
}

console.log(errors === 0 ? '\n✓ 全部校验通过' : `\n✗ ${errors} 处校验失败`);
process.exit(errors === 0 ? 0 : 1);
