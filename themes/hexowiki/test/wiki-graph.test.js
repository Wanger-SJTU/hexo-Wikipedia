'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildWikiModel,
  decorateTree,
  linkifyHtml,
  normalizeName,
  resolveTarget
} = require('../lib/wiki-graph');

/** 造一个最小页面集合（与 scripts/wikilinks.js 采集的形状一致） */
function fixture() {
  const make = (overrides) =>
    Object.assign(
      {
        key: 'x',
        title: 'X',
        slug: 'x',
        source: '_posts/x.md',
        sourceStem: 'x',
        path: 'wiki/x/',
        url: '/wiki/x/',
        isPage: false,
        layout: 'post',
        markdown: '',
        summary: '',
        subtitle: '',
        aliases: [],
        tags: [],
        categories: [],
        infobox: null,
        date: '2026-10-01',
        updated: '2026-10-01',
        nav: { parentPath: '', label: '', order: 100, hidden: false }
      },
      overrides
    );

  return [
    make({
      key: 'guide/a',
      title: '页面 A',
      slug: 'a',
      source: '_posts/a.md',
      sourceStem: 'guide/a',
      path: 'wiki/a/',
      url: '/wiki/a/',
      nav: { parentPath: '指南', label: '页面 A', order: 10, hidden: false },
      aliases: ['A 别名'],
      markdown: [
        '## 第一节',
        '',
        '这是 A，链到 [[页面 B]]，又一次 [[页面 B|B 的别名]]，还有断链 [[不存在的页面]]。',
        '',
        '也链到别名 [[A 别名]]。'
      ].join('\n')
    }),
    make({
      key: 'guide/b',
      title: '页面 B',
      slug: 'b',
      source: '_posts/b.md',
      sourceStem: 'guide/b',
      path: 'wiki/b/',
      url: '/wiki/b/',
      nav: { parentPath: '指南/进阶', label: '页面 B', order: 20, hidden: false },
      markdown: 'B 链回 [[页面 A#第一节]]。\n\n```\n[[不应解析]]\n```'
    }),
    make({
      key: 'orphan',
      title: '孤立页面',
      slug: 'orphan',
      source: '_posts/orphan.md',
      sourceStem: 'orphan',
      path: 'wiki/orphan/',
      url: '/wiki/orphan/',
      markdown: '没有入链也没有出链。',
      nav: { parentPath: '', label: '孤立页面', order: 100, hidden: true }
    }),
    make({
      key: 'tail',
      title: '尾页',
      slug: 'tail',
      source: '_posts/tail.md',
      sourceStem: 'tail',
      path: 'wiki/tail/',
      url: '/wiki/tail/',
      markdown: '只有入链，没有出链。',
      nav: { parentPath: '参考', label: '尾页', order: 10, hidden: false }
    })
  ];
}

function model() {
  return buildWikiModel(fixture(), { groupOrder: ['指南', '参考'] });
}

test('双链解析：去重、计数、别名、断链、代码块跳过', () => {
  const state = model();
  const a = state.pageByKey.get('guide/a');

  // A → B（两次，去重为 1 条并记录 count=2）；断链单独记录
  assert.equal(a.out_count, 1, '出链按目标去重');
  const toB = a.out.find((link) => link.key === 'guide/b');
  assert.ok(toB);
  assert.equal(toB.count, 2);
  assert.equal(a.broken_count, 1);
  assert.equal(a.broken[0].target, '不存在的页面');
  assert.equal(a.broken[0].count, 1);

  // 别名 [[A 别名]] → 解析到自身
  assert.equal(state.pageByKey.get('guide/b').broken_count, 0, '代码块内的双链不应解析');
});

test('反链：B 页的入链包含 A，且带上下文摘要', () => {
  const state = model();
  const b = state.pageByKey.get('guide/b');
  assert.equal(b.in_count, 1);
  assert.equal(b.in[0].key, 'guide/a');
  assert.ok(b.in[0].snippet.includes('页面 B') || b.in[0].snippet.includes('B 的别名'));

  // B → A#第一节，锚点应拼进 url
  const toA = state.pageByKey.get('guide/b').out[0];
  assert.equal(toA.key, 'guide/a');
  assert.equal(toA.url, '/wiki/a/#第一节');
});

test('统计：页面 / 链接 / 孤立 / 断链 / 排行榜', () => {
  const state = model();
  assert.equal(state.site.pages, 4);
  // 「孤立页面」「尾页」都没有入链；孤立 = 无入链页面（Wikipedia「孤立条目」口径）
  assert.equal(state.site.orphans, 2);
  assert.ok(state.stats.orphan_pages.some((page) => page.title === '孤立页面'));
  assert.equal(state.site.broken, 1);
  assert.equal(state.stats.broken_links[0].target, '不存在的页面');
  assert.equal(state.stats.broken_links[0].sources[0].url, '/wiki/a/');
  assert.equal(state.site.links, 2, '自引用不应计入链接总数');
  assert.ok(state.stats.top_in.length >= 1);
});

test('图谱 JSON：包含未创建节点与去重边', () => {
  const state = model();
  const missing = state.graphJson.nodes.filter((node) => node.missing);
  assert.equal(missing.length, 1);
  assert.equal(missing[0].title, '不存在的页面');

  const edge = state.graphJson.links.find((link) => link.source === 'guide/a' && link.target === 'guide/b');
  assert.ok(edge);
  assert.equal(edge.count, 2);
});

test('侧栏树：多级分组、排序、隐藏页、活跃展开', () => {
  const state = model();
  assert.deepEqual(state.tree.map((node) => node.label), ['指南', '参考']);
  const guide = state.tree[0];
  assert.equal(guide.type, 'group');
  assert.equal(guide.count, 2);
  assert.equal(guide.children[0].label, '页面 A');
  assert.equal(guide.children[1].type, 'group');
  assert.equal(guide.children[1].label, '进阶');

  const decorated = decorateTree(state.tree, 'guide/b');
  assert.equal(decorated[0].open, true, '祖先分组应展开');
  assert.equal(decorated[0].children[1].open, true, '直接父分组应展开');
  assert.equal(decorated[0].children[1].children[0].active, true);
});

test('局部图：2 跳邻居，包含当前页与未创建节点', () => {
  const state = model();
  const graph = state.pageByKey.get('guide/a').graph;
  const ids = graph.nodes.map((node) => node.id);
  assert.ok(ids.includes('guide/a'));
  assert.ok(ids.includes('guide/b'));
  assert.ok(ids.some((id) => id.startsWith('missing:')));
  assert.ok(graph.links.length >= 2);
  assert.equal(graph.nodes.find((node) => node.id === 'guide/a').current, true);
});

test('linkifyHtml：解析双链、红链、跳过 code/pre 与标签属性', () => {
  const state = model();
  const html = [
    '<p>看 [[页面 B|B 的别名]] 与 [[不存在的页面]]。</p>',
    '<pre><code>[[页面 B]]</code></pre>',
    '<p title="[[页面 B]]">行内 <code>[[页面 B]]</code> 保留</p>'
  ].join('\n');

  const out = linkifyHtml(html, 'guide/a', state);

  assert.ok(out.includes('class="wikilink"'));
  assert.ok(out.includes('href="/wiki/b/"'));
  assert.ok(out.includes('B 的别名'));
  assert.ok(out.includes('wikilink--missing is-missing'));
  assert.ok(out.includes('<pre><code>[[页面 B]]</code></pre>'), 'pre/code 内不应替换');
  assert.ok(out.includes('<code>[[页面 B]]</code>'));
  assert.ok(!out.includes('title="<a'), '标签属性内不应替换');
});

test('linkifyHtml：别名与章节锚点', () => {
  const state = model();
  const html = '<p>[[A 别名]] 和 [[页面 A#第一节]]</p>';
  const out = linkifyHtml(html, 'guide/b', state);
  assert.ok(out.includes('wikilink--alias'));
  assert.ok(out.includes('href="/wiki/a/"'));
  assert.ok(out.includes('href="/wiki/a/#第一节"'));
});

test('resolveTarget：精确、宽松、大小写、模糊候选', () => {
  const state = model();
  assert.equal(resolveTarget(state.registry, '页面 B').page.key, 'guide/b');
  assert.equal(resolveTarget(state.registry, '页面Ｂ').page.key, 'guide/b', '全角字符经 NFKC 归一化后可解析');
  assert.equal(resolveTarget(state.registry, ' 页面 b ').page.key, 'guide/b');
  const fuzzy = resolveTarget(state.registry, '页面 Bb');
  assert.equal(fuzzy.page, null);
  assert.ok(fuzzy.candidates.length >= 1);
});

test('normalizeName 归一化全角/空格', () => {
  assert.equal(normalizeName('  页面　B '), '页面 b');
  assert.equal(normalizeName('ＡＢＣ'), 'abc');
});

test('搜索索引包含正文纯文本与标题', () => {
  const state = model();
  const item = state.searchIndex.find((entry) => entry.title === '页面 A');
  assert.ok(item.text.includes('这是 A'));
  assert.ok(!item.text.includes('##'));
  assert.ok(item.headings.includes('第一节'));
});
