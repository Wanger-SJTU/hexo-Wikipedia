'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizeName,
  parseInner,
  rewriteContent,
  buildMappings
} = require('./lib/link-sync-core');

function mapOf(pairs) {
  return new Map(pairs.map(([from, to]) => [normalizeName(from), to]));
}

test('parseInner 保留显示文字与章节锚点', () => {
  assert.deepEqual(parseInner('双链语法'), { target: '双链语法', label: null, anchor: null });
  assert.deepEqual(parseInner('双链语法|语法'), { target: '双链语法', label: '语法', anchor: null });
  assert.deepEqual(parseInner('双链语法#基本语法'), { target: '双链语法', label: null, anchor: '基本语法' });
  assert.deepEqual(parseInner('双链语法#基本语法|语法'), { target: '双链语法', label: '语法', anchor: '基本语法' });
});

test('标题改名：三种写法都替换，且保留 label / anchor', () => {
  const md = 'A [[双链语法]] B [[双链语法|语法]] C [[双链语法#基本语法]]';
  const out = rewriteContent(md, mapOf([['双链语法', '双链语法2']]));
  assert.equal(out.count, 3);
  assert.equal(out.content, 'A [[双链语法2]] B [[双链语法2|语法]] C [[双链语法2#基本语法]]');
});

test('大小写与空格归一化', () => {
  const out = rewriteContent('[[  Zettelkasten  ]] [[zettelkasten]]', mapOf([['Zettelkasten', '卡片盒']]));
  assert.equal(out.count, 2);
  assert.equal(out.content, '[[卡片盒]] [[卡片盒]]');
});

test('代码块与行内代码中的双链不改写', () => {
  const md = [
    '正文 [[双链语法]]',
    '',
    '```md',
    '[[双链语法]]',
    '```',
    '',
    '行内 `[[双链语法]]` 保持',
    '',
    '~~~',
    '[[双链语法]]',
    '~~~'
  ].join('\n');
  const out = rewriteContent(md, mapOf([['双链语法', '新名']]));
  assert.equal(out.count, 1);
  assert.ok(out.content.includes('```md\n[[双链语法]]\n```'));
  assert.ok(out.content.includes('行内 `[[双链语法]]` 保持'));
  assert.ok(out.content.includes('~~~\n[[双链语法]]\n~~~'));
  assert.ok(out.content.startsWith('正文 [[新名]]'));
});

test('不改写 front-matter', () => {
  const md = '---\ntitle: 双链语法\nsummary: 关于 [[双链语法]] 的摘要\n---\n\n正文 [[双链语法]]';
  const out = rewriteContent(md, mapOf([['双链语法', '新名']]));
  assert.equal(out.count, 1);
  assert.ok(out.content.includes('title: 双链语法'));
  assert.ok(out.content.includes('summary: 关于 [[双链语法]] 的摘要'));
  assert.ok(out.content.endsWith('正文 [[新名]]'));
});

test('无关链接保持不变', () => {
  const out = rewriteContent('[[关系图谱]] 和 [[双链语法]]', mapOf([['双链语法', '新名']]));
  assert.equal(out.count, 1);
  assert.equal(out.content, '[[关系图谱]] 和 [[新名]]');
});

test('buildMappings：同一路径标题改名', () => {
  const prev = { 'source/_posts/a.md': { title: '阿尔法', stem: 'a', hash: 'h1', aliases: [] } };
  const next = { 'source/_posts/a.md': { title: '阿尔法2', stem: 'a', hash: 'h2', aliases: [] } };
  const { mappings } = buildMappings(prev, next);
  assert.equal(mappings.get(normalizeName('阿尔法')), '阿尔法2');
});

test('buildMappings：文件重命名（标题不变）映射旧文件 stem', () => {
  const prev = { 'source/_posts/old-name.md': { title: '阿尔法', stem: 'old-name', hash: 'h1', aliases: [] } };
  const next = { 'source/_posts/new-name.md': { title: '阿尔法', stem: 'new-name', hash: 'h1', aliases: [] } };
  const { mappings } = buildMappings(prev, next);
  assert.equal(mappings.get(normalizeName('old-name')), 'new-name');
  // 标题没变，不应产生 title 映射
  assert.equal(mappings.has(normalizeName('阿尔法')), false);
});

test('buildMappings：重命名 + 标题同时变化（按内容哈希配对）', () => {
  const prev = { 'source/_posts/old.md': { title: '旧标题', stem: 'old', hash: 'same', aliases: [] } };
  const next = { 'source/_posts/new.md': { title: '新标题', stem: 'new', hash: 'same', aliases: [] } };
  const { mappings } = buildMappings(prev, next);
  assert.equal(mappings.get(normalizeName('旧标题')), '新标题');
  assert.equal(mappings.get(normalizeName('old')), 'new');
});

test('buildMappings：无变化不产生映射', () => {
  const snap = { 'source/_posts/a.md': { title: 'A', stem: 'a', hash: 'h', aliases: [] } };
  assert.equal(buildMappings(snap, snap).mappings.size, 0);
});
