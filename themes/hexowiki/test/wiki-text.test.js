'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  parseWikilinkInner,
  extractWikilinks,
  stripMarkdown,
  extractHeadings,
  extractHeadingsFromHtml,
  firstParagraph,
  stripFrontMatter
} = require('../lib/wiki-text');

test('parseWikilinkInner 支持标题 / 显示文字 / 章节锚点', () => {
  assert.deepEqual(parseWikilinkInner('双链笔记'), { target: '双链笔记', label: null, anchor: null });
  assert.deepEqual(parseWikilinkInner('双链笔记|双向链接'), { target: '双链笔记', label: '双向链接', anchor: null });
  assert.deepEqual(parseWikilinkInner('双链语法#基本语法'), { target: '双链语法', label: null, anchor: '基本语法' });
  assert.deepEqual(parseWikilinkInner('双链语法#基本语法|语法'), { target: '双链语法', label: '语法', anchor: '基本语法' });
  assert.deepEqual(parseWikilinkInner('#本文小节'), { target: '', label: null, anchor: '本文小节' });
  assert.equal(parseWikilinkInner('   '), null);
});

test('extractWikilinks 跳过围栏代码块 / 行内代码 / 嵌入语法', () => {
  const md = [
    '正文 [[甲]] 与 [[乙|乙的显示]]。',
    '',
    '```md',
    '[[代码块里的不算]]',
    '```',
    '',
    '行内 `[[行内代码不算]]` 结束。',
    '',
    '嵌入 ![[图片.png]] 不算双链。',
    '',
    '带章节 [[丙#小节]]。'
  ].join('\n');

  const links = extractWikilinks(md);
  const targets = links.map((link) => link.target);
  assert.deepEqual(targets, ['甲', '乙', '丙']);
  assert.equal(links[1].label, '乙的显示');
  assert.equal(links[2].anchor, '小节');
  assert.ok(links[0].snippet.includes('正文'));
  assert.equal(links[0].raw, '[[甲]]');
});

test('stripMarkdown 去掉语法保留文字', () => {
  const md = '# 标题\n\n**加粗** 和 [链接](https://x) 以及 [[双链|显示文字]]\n\n- 列表项\n> 引用\n\n| a | b |\n|---|---|\n| 1 | 2 |';
  const text = stripMarkdown(md);
  assert.ok(text.includes('标题'));
  assert.ok(text.includes('加粗'));
  assert.ok(text.includes('链接'));
  assert.ok(text.includes('显示文字'));
  assert.ok(text.includes('列表项'));
  assert.ok(!text.includes('**'));
  assert.ok(!text.includes('[['));
});

test('firstParagraph 跳过标题与代码块', () => {
  const md = '# 标题\n\n```js\nconst a = 1;\n```\n\n这是第一段正文，用来做摘要。\n';
  assert.equal(firstParagraph(md), '这是第一段正文，用来做摘要。');
});

test('extractHeadings 只取代码块外的标题', () => {
  const md = '## 一\n\n```\n## 不在目录里\n```\n\n### 二\n';
  const headings = extractHeadings(md);
  assert.deepEqual(headings.map((h) => h.text), ['一', '二']);
  assert.deepEqual(headings.map((h) => h.level), [2, 3]);
});

test('extractHeadingsFromHtml 提取 id 与纯文本', () => {
  const html = '<h2 id="基本语法">基本语法</h2><h3 id="a-1"><a href="#">嵌套 <strong>标签</strong></a></h3>';
  const headings = extractHeadingsFromHtml(html);
  assert.deepEqual(headings, [
    { level: 2, id: '基本语法', text: '基本语法' },
    { level: 3, id: 'a-1', text: '嵌套 标签' }
  ]);
});

test('stripFrontMatter 只去掉开头 YAML', () => {
  assert.equal(stripFrontMatter('---\ntitle: x\n---\n正文'), '正文');
  assert.equal(stripFrontMatter('正文\n---\n不是 front matter'), '正文\n---\n不是 front matter');
});
