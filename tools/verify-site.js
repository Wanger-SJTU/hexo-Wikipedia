'use strict';
/* HexWiki 构建产物验收：路由 / JSON 一致性 / 双链 / 内链可达 / 静态资源
 * 用法：node tools/verify-site.js   （需先 npm run build）
 */
const fs = require('fs');
const path = require('path');

const PUB = path.resolve(__dirname, '..', 'public');
const problems = [];
const checks = [];
const ok = (name, detail) => checks.push(['OK ', name, detail || '']);
const bad = (name, detail) => { problems.push(name + (detail ? ' — ' + detail : '')); checks.push(['ERR', name, detail || '']); };

const read = (rel) => fs.readFileSync(path.join(PUB, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(PUB, rel));
const json = (rel) => {
  try { return JSON.parse(read(rel)); } catch (err) { bad('JSON 解析失败 ' + rel, err.message); return null; }
};

/* ---------- 1. 路由存在性 ---------- */
const routes = [
  'index.html', 'archives/index.html',
  'graph/index.html', 'stats/index.html', 'wiki/all/index.html', 'tags/index.html',
  'wiki-graph.json', 'wiki-search.json', 'wiki-stats.json',

];
for (const rel of routes) {
  if (exists(rel)) ok('路由存在', rel);
  else bad('路由缺失', rel);
}

/* ---------- 1b. 标签索引 ---------- */
if (exists('tags/index.html')) {
  const tagHtml = read('tags/index.html');
  const tagCount = (tagHtml.match(/data-tag-name=/g) || []).length;
  if (!/tag-cloud/.test(tagHtml) || !tagCount) bad('标签页未渲染标签');
  else ok('标签索引', tagCount + ' 项');
  const tagRoot = path.join(PUB, 'tags');
  const tagDirs = fs.readdirSync(tagRoot).filter((name) => {
    try { return fs.statSync(path.join(tagRoot, name)).isDirectory(); } catch (err) { return false; }
  });
  if (!tagDirs.length) bad('没有生成任何标签页');
  else ok('标签页数量', String(tagDirs.length));
}

/* ---------- 2. JSON 一致性 ---------- */
const graph = json('wiki-graph.json');
const stats = json('wiki-stats.json');
const search = json('wiki-search.json');
if (graph && stats && search) {
  const nodeIds = new Set(graph.nodes.map((n) => n.id));
  const missingNodes = graph.nodes.filter((n) => n.missing);
  ok('图谱节点', graph.nodes.length + '（未创建 ' + missingNodes.length + '）');
  ok('图谱边', graph.links.length);

  const badEdges = graph.links.filter((l) => !nodeIds.has(l.source) || !nodeIds.has(l.target));
  if (badEdges.length) bad('图谱存在悬空边', JSON.stringify(badEdges.slice(0, 3)));
  else ok('图谱边端点均存在');

  const pages = graph.nodes.filter((n) => !n.missing);
  ok('页面节点', pages.length);
  if (stats.pages !== pages.length) bad('stats.pages 与图谱页面节点数不一致', stats.pages + ' vs ' + pages.length);
  else ok('页面数一致', String(pages.length));

  // 由边反推每个页面的 distinct 入/出度，与节点 in/out 对照
  const inSet = new Map();
  const outSet = new Map();
  for (const l of graph.links) {
    if (!outSet.has(l.source)) outSet.set(l.source, new Set());
    outSet.get(l.source).add(l.target);
    if (!inSet.has(l.target)) inSet.set(l.target, new Set());
    inSet.get(l.target).add(l.source);
  }
  let degreeMismatch = 0;
  for (const node of pages) {
    const inDeg = [...(inSet.get(node.id) || new Set())].filter((id) => nodeIds.has(id) && !graph.nodes.find((n) => n.id === id).missing).length;
    const outDeg = [...(outSet.get(node.id) || new Set())].filter((id) => nodeIds.has(id) && !graph.nodes.find((n) => n.id === id).missing).length;
    if (inDeg !== node.in) { degreeMismatch++; if (degreeMismatch <= 3) bad('入度不一致 ' + node.title, inDeg + ' vs ' + node.in); }
    if (outDeg !== node.out) { degreeMismatch++; if (degreeMismatch <= 3) bad('出度不一致 ' + node.title, outDeg + ' vs ' + node.out); }
  }
  if (!degreeMismatch) ok('图谱度数一致');

  const linkSum = pages.reduce((s, n) => s + n.out, 0);
  if (linkSum !== stats.links) bad('stats.links 与度数合计不一致', linkSum + ' vs ' + stats.links);
  else ok('链接总数一致', String(stats.links));

  if (!stats.orphan_pages.some((p) => p.title.includes('孤立'))) bad('统计页未识别孤立页面示例');
  else ok('孤立页面统计', stats.orphan_pages.map((p) => p.title).join(', '));
  if (stats.broken_links.length !== 2) bad('断链目标数应为 2', String(stats.broken_links.length));
  else ok('断链目标', stats.broken_links.map((b) => b.label).join(', '));
  if (search.length !== pages.length) bad('搜索索引条数与页面数不一致', search.length + ' vs ' + pages.length);
  else ok('搜索索引条数', String(search.length));
  for (const item of search) {
    if (!item.url) bad('搜索条目缺少 url', item.title);
  }
}

/* ---------- 3. 单页 HTML 检查 ---------- */
const postDirs = fs.existsSync(path.join(PUB, 'wiki'))
  ? fs.readdirSync(path.join(PUB, 'wiki')).filter((name) => {
      if (name === 'all') return false;
      const rel = path.join(PUB, 'wiki', name, 'index.html');
      if (!fs.existsSync(rel)) return false;
      // 跳过重定向页等非文章页面
      return /article__title/.test(read(path.relative(PUB, rel)));
    })
  : [];
ok('条目页数量', String(postDirs.length));
if (postDirs.length !== 20) bad('条目页数量不是 20', String(postDirs.length));

const hrefTargets = new Set();
let htmlChecks = 0;
for (const dir of postDirs) {
  const rel = 'wiki/' + dir + '/index.html';
  const html = read(rel);
  const fail = (msg) => bad(rel + ': ' + msg);

  if (!/<h1 class="article__title"/.test(html)) fail('缺少 h1.article__title');
  if (!/class="article__content"/.test(html)) fail('缺少 article__content');
  if (!/id="backlinks"/.test(html)) fail('缺少 backlinks 面板');
  if (!/id="outlinks"/.test(html)) fail('缺少 outlinks 面板');
  if (!/nav-tree__link is-active/.test(html) && !dir.includes('orphan')) fail('侧栏无当前页高亮');
  if (!/article__categories/.test(html)) fail('缺少分类框');
  if (!/link-stats/.test(html)) fail('缺少链接统计条');
  if (!/id="wiki-local-graph"/.test(html)) fail('缺少局部图谱数据');
  if (/<%|%>/.test(html)) fail('残留 EJS 标记');

  // 正文里不应再有未转换的双链（排除 pre/code 后剩余）
  const stripped = html
    .replace(/<pre[\s\S]*?<\/pre>/gi, '')
    .replace(/<code[\s\S]*?<\/code>/gi, '');
  if (/\[\[[^\]]+\]\]/.test(stripped)) fail('正文残留未解析双链');

  // 局部图 JSON 可解析
  const m = /<script type="application\/json" id="wiki-local-graph">([\s\S]*?)<\/script>/.exec(html);
  if (!m) fail('局部图 JSON script 缺失');
  else {
    try { const g = JSON.parse(m[1]); if (!g.nodes.length) fail('局部图节点为空'); } catch (err) { fail('局部图 JSON 非法: ' + err.message); }
  }

  // 收集内链
  const re = /href="(\/[^"#]*)/g;
  let h;
  while ((h = re.exec(html))) {
    const href = h[1];
    if (!href || href.startsWith('//')) continue;
    if (/\.(json|xml|css|js|svg|png|jpg|webp|ico)$/.test(href)) hrefTargets.add(href);
    else hrefTargets.add(href);
  }
  htmlChecks++;
}
if (!problems.length) ok('条目页结构检查', htmlChecks + ' 页');

/* ---------- 4. 内链可达性 ---------- */
const toPublic = (href) => {
  // 去掉 ?v= 之类的查询串与 hash，再映射到 public/ 下的文件
  const clean = String(href).split('#')[0].split('?')[0];
  let p = decodeURIComponent(clean.replace(/^\//, ''));
  p = p.replace(/^\/+/, '');
  if (!p || p.endsWith('/')) p += 'index.html';
  return p;
};
let broken = [];
for (const href of hrefTargets) {
  if (href.startsWith('/wiki-graph') || href.startsWith('/wiki-search') || href.startsWith('/wiki-stats')) continue;
  const rel = toPublic(href);
  if (!exists(rel)) broken.push(href);
}
if (broken.length) bad('内链目标不存在', broken.slice(0, 10).join(', ') + (broken.length > 10 ? ' …共' + broken.length : ''));
else ok('内链可达', hrefTargets.size + ' 个目标');

/* ---------- 5. 静态资源 ---------- */
const cssMatch = /<link[^>]+href="([^"]+\.css[^"]*)"/.exec(read('wiki/' + (postDirs[0] || 'intro') + '/index.html'));
if (cssMatch) {
  if (exists(toPublic(cssMatch[1]))) ok('主题 CSS', cssMatch[1]);
  else bad('主题 CSS 缺失', cssMatch[1]);
} else bad('页面未引入 CSS');

/* ---------- 6. 输出 ---------- */
console.log(checks.map(([s, n, d]) => s + ' ' + n + (d ? '  (' + d + ')' : '')).join('\n'));
console.log('\n' + (problems.length ? '❌ 失败 ' + problems.length + ' 项:\n- ' + problems.join('\n- ') : '✅ 全部通过'));
process.exit(problems.length ? 1 : 0);
