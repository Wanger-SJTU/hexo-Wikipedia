'use strict';

/**
 * HexWiki · Hexo 插件入口
 *
 * 职责：
 *  1. before_generate(priority 1)：在 Hexo 渲染正文之前扫描 posts/pages，
 *     建立页面注册表、双链索引、反链、断链、关系图、侧栏树、统计、搜索索引。
 *  2. after_post_render(priority 5)：把渲染后 HTML 中的 [[双链]] 替换成
 *     <a class="wikilink …">，并从 HTML 中提取标题（带 marked 生成的 id）。
 *  3. 注册模板 helper（wiki_nav / wiki_page / wiki_in / wiki_out / wiki_broken /
 *     wiki_headings / wiki_local_graph / wiki_site / wiki_stats / wiki_recent /
 *     wiki_all_pages / wiki_urls / wiki_breadcrumb / wiki_json / wiki_local_graph_json）。
 *  4. 生成 /wiki-graph.json、/wiki-search.json、/wiki-stats.json 以及 /graph/、
 *     /stats/、/wiki/all/ 三个页面路由。
 *
 * 纯逻辑在 ../lib/wiki-text.js 与 ../lib/wiki-graph.js，可脱离 Hexo 单测。
 */

const { slugize } = require('hexo-util');

const {
  stripFrontMatter,
  stripMarkdown,
  firstParagraph,
  extractHeadingsFromHtml,
  truncate
} = require('../lib/wiki-text');

const {
  buildWikiModel,
  buildSearchIndex,
  decorateTree,
  linkifyHtml,
  escapeHtml
} = require('../lib/wiki-graph');

const DEFAULT_ROUTES = {
  graph: 'graph',
  stats: 'stats',
  all: 'wiki/all',
  graphJson: 'wiki-graph.json',
  searchJson: 'wiki-search.json',
  statsJson: 'wiki-stats.json'
};

/* ------------------------------------------------------------------ */
/* 配置                                                                */
/* ------------------------------------------------------------------ */

function num(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function themeOptions(hexo) {
  const themeConfig = (hexo.theme && hexo.theme.config) || {};
  const wikiConfig = themeConfig.wiki || {};
  const navConfig = themeConfig.nav || {};
  const sidebarConfig = themeConfig.sidebar || {};
  const root = hexo.config.root || '/';

  const groupOrder =
    (Array.isArray(sidebarConfig.order) && sidebarConfig.order) ||
    (Array.isArray(navConfig.order) && navConfig.order) ||
    (Array.isArray(wikiConfig.group_order) && wikiConfig.group_order) ||
    [];

  const routes = {
    graph: String(wikiConfig.graph_route || DEFAULT_ROUTES.graph).replace(/^\/+|\/+$/g, ''),
    stats: String(wikiConfig.stats_route || DEFAULT_ROUTES.stats).replace(/^\/+|\/+$/g, ''),
    all: String(wikiConfig.all_route || DEFAULT_ROUTES.all).replace(/^\/+|\/+$/g, ''),
    graphJson: String(wikiConfig.graph_json_route || DEFAULT_ROUTES.graphJson).replace(/^\/+/, ''),
    searchJson: String(wikiConfig.search_json_route || DEFAULT_ROUTES.searchJson).replace(/^\/+/, ''),
    statsJson: String(wikiConfig.stats_json_route || DEFAULT_ROUTES.statsJson).replace(/^\/+/, '')
  };

  return {
    root,
    groupOrder: groupOrder.map(String),
    localGraphRadius: num(wikiConfig.local_graph_radius, 2),
    localGraphMaxNodes: num(wikiConfig.local_graph_max_nodes, 48),
    snippetRadius: num(wikiConfig.snippet_radius, 110),
    searchTextLimit: num(wikiConfig.search_text_limit, 2000),
    summaryLimit: num(wikiConfig.summary_limit, 160),
    reRender: wikiConfig.re_render !== false,
    slugify: (text) => slugize(String(text || '').trim(), { transform: 0 }),
    routes
  };
}

/* ------------------------------------------------------------------ */
/* URL / 数据格式化                                                     */
/* ------------------------------------------------------------------ */

function toUrl(filePath, root) {
  const input = String(filePath || '').replace(/^\/+/, '');
  if (!input) return root === '/' ? '/' : root;
  let path = input.replace(/index\.html$/, '');

  const encoded = path
    .split('/')
    .map((segment) => {
      if (!segment) return '';
      let decoded = segment;
      try {
        decoded = decodeURIComponent(segment);
      } catch (err) {
        decoded = segment;
      }
      return encodeURIComponent(decoded);
    })
    .join('/');

  const base = !root || root === '/' ? '/' : root.endsWith('/') ? root : root + '/';
  return base + encoded;
}

function formatDate(value) {
  if (!value) return '';
  if (typeof value.format === 'function') return value.format('YYYY-MM-DD');
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const pad = (n) => String(n).padStart(2, '0');
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
}

function aliasesOf(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  return String(value)
    .split(/[,，;；]/)
    .map((v) => v.trim())
    .filter(Boolean);
}

function normalizeInfobox(value) {
  if (!value || typeof value !== 'object') return null;
  const fields = Array.isArray(value.fields)
    ? value.fields
        .map((field) => {
          if (!field || typeof field !== 'object') return null;
          const label = field.label != null ? String(field.label) : '';
          const fieldValue = field.value != null ? String(field.value) : '';
          if (!label && !fieldValue) return null;
          return { label, value: fieldValue };
        })
        .filter(Boolean)
    : [];
  const image = value.image ? String(value.image) : '';
  const caption = value.caption ? String(value.caption) : '';
  if (!image && !caption && !fields.length) return null;
  return { image, caption, fields };
}

/* ------------------------------------------------------------------ */
/* 采集页面                                                            */
/* ------------------------------------------------------------------ */

function collectPages(hexo, options) {
  const pages = [];
  const seen = new Set();

  const push = (post, isPage) => {
    if (!post || post.published === false) return;
    if (!post.title) return;
    const layout = String(post.layout || '').toLowerCase();
    if (layout === 'false' || layout === 'draft') return;
    if (post.wiki === false || post.wiki === 'false') return;

    const source = String(post.source || '');
    let sourceStem = source.replace(/^_posts\//, '').replace(/\.[^./\\]+$/, '');
    if (!sourceStem) return;
    if (seen.has(sourceStem)) return; // 同名保护：先到先得
    seen.add(sourceStem);

    const markdown = post._content != null && post._content !== ''
      ? String(post._content)
      : stripFrontMatter(post.raw || '');

    let navPath = post.navigation || post.nav || '';
    if (!navPath && source.indexOf('_posts/') === 0) {
      const dirs = source.replace(/^_posts\//, '').split('/');
      dirs.pop();
      navPath = dirs.join('/');
    }

    let tags = [];
    try {
      tags = post.tags ? post.tags.toArray().map((tag) => String(tag.name)) : [];
    } catch (err) {
      tags = [];
    }
    let categories = [];
    try {
      categories = post.categories ? post.categories.toArray().map((cat) => String(cat.name)) : [];
    } catch (err) {
      categories = [];
    }

    pages.push({
      key: sourceStem,
      sourceStem,
      source,
      isPage,
      layout: layout || 'post',
      title: String(post.title),
      slug: post.slug || '',
      path: post.path || '',
      url: toUrl(post.path || '', options.root),
      markdown,
      summary: post.summary || post.description || '',
      subtitle: post.subtitle || '',
      aliases: aliasesOf(post.aliases),
      tags,
      categories,
      infobox: normalizeInfobox(post.infobox),
      date: formatDate(post.date),
      updated: formatDate(post.updated || post.date),
      nav: {
        parentPath: String(navPath || '').trim(),
        label: post.nav_title ? String(post.nav_title) : '',
        order: num(post.nav_order, 100),
        hidden: post.nav_hidden === true || post.nav_hidden === 'true'
      }
    });
  };

  hexo.model('Post').toArray().forEach((post) => push(post, false));
  hexo.model('Page').toArray().forEach((page) => push(page, true));

  return pages;
}

/* ------------------------------------------------------------------ */
/* 状态                                                                */
/* ------------------------------------------------------------------ */

function getState(hexo) {
  return hexo._hexowiki || null;
}

function pageKeyOf(data, state) {
  if (!state || !data) return '';
  if (data.wiki_key && state.pageByKey.has(data.wiki_key)) return data.wiki_key;

  const source = String(data.source || '');
  const candidates = [
    source.replace(/^_posts\//, '').replace(/\.[^./\\]+$/, ''),
    source.replace(/^_posts\//, '').replace(/\/index\.[^./\\]+$/, ''),
    String(data.path || '').replace(/index\.html$/, '').replace(/\/+$/, '')
  ];
  for (const candidate of candidates) {
    if (candidate && state.pageByKey.has(candidate)) return candidate;
  }
  if (source) {
    const found = state.pages.find((page) => page.source === source);
    if (found) return found.key;
  }
  return '';
}

function entryFor(hexo, ctx, explicitPage) {
  const state = getState(hexo);
  if (!state) return null;

  const page = explicitPage || (ctx && ctx.page);
  if (!page) return null;
  if (page.wiki_key && state.pageByKey.has(page.wiki_key)) return state.pageByKey.get(page.wiki_key);

  const key = pageKeyOf(page, state);
  return key ? state.pageByKey.get(key) : null;
}

function safeJson(value) {
  return JSON.stringify(value == null ? null : value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function publicPage(entry) {
  if (!entry) {
    return {
      key: '', title: '', url: '', path: '', source: '', summary: '', subtitle: '',
      aliases: [], tags: [], categories: [], date: '', updated: '',
      in_count: 0, out_count: 0, broken_count: 0,
      in: [], out: [], broken: [], headings: [],
      infobox: null, section: '', nav: { label: '', order: 100, hidden: false, parentPath: '' },
      graph: { nodes: [], links: [] }
    };
  }
  return entry;
}

/* ------------------------------------------------------------------ */
/* 生命周期                                                            */
/* ------------------------------------------------------------------ */

hexo.extend.filter.register('before_generate', function buildWiki() {
  const options = themeOptions(hexo);
  const rawPages = collectPages(hexo, options);
  const state = buildWikiModel(rawPages, options);
  state.root = options.root;
  state.routes = options.routes;

  hexo._hexowiki = state;

  if (state.warnings.length) {
    hexo.log.warn(
      '[hexowiki] 检测到 %d 个重名条目（仅保留首个）：%s',
      state.warnings.length,
      state.warnings.slice(0, 5).map((w) => `${w.name} [${w.kept} / 忽略 ${w.ignored}]`).join('；')
    );
  }

  // 每次生成都重新渲染正文，保证「双链解析结果」与当前页面集合一致（缓存会保留旧的 href）
  if (options.reRender) {
    for (const post of hexo.model('Post').toArray()) {
      if (post.published === false) continue;
      post.content = null;
    }
    for (const page of hexo.model('Page').toArray()) {
      page.content = null;
    }
  }

  hexo.log.info(
    '[hexowiki] %d 个页面 · %d 条双链 · %d 条断链 · %d 个孤立页面',
    state.site.pages,
    state.site.links,
    state.site.broken,
    state.site.orphans
  );
}, 1);

hexo.extend.filter.register('after_post_render', function transformWikiLinks(data) {
  const state = getState(hexo);
  if (!state || !data || !data.content) return;

  const key = pageKeyOf(data, state);
  if (!key) return;

  data.content = linkifyHtml(data.content, key, state);

  const entry = state.pageByKey.get(key);
  if (entry) {
    const headings = extractHeadingsFromHtml(data.content);
    if (headings.length) {
      entry.headings = headings.map((heading) => ({
        level: heading.level,
        id: heading.id,
        text: heading.text
      }));
    } else {
      entry.headings = [];
    }
    if (!entry.summary) {
      entry.summary = firstParagraph(entry.markdown, state.options.summaryLimit);
    }
  }

  data.wiki_key = key;
}, 5);

/* ------------------------------------------------------------------ */
/* 模板 helper                                                          */
/* ------------------------------------------------------------------ */

hexo.extend.helper.register('wiki_nav', function () {
  const state = getState(hexo);
  if (!state) return [];
  const entry = entryFor(hexo, this);
  return decorateTree(state.tree, entry ? entry.key : '');
});

hexo.extend.helper.register('wiki_breadcrumb', function () {
  const entry = entryFor(hexo, this);
  if (!entry) return [];
  const parts = entry.nav.parentPath ? entry.nav.parentPath.split('/').filter(Boolean) : [];
  const crumbs = parts.map((part) => ({ label: part, url: null, isCurrent: false }));
  crumbs.push({ label: entry.nav.label || entry.title, url: entry.url, isCurrent: true });
  return crumbs;
});

hexo.extend.helper.register('wiki_page', function (explicitPage) {
  return publicPage(entryFor(hexo, this, explicitPage));
});

hexo.extend.helper.register('wiki_in', function (explicitPage) {
  const entry = entryFor(hexo, this, explicitPage);
  return entry ? entry.in : [];
});

hexo.extend.helper.register('wiki_out', function (explicitPage) {
  const entry = entryFor(hexo, this, explicitPage);
  return entry ? entry.out : [];
});

hexo.extend.helper.register('wiki_broken', function (explicitPage) {
  const entry = entryFor(hexo, this, explicitPage);
  return entry ? entry.broken : [];
});

hexo.extend.helper.register('wiki_headings', function (explicitPage) {
  const entry = entryFor(hexo, this, explicitPage);
  return entry ? entry.headings : [];
});

hexo.extend.helper.register('wiki_local_graph', function (explicitPage) {
  const entry = entryFor(hexo, this, explicitPage);
  return entry ? entry.graph : { nodes: [], links: [] };
});

hexo.extend.helper.register('wiki_site', function () {
  const state = getState(hexo);
  if (!state) {
    return { pages: 0, links: 0, orphans: 0, deadends: 0, broken: 0, avg_out: 0, updated_at: '', generated_at: '' };
  }
  return state.site;
});

hexo.extend.helper.register('wiki_stats', function () {
  const state = getState(hexo);
  if (!state) {
    return {
      pages: 0, links: 0, avg_out: 0, orphans: 0, deadends: 0, broken: 0,
      orphan_pages: [], deadend_pages: [], broken_links: [],
      top_in: [], top_out: [], sections: [], tags: [], recent: [], generated_at: ''
    };
  }
  return state.stats;
});

hexo.extend.helper.register('wiki_recent', function (limit) {
  const state = getState(hexo);
  if (!state) return [];
  return state.stats.recent.slice(0, num(limit, 5));
});

hexo.extend.helper.register('wiki_all_pages', function () {
  const state = getState(hexo);
  return state ? state.allPages : [];
});

hexo.extend.helper.register('wiki_urls', function () {
  const state = getState(hexo);
  const routes = state && state.routes ? state.routes : DEFAULT_ROUTES;
  const root = (state && state.root) || hexo.config.root || '/';
  return {
    graph: toUrl(routes.graph + '/', root),
    stats: toUrl(routes.stats + '/', root),
    all: toUrl(routes.all + '/', root),
    graph_json: toUrl(routes.graphJson, root),
    search_json: toUrl(routes.searchJson, root),
    stats_json: toUrl(routes.statsJson, root)
  };
});

hexo.extend.helper.register('wiki_json', function (value) {
  return safeJson(value);
});

hexo.extend.helper.register('wiki_local_graph_json', function () {
  return safeJson(this.wiki_local_graph());
});

/* ------------------------------------------------------------------ */
/* 生成器                                                              */
/* ------------------------------------------------------------------ */

hexo.extend.generator.register('hexowiki-routes', function generateWikiRoutes() {
  const state = getState(hexo);
  if (!state) return [];

  const routes = state.routes || DEFAULT_ROUTES;
  const searchIndex = buildSearchIndex(state.pages, state.options);

  const pageRoute = (base, layout, data) => ({
    path: String(base).replace(/^\/+|\/+$/g, '') + '/index.html',
    layout,
    data
  });

  return [
    { path: routes.graphJson, data: safeJson(state.graphJson) },
    { path: routes.searchJson, data: safeJson(searchIndex) },
    { path: routes.statsJson, data: safeJson(state.stats) },
    pageRoute(routes.graph, 'wiki_graph', {
      title: '关系图谱',
      layout: 'wiki_graph',
      type: 'wiki_graph',
      description: '所有页面及其双链关系，可拖拽、缩放与搜索。'
    }),
    pageRoute(routes.stats, 'wiki_stats', {
      title: '链接统计',
      layout: 'wiki_stats',
      type: 'wiki_stats',
      description: '页面、双链、孤立页面与断链的全局统计。'
    }),
    pageRoute(routes.all, 'wiki_allpages', {
      title: '全部页面',
      layout: 'wiki_allpages',
      type: 'wiki_allpages',
      description: '按首字排序的全部条目索引。'
    })
  ];
});

/* 便于测试 / 调试 */
hexo._hexowikiInternals = { collectPages, toUrl, themeOptions };
