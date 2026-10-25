'use strict';

/**
 * HexWiki · 双链图谱模型（纯函数，无 Hexo 依赖）
 *
 * 输入：页面数组（由 scripts/wikilinks.js 从 Hexo 模型采集）
 * 输出：完整 wiki 模型
 *   {
 *     pages, pageByKey, registry, tree, stats, graphJson,
 *     searchIndex, allPages, site, warnings
 *   }
 *
 * 一条“双链”= 页面对另一个页面的引用（可带 #章节 与 |显示文字）。
 * 计数口径：
 *   - out_count / in_count 都按“不同目标页面 / 不同来源页面”去重；
 *   - 同一页面多次指向同一目标时，保留一条并记录 count（出现次数）；
 *   - broken_count 按“不同未解析目标”去重。
 */

const {
  extractWikilinks,
  extractHeadings,
  stripMarkdown,
  stripHtml,
  firstParagraph,
  parseWikilinkInner,
  truncate
} = require('./wiki-text');

const DEFAULT_OPTIONS = {
  slugify: (text) =>
    String(text || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\p{L}\p{N}-]/gu, ''),
  groupOrder: [],
  localGraphRadius: 2,
  localGraphMaxNodes: 48,
  snippetRadius: 110,
  searchTextLimit: 2000,
  summaryLimit: 160
};

function normalizeOptions(options = {}) {
  return Object.assign({}, DEFAULT_OPTIONS, options, {
    groupOrder: Array.isArray(options.groupOrder) ? options.groupOrder : DEFAULT_OPTIONS.groupOrder
  });
}

/* ------------------------------------------------------------------ */
/* 名称归一化与注册表                                                    */
/* ------------------------------------------------------------------ */

function normalizeName(name) {
  return String(name == null ? '' : name)
    .normalize('NFKC')
    .replace(/[“”‘’]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function escapeHtml(text) {
  return String(text == null ? '' : text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(text) {
  return escapeHtml(text);
}

/**
 * 建立名称 → 页面索引。同名冲突保留先到者并记录 warning。
 */
function buildRegistry(pages) {
  const byKey = new Map();
  const byName = new Map();
  const warnings = [];

  const add = (name, page, kind) => {
    const key = normalizeName(name);
    if (!key) return;
    const existing = byName.get(key);
    if (existing && existing !== page) {
      if (existing.key !== page.key) {
        warnings.push({ type: 'ambiguous', name, kind, kept: existing.key, ignored: page.key });
      }
      return;
    }
    byName.set(key, page);
  };

  for (const page of pages) {
    byKey.set(page.key, page);
    add(page.title, page, 'title');
    if (page.slug) add(page.slug, page, 'slug');
    if (page.sourceStem) add(page.sourceStem, page, 'source');
    for (const alias of page.aliases || []) add(alias, page, 'alias');
  }

  return { byKey, byName, warnings };
}

function levenshtein(a, b, max = 3) {
  if (a === b) return 0;
  if (!a || !b) return Math.max(a.length, b.length);
  if (Math.abs(a.length - b.length) > max) return max + 1;

  const prev = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = cur[0];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (cur[j] < rowMin) rowMin = cur[j];
    }
    if (rowMin > max) return max + 1;
    for (let j = 0; j <= b.length; j++) prev[j] = cur[j];
  }
  return prev[b.length];
}

/**
 * 解析双链目标 → 页面。
 * @returns {{page: object|null, candidates: object[]}}
 */
function resolveTarget(registry, target) {
  const name = normalizeName(target);
  if (!name) return { page: null, candidates: [] };

  const exact = registry.byName.get(name);
  if (exact) return { page: exact, candidates: [] };

  // 宽松匹配：忽略空格 / 连字符 / 下划线差异
  const squashed = name.replace(/[\s\-_]+/g, '');
  for (const [key, page] of registry.byName) {
    if (key.replace(/[\s\-_]+/g, '') === squashed) {
      return { page, candidates: [] };
    }
  }

  // 模糊候选（拼写容错）
  const scored = [];
  for (const [key, page] of registry.byName) {
    if (key.length < 2) continue;
    let distance;
    if (key.includes(name) || name.includes(key)) {
      distance = Math.abs(key.length - name.length) / 4;
    } else {
      distance = levenshtein(name, key, 3);
      if (distance > 2) continue;
    }
    scored.push({ page, distance });
  }
  scored.sort((a, b) => a.distance - b.distance);
  const candidates = [];
  const seen = new Set();
  for (const item of scored) {
    if (seen.has(item.page.key)) continue;
    seen.add(item.page.key);
    candidates.push(item.page);
    if (candidates.length >= 3) break;
  }
  return { page: null, candidates };
}

/* ------------------------------------------------------------------ */
/* 页面预处理                                                          */
/* ------------------------------------------------------------------ */

function aliasesOf(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  return String(value)
    .split(/[,，;；]/)
    .map((v) => v.trim())
    .filter(Boolean);
}

function preparePage(raw, opts) {
  const markdown = raw.markdown || '';
  const links = extractWikilinks(markdown, { snippetRadius: opts.snippetRadius });

  const summary = raw.summary || firstParagraph(markdown, opts.summaryLimit);

  const nav = raw.nav || {};
  const parentPath = String(nav.parentPath || '')
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean)
    .join('/');
  const parentParts = parentPath ? parentPath.split('/') : [];

  return {
    key: raw.key,
    title: raw.title,
    slug: raw.slug || '',
    source: raw.source || '',
    sourceStem: raw.sourceStem || '',
    path: raw.path || '',
    url: raw.url || '',
    isPage: !!raw.isPage,
    layout: raw.layout || 'post',
    markdown,
    links,
    headings: extractHeadings(markdown).map((h) => ({ level: h.level, id: '', text: h.text })),
    summary,
    subtitle: raw.subtitle || '',
    aliases: aliasesOf(raw.aliases),
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    categories: Array.isArray(raw.categories) ? raw.categories : [],
    infobox: raw.infobox && typeof raw.infobox === 'object' ? raw.infobox : null,
    date: raw.date || '',
    updated: raw.updated || raw.date || '',
    nav: {
      parentPath,
      label: raw.nav && raw.nav.label ? String(raw.nav.label) : raw.title,
      order: Number.isFinite(Number(raw.nav && raw.nav.order)) ? Number(raw.nav.order) : 100,
      hidden: !!(raw.nav && raw.nav.hidden)
    },
    section: parentParts[0] || '',
    in: [],
    out: [],
    broken: [],
    in_count: 0,
    out_count: 0,
    broken_count: 0,
    graph: { nodes: [], links: [] }
  };
}

/* ------------------------------------------------------------------ */
/* 图构建                                                              */
/* ------------------------------------------------------------------ */

function buildWikiModel(rawPages, options = {}) {
  const opts = normalizeOptions(options);
  const pages = rawPages.map((raw) => preparePage(raw, opts));
  const registry = buildRegistry(pages);
  const pageByKey = new Map(pages.map((p) => [p.key, p]));

  const graphNodes = new Map();
  const graphEdges = new Map(); // `${source}||${target}` -> { source, target, count }
  const missingNodes = new Map(); // normalized raw target -> node

  const addGraphEdge = (sourceKey, targetKey, count) => {
    const id = sourceKey + '||' + targetKey;
    const existing = graphEdges.get(id);
    if (existing) existing.count += count || 1;
    else graphEdges.set(id, { source: sourceKey, target: targetKey, count: count || 1 });
  };

  for (const page of pages) {
    const outByTarget = new Map();
    const brokenByTarget = new Map();

    for (const link of page.links) {
      const targetName = link.target || '';
      const selfAnchor = !targetName && link.anchor;
      const resolved = selfAnchor ? { page, candidates: [] } : resolveTarget(registry, targetName);

      if (resolved.page) {
        // 自引用不进入反链 / 出链 / 图谱（避免页面出现在自己的「链入页面」里）
        if (resolved.page.key === page.key) continue;

        const target = resolved.page;
        const anchorId = link.anchor ? opts.slugify(link.anchor) : '';
        const url = target.url + (anchorId ? '#' + anchorId : '');
        const label = link.label || link.target || (link.anchor ? '#' + link.anchor : '');
        const existing = outByTarget.get(target.key);
        if (existing) {
          existing.count += 1;
        } else {
          outByTarget.set(target.key, {
            key: target.key,
            title: target.title,
            label,
            url,
            exists: true,
            missing: false,
            anchor: link.anchor || '',
            snippet: link.snippet || '',
            count: 1
          });
        }
        addGraphEdge(page.key, target.key, 1);
      } else {
        const brokenKey = normalizeName(targetName) || '#' + normalizeName(link.anchor);
        const label = link.label || targetName || (link.anchor ? '#' + link.anchor : '');
        const existing = brokenByTarget.get(brokenKey);
        if (existing) {
          existing.count += 1;
        } else {
          brokenByTarget.set(brokenKey, {
            raw: link.raw,
            target: targetName,
            label,
            anchor: link.anchor || '',
            candidates: resolved.candidates.slice(0, 3).map((c) => ({ title: c.title, url: c.url })),
            snippet: link.snippet || '',
            count: 1
          });
        }

        let missingNode = missingNodes.get(brokenKey);
        if (!missingNode) {
          missingNode = {
            id: 'missing:' + (brokenKey || 'unknown'),
            title: targetName || link.raw,
            url: null,
            group: '未创建',
            tags: [],
            in: 0,
            out: 0,
            size: 6,
            missing: true
          };
          missingNodes.set(brokenKey, missingNode);
        }
        missingNode.in += 1;
        addGraphEdge(page.key, missingNode.id, 1);
      }
    }

    page.out = [...outByTarget.values()];
    page.out_count = page.out.length;
    page.broken = [...brokenByTarget.values()];
    page.broken_count = page.broken.length;

    for (const out of page.out) {
      const target = pageByKey.get(out.key);
      if (!target) continue;
      target.in.push({
        key: page.key,
        title: page.title,
        url: page.url,
        label: out.label,
        snippet: out.snippet,
        count: out.count
      });
      target.in_count += 1;
    }
  }

  // 反链按来源页去重（同一来源多次引用合并，保留出现次数）
  for (const page of pages) {
    const merged = new Map();
    for (const bl of page.in) {
      const existing = merged.get(bl.key);
      if (existing) existing.count += bl.count || 1;
      else merged.set(bl.key, Object.assign({}, bl, { count: bl.count || 1 }));
    }
    page.in = [...merged.values()].sort((a, b) => a.title.localeCompare(b.title, 'zh-Hans-CN'));
    page.in_count = page.in.length;
    page.out.sort((a, b) => a.title.localeCompare(b.title, 'zh-Hans-CN'));
    page.broken.sort((a, b) => a.label.localeCompare(b.label, 'zh-Hans-CN'));
  }

  // 图谱节点
  for (const page of pages) {
    const degree = page.in_count + page.out_count;
    graphNodes.set(page.key, {
      id: page.key,
      title: page.title,
      url: page.url,
      group: page.section || '未分组',
      tags: page.tags,
      in: page.in_count,
      out: page.out_count,
      size: Math.max(3, Math.min(22, Math.round(3 + degree * 1.15))),
      missing: false
    });
  }
  for (const node of missingNodes.values()) {
    graphNodes.set(node.id, node);
  }

  const graphJson = {
    generated: nowString(),
    nodes: [...graphNodes.values()],
    links: [...graphEdges.values()]
  };

  // 局部关系图（每个页面 2 跳邻居）
  for (const page of pages) {
    page.graph = buildLocalGraph(page, pageByKey, missingNodes, opts);
  }

  const stats = computeStats(pages, opts);
  const tree = buildTree(pages, opts);
  const searchIndex = buildSearchIndex(pages, opts);
  const allPages = buildAllPages(pages);
  const updatedAt = pages
    .map((p) => String(p.updated || ''))
    .filter(Boolean)
    .sort()
    .pop() || '';

  const site = {
    pages: pages.length,
    links: stats.links,
    orphans: stats.orphan_pages.length,
    deadends: stats.deadend_pages.length,
    broken: stats.broken,
    broken_targets: stats.broken_links.length,
    avg_out: stats.avg_out,
    updated_at: updatedAt,
    generated_at: stats.generated_at
  };

  return {
    pages,
    pageByKey,
    registry,
    graphJson,
    stats,
    tree,
    searchIndex,
    allPages,
    site,
    warnings: registry.warnings,
    options: opts
  };
}

/* ------------------------------------------------------------------ */
/* 局部图                                                              */
/* ------------------------------------------------------------------ */

function buildLocalGraph(page, pageByKey, missingNodes, opts) {
  const maxNodes = Math.max(2, Number(opts.localGraphMaxNodes) || 48);
  const radius = Math.max(1, Number(opts.localGraphRadius) || 2);

  const included = new Set([page.key]);
  let frontier = [page.key];

  for (let depth = 0; depth < radius && frontier.length; depth++) {
    const next = [];
    for (const key of frontier) {
      const current = pageByKey.get(key);
      if (!current) continue;
      const neighbors = [];
      for (const out of current.out) if (out.key) neighbors.push(out.key);
      for (const bl of current.in) neighbors.push(bl.key);
      for (const nk of neighbors) {
        if (!pageByKey.has(nk) || included.has(nk)) continue;
        if (included.size >= maxNodes) break;
        included.add(nk);
        next.push(nk);
      }
    }
    frontier = next;
  }

  const edgeMap = new Map();
  for (const key of included) {
    const current = pageByKey.get(key);
    if (!current) continue;
    for (const out of current.out) {
      if (!out.key || !included.has(out.key)) continue;
      const pair = [key, out.key].sort();
      const id = pair.join('||');
      const existing = edgeMap.get(id);
      if (existing) existing.count += out.count || 1;
      else edgeMap.set(id, { source: key, target: out.key, count: out.count || 1 });
    }
  }

  const degree = new Map();
  for (const edge of edgeMap.values()) {
    degree.set(edge.source, (degree.get(edge.source) || 0) + 1);
    degree.set(edge.target, (degree.get(edge.target) || 0) + 1);
  }

  const nodes = [...included]
    .map((key) => pageByKey.get(key))
    .filter(Boolean)
    .map((p) => ({
      id: p.key,
      title: p.title,
      url: p.url,
      group: p.section || '未分组',
      in: p.in_count,
      out: p.out_count,
      size: Math.max(3, Math.min(22, Math.round(3 + (degree.get(p.key) || 0) * 1.8))),
      current: p.key === page.key,
      missing: false
    }));

  // 未创建页面的红色节点（只挂当前页直接断链）
  for (const broken of page.broken) {
    const id = 'missing:' + (normalizeName(broken.target) || 'unknown');
    const node = missingNodes.get(normalizeName(broken.target));
    if (node) {
      nodes.push({
        id: node.id,
        title: node.title,
        url: null,
        group: '未创建',
        in: node.in,
        out: 0,
        size: 5,
        current: false,
        missing: true
      });
      edgeMap.set(page.key + '||' + node.id, { source: page.key, target: node.id, count: 1 });
    }
  }

  return { nodes, links: [...edgeMap.values()] };
}

/* ------------------------------------------------------------------ */
/* 侧栏多级目录树                                                       */
/* ------------------------------------------------------------------ */

function buildTree(pages, opts) {
  const groupOrder = Array.isArray(opts.groupOrder) ? opts.groupOrder : [];
  const orderIndex = new Map(groupOrder.map((name, index) => [String(name), index]));

  const visible = pages.filter((p) => !p.nav.hidden);
  const roots = [];
  const groupMap = new Map();

  const groupRank = (label) => (orderIndex.has(label) ? orderIndex.get(label) : 1000);

  for (const page of visible) {
    const parts = page.nav.parentPath ? page.nav.parentPath.split('/') : [];
    let list = roots;
    let currentPath = '';

    for (const part of parts) {
      currentPath = currentPath ? currentPath + '/' + part : part;
      let group = groupMap.get(currentPath);
      if (!group) {
        group = {
          type: 'group',
          key: 'group:' + currentPath,
          label: part,
          title: part,
          url: null,
          order: groupRank(part),
          depth: currentPath.split('/').length,
          count: 0,
          backlinks: 0,
          active: false,
          open: false,
          children: []
        };
        groupMap.set(currentPath, group);
        list.push(group);
      }
      list = group.children;
    }

    const node = {
      type: 'page',
      key: page.key,
      label: page.nav.label || page.title,
      title: page.title,
      url: page.url,
      order: page.nav.order,
      depth: parts.length + 1,
      backlinks: page.in_count,
      summary: page.summary,
      active: false,
      open: false,
      children: []
    };
    list.push(node);
  }

  // 计算分组内的页面数量
  const countPages = (node) => {
    if (node.type === 'page') return 1;
    let total = 0;
    for (const child of node.children) total += countPages(child);
    node.count = total;
    return total;
  };
  for (const root of roots) countPages(root);

  sortNodes(roots, groupRank);
  return roots;
}

function sortNodes(nodes, groupRank) {
  nodes.sort((a, b) => {
    const orderA = a.type === 'group' ? groupRank(a.label) : a.order;
    const orderB = b.type === 'group' ? groupRank(b.label) : b.order;
    if (orderA !== orderB) return orderA - orderB;
    if (a.type !== b.type) return a.type === 'group' ? -1 : 1;
    return String(a.label).localeCompare(String(b.label), 'zh-Hans-CN');
  });
  for (const node of nodes) if (node.children && node.children.length) sortNodes(node.children, groupRank);
}

/**
 * 标记当前页高亮，以及需要展开的祖先分支（返回轻量副本，避免污染缓存树）。
 */
function decorateTree(tree, activeKey) {
  const clone = (node) => {
    const copy = Object.assign({}, node);
    copy.active = node.type === 'page' && node.key === activeKey;
    copy.open = false;
    copy.children = (node.children || []).map(clone);
    let childActive = false;
    for (const child of copy.children) {
      if (child.active || child.open) childActive = true;
    }
    if (node.type === 'group' && childActive) copy.open = true;
    return copy;
  };
  return tree.map(clone);
}

/* ------------------------------------------------------------------ */
/* 统计                                                                */
/* ------------------------------------------------------------------ */

function computeStats(pages, opts) {
  const totalLinks = pages.reduce((sum, p) => sum + p.out_count, 0);

  const orphanPages = pages.filter((p) => p.in_count === 0);
  const deadendPages = pages.filter((p) => p.out_count === 0);
  const brokenMap = new Map();
  for (const page of pages) {
    for (const broken of page.broken) {
      const key = normalizeName(broken.target) || broken.raw;
      let item = brokenMap.get(key);
      if (!item) {
        item = {
          raw: broken.raw,
          target: broken.target,
          label: broken.label,
          sources: [],
          candidates: broken.candidates,
          count: 0
        };
        brokenMap.set(key, item);
      }
      item.count += broken.count || 1;
      if (!item.sources.some((s) => s.url === page.url)) {
        item.sources.push({ title: page.title, url: page.url });
      }
    }
  }
  const brokenLinks = [...brokenMap.values()];
  const brokenTotal = brokenLinks.reduce((sum, item) => sum + item.count, 0);

  const topIn = pages
    .filter((p) => p.in_count > 0)
    .sort((a, b) => b.in_count - a.in_count || a.title.localeCompare(b.title))
    .slice(0, 10)
    .map((p) => ({ title: p.title, url: p.url, value: p.in_count }));

  const topOut = pages
    .filter((p) => p.out_count > 0)
    .sort((a, b) => b.out_count - a.out_count || a.title.localeCompare(b.title))
    .slice(0, 10)
    .map((p) => ({ title: p.title, url: p.url, value: p.out_count }));

  const sectionMap = new Map();
  for (const page of pages) {
    const name = page.section || '未分组';
    sectionMap.set(name, (sectionMap.get(name) || 0) + 1);
  }
  const sections = [...sectionMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  const tagMap = new Map();
  for (const page of pages) {
    for (const tag of page.tags) tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
  }
  const tags = [...tagMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  const recent = pages
    .slice()
    .sort((a, b) => String(b.updated).localeCompare(String(a.updated)))
    .slice(0, 10)
    .map((p) => ({ title: p.title, url: p.url, updated: p.updated }));

  return {
    pages: pages.length,
    links: totalLinks,
    avg_out: pages.length ? Math.round((totalLinks / pages.length) * 10) / 10 : 0,
    orphans: orphanPages.length,
    deadends: deadendPages.length,
    broken: brokenTotal,
    orphan_pages: orphanPages
      .map((p) => ({ title: p.title, url: p.url, out_count: p.out_count, summary: p.summary }))
      .sort((a, b) => a.title.localeCompare(b.title, 'zh-Hans-CN')),
    deadend_pages: deadendPages
      .map((p) => ({ title: p.title, url: p.url, in_count: p.in_count }))
      .sort((a, b) => a.title.localeCompare(b.title, 'zh-Hans-CN')),
    broken_links: brokenLinks.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
    top_in: topIn,
    top_out: topOut,
    sections,
    tags,
    recent,
    generated_at: nowString()
  };
}

/* ------------------------------------------------------------------ */
/* 搜索索引 / 全部页面                                                   */
/* ------------------------------------------------------------------ */

function buildSearchIndex(pages, opts) {
  return pages.map((page) => ({
    title: page.title,
    url: page.url,
    summary: page.summary,
    tags: page.tags,
    headings: page.headings.map((h) => h.text),
    text: truncate(stripMarkdown(page.markdown), opts.searchTextLimit),
    updated: page.updated,
    section: page.section,
    hidden: page.nav.hidden
  }));
}

function buildAllPages(pages) {
  const groups = new Map();
  for (const page of pages) {
    const first = String(page.title || '').trim().charAt(0);
    let letter;
    if (/[a-z]/i.test(first)) letter = first.toUpperCase();
    else if (/[0-9]/.test(first)) letter = '#';
    else if (/[\u3400-\u9fff]/.test(first)) letter = '汉';
    else letter = '#';

    if (!groups.has(letter)) groups.set(letter, []);
    groups.get(letter).push({
      title: page.title,
      url: page.url,
      in_count: page.in_count,
      out_count: page.out_count,
      summary: page.summary,
      section: page.section
    });
  }
  return [...groups.entries()]
    .sort((a, b) => {
      const rank = (x) => (x === '汉' ? 1 : x === '#' ? 2 : 0);
      if (rank(a[0]) !== rank(b[0])) return rank(a[0]) - rank(b[0]);
      return a[0].localeCompare(b[0]);
    })
    .map(([letter, items]) => ({
      letter,
      pages: items.sort((a, b) => a.title.localeCompare(b.title, 'zh-Hans-CN'))
    }));
}

/* ------------------------------------------------------------------ */
/* HTML 双链替换                                                       */
/* ------------------------------------------------------------------ */

const PROTECTED_RE = /<(pre|code|script|style|textarea|a)\b[^>]*>[\s\S]*?<\/\1>|<!--[\s\S]*?-->/gi;

function linkifyHtml(html, pageKey, model, options = {}) {
  if (!html) return html;
  const opts = normalizeOptions(Object.assign({}, model.options, options));
  const registry = model.registry;
  const currentPage = model.pageByKey.get(pageKey) || null;

  const renderLink = (raw, inner) => {
    const parsed = parseWikilinkInner(inner);
    if (!parsed) return raw;

    const selfAnchor = !parsed.target && parsed.anchor;
    const resolved = selfAnchor
      ? { page: currentPage, candidates: [] }
      : resolveTarget(registry, parsed.target);

    const displayText = parsed.label || parsed.target || (parsed.anchor ? '#' + parsed.anchor : raw);
    const display = escapeHtml(displayText);

    if (resolved.page) {
      const anchorId = parsed.anchor ? opts.slugify(parsed.anchor) : '';
      const href = resolved.page.url + (anchorId ? '#' + anchorId : '');
      const pieces = [];
      if (parsed.anchor) pieces.push('§ ' + parsed.anchor);
      if (parsed.label) pieces.push(parsed.label);
      const title = resolved.page.title + (pieces.length ? '（' + pieces.join(' · ') + '）' : '');
      const isAlias = normalizeName(parsed.target) && normalizeName(parsed.target) !== normalizeName(resolved.page.title);
      const classes = ['wikilink'];
      if (isAlias) classes.push('wikilink--alias');
      if (parsed.anchor) classes.push('wikilink--anchor');
      return (
        '<a class="' + classes.join(' ') + '" href="' + escapeAttr(href) + '"' +
        ' title="' + escapeAttr(title) + '" data-wikilink="' + escapeAttr(raw) + '">' + display + '</a>'
      );
    }

    const missingTitle = '页面尚未创建：' + (parsed.target || raw);
    return (
      '<a class="wikilink wikilink--missing is-missing" href="#" title="' + escapeAttr(missingTitle) + '"' +
      ' data-wikilink="' + escapeAttr(raw) + '" data-missing="1">' + display + '</a>'
    );
  };

  const replaceText = (text) => text.replace(/\[\[([^[\]\n]{1,300})\]\]/g, (raw, inner) => renderLink(raw, inner));

  let result = '';
  let last = 0;
  let m;
  PROTECTED_RE.lastIndex = 0;
  while ((m = PROTECTED_RE.exec(html))) {
    const before = html.slice(last, m.index);
    result += replaceInTextNodes(before, replaceText);
    result += m[0];
    last = m.index + m[0].length;
  }
  result += replaceInTextNodes(html.slice(last), replaceText);
  return result;
}

/** 只在文本节点内替换，跳过标签本身 */
function replaceInTextNodes(segment, replaceText) {
  if (!segment || segment.indexOf('[[') === -1) return segment;
  return segment.replace(/([^<]+)|(<[^>]+>)/g, (chunk) => (chunk.charAt(0) === '<' ? chunk : replaceText(chunk)));
}

/* ------------------------------------------------------------------ */
/* 工具                                                                */
/* ------------------------------------------------------------------ */

function nowString(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) +
    ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds())
  );
}

module.exports = {
  DEFAULT_OPTIONS,
  normalizeName,
  normalizeOptions,
  buildRegistry,
  resolveTarget,
  preparePage,
  buildWikiModel,
  buildLocalGraph,
  buildTree,
  decorateTree,
  computeStats,
  buildSearchIndex,
  buildAllPages,
  linkifyHtml,
  replaceInTextNodes,
  escapeHtml,
  escapeAttr,
  stripHtml,
  truncate
};
