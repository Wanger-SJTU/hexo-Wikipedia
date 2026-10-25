# HexWiki 构建契约（唯一协调文档）

> 目标：一个 **Wikipedia 视觉风格** 的 Hexo 主题，左侧是 **多级目录树**，内容层支持 **`[[双链]]`**、
> **反链 / 出链 / 断链统计**，以及 **类似 Obsidian 的关系图谱**（全文 + 单页局部图）。
>
> 本文件是所有并行工作的接口契约。**任何实现都必须与本文档一致**；如需变更，先改本文档并通知 Lead。

---

## 1. 仓库结构与归属（写作用域，互不重叠）

```
hexo-wiki/                       # Hexo 站点（可运行 demo）
├── _config.yml                  # Lead
├── package.json                 # Lead
├── docs/CONTRACT.md             # Lead（本文件）
├── README.md                    # Lead（最后写）
├── source/_posts/*.md           # content-dev
└── themes/hexowiki/
    ├── _config.yml              # ui-dev
    ├── package.json             # Lead
    ├── README.md                # Lead
    ├── languages/*.yml          # ui-dev
    ├── layout/                  # ui-dev（全部 .ejs）
    ├── source/                  # ui-dev（css / js / images）
    ├── lib/                     # Lead（纯函数，可单测）
    ├── scripts/                 # Lead（Hexo 插件：过滤器 / 生成器 / helper）
    └── test/                    # Lead（node --test）
```

- **不要**修改别人作用域内的文件。需要对方改动 → 发消息或在任务里写清楚。
- 运行命令统一为：
  ```bash
  export PATH=$PATH:/home/wanger/tools/node/bin
  cd /home/wanger/codes/hexo-wiki
  npx hexo clean && npx hexo generate     # 构建
  npx hexo server --port 4100             # 预览（可选）
  ```
- 远端工作区绝对路径：`/home/wanger/codes/hexo-wiki`。所有文件读写都用远端路径（`rw_*` 工具）。

---

## 2. 内容（Markdown）契约

### 2.1 Front-matter 字段

```yaml
---
title: 双链语法                     # 必填，页面标题
date: 2026-10-20 10:00:00          # 必填
updated: 2026-10-24 18:00:00       # 可选
summary: 用 [[页面]] 语法在页面之间建立双向链接。   # 可选，一句话摘要（搜索结果 / hover）
subtitle: 语法参考                  # 可选，标题下的小字（默认用主题配置的 wiki_subtitle）
navigation: 指南                    # 可选，侧栏多级目录的父路径，用 / 分隔，如 "指南/进阶"
nav_title: 双链语法                 # 可选，侧栏显示名（默认 title）
nav_order: 30                      # 可选，同级排序（数字小的在前，默认 100）
nav_hidden: true                   # 可选，不在侧栏显示（仍参与图谱/统计）
aliases: [Wiki链接, 双向链接语法]   # 可选，双链解析别名
tags: [语法, 链接]                  # 可选
categories: [手册]                  # 可选
infobox:                           # 可选，Wikipedia 风格信息框
  image: /images/hexowiki/xx.svg   #   可选，图片 URL
  caption: 图示说明
  fields:
    - label: 类型
      value: 引用语法
    - label: 相关
      value: 知识图谱
wiki: false                        # 可选，置 false 则该页完全不参与双链/侧栏/统计
---
```

- 侧栏目录：`navigation` 存在时按它分层（**只表示父分组路径**，页面自身是叶子节点，标签用 `nav_title|title`）；
  不存在时回退到源文件目录结构（`source/_posts/guide/advanced/x.md` → 分组 `guide / advanced`）。
- 所有文章默认 `layout: post`，都会进入双链网络。

### 2.2 双链语法（正文中）

| 写法 | 结果 |
|---|---|
| `[[页面标题]]` | 链接到该页，显示目标标题 |
| `[[页面标题\|显示文字]]` | 自定义显示文字 |
| `[[页面标题#章节]]` | 锚点到章节目录 |
| `[[#章节]]` | 本文内锚点 |
| `[[不存在的页]]` | **红链**（Wikipedia 式红链），并计入断链统计 |

解析规则（大小写不敏感）：`title` → `aliases` → `slug` → 源文件名。代码块（`<pre>`/`<code>`）内的
`[[...]]` **不会**被解析。支持在正文任意位置混合 Markdown。

### 2.3 demo 内容清单（content-dev 负责，20 篇）

| 文件 `source/_posts/…` | title | navigation | 备注 |
|---|---|---|---|
| `intro.md` | HexWiki 是什么 | 开始 | 首页风格导语；链到 installation / wikilinks / graph-view / statistics |
| `installation.md` | 安装 | 开始 | aliases: [安装指南]；链到 quick-start / configuration |
| `quick-start.md` | 快速开始 | 开始 | 链到 wikilinks / sidebar / front-matter |
| `wikilinks.md` | 双链语法 | 指南 | **核心页**，链出 6+；含 `[[双链笔记\|双向链接]]`、`[[双链语法#基本语法]]`；含代码块 |
| `sidebar.md` | 多级目录 | 指南 | 讲 `navigation/nav_title/nav_order`，含示例 yaml |
| `graph-view.md` | 关系图谱 | 指南 | 链到 knowledge-graph / wikilinks / statistics |
| `statistics.md` | 链接统计 | 指南 | 链到 graph-view / faq |
| `front-matter.md` | 页面属性 | 指南/进阶 | 含 front-matter 表格 |
| `math-code.md` | 数学与代码 | 指南/进阶 | 代码块（含公式的围栏代码）+ 表格（**不要求**数学引擎） |
| `configuration.md` | 主题配置 | 参考 | 配置项表格 |
| `data-format.md` | 数据格式 | 参考 | JSON 接口表格 |
| `faq.md` | 常见问题 | 参考 | aliases: [FAQ]；**故意**含红链 `[[未来计划]]`、`[[双链筆記]]` |
| `bidirectional-linking.md` | 双链笔记 | 知识库 | aliases: [双向链接, 双向链接笔记]；**infobox**；链到 wikilinks / zettelkasten / knowledge-graph |
| `knowledge-graph.md` | 知识图谱 | 知识库 | 链到 graph-view / bidirectional-linking |
| `wikipedia.md` | 维基百科 | 知识库 | infobox（无图）；链到 bidirectional-linking / wiki 风格 |
| `zettelkasten.md` | Zettelkasten | 知识库/笔记方法 | aliases: [卢曼卡片盒, 卡片盒笔记法]；链到 bidirectional-linking / knowledge-graph |
| `about.md` | 关于本站 | 关于 | 链到 intro / data-format |
| `orphan-demo.md` | 孤立页面示例 | —（`nav_hidden: true`） | **没有任何页面链入**（用于演示孤立页面统计），自己链出到 intro |
| `contributing.md` | 参与贡献 | 关于 | 链到 about / faq |
| `changelog.md` | 更新日志 | 关于 | 时间线列表 |

写作要求：每篇 180–500 汉字，维基百科式陈述语气，含 2–5 个 `##` 小节，平均 3–8 个双链；
至少 3 篇含表格 / 代码块 / 引用块。**不要**手写 HTML 目录、不要写 `<a>` 双链，统一用 `[[...]]`。
**不要**使用 `$…$` / `$$…$$` 数学语法（主题不引入数学引擎），公式请放进围栏代码块；
不要引用图片以外的外部资源。若引用图片，统一用 `/images/hexowiki/*.svg`（ui-dev 提供）。

---

## 3. 插件（Lead 实现）对外接口

### 3.1 模板 helper（EJS 全局函数，`this` 已绑定页面上下文）

```js
wiki_nav()            // 侧栏树：Node[]（根节点数组，见下）
wiki_breadcrumb()     // [{ label, url|null, isCurrent }]  含当前页，最后一项目 url=null
wiki_page(page?)      // 当前页/指定页的元数据对象（默认 this.page）
wiki_in(page?)        // 反链：[{ title, url, snippet, label }]
wiki_out(page?)       // 出链：[{ title, url, exists, label, anchor, snippet }]
wiki_broken(page?)    // 断链：[{ raw, label, candidates: [{title,url}] }]
wiki_headings(page?)  // 页内标题：[{ id, text, level }]（用于文内「目录」框）
wiki_local_graph(page?) // 局部关系图（本文 2 跳邻居）：{ nodes:[], links:[] }
wiki_site()           // { pages, links, orphans, broken, avg_out, updated_at, generated_at }
wiki_stats()          // 完整统计对象（统计页用，见 3.4）
wiki_recent(n)        // 最近更新：[{ title, url, updated, summary }]
wiki_all_pages()      // 全部页面按字母分组：[{ letter, pages:[{title,url,in_count,summary}] }]
wiki_urls()           // { graph, stats, all, graph_json, search_json, stats_json }（均已 url_for）
```

Node（侧栏树节点）：

```js
{
  type: 'group' | 'page',
  label: '指南',                 // 显示名
  title: '指南',                 // 同 label（group 时）
  url: '/wiki/wikilinks/',       // page 节点才有
  key: 'guide/wikilinks',        // 稳定 id（page 用 source 去扩展名）
  order: 30,
  active: true,                  // 当前页
  open: true,                    // 当前页所在分支需展开（含祖先）
  backlinks: 4,                  // 该页被链入次数（page 节点）
  children: [ ...Node ]
}
```

`wiki_page()` 返回：

```js
{
  key, title, url, path, source, summary, subtitle,
  aliases: [], tags: [], categories: [],
  date, updated,                       // 字符串（YYYY-MM-DD）
  in_count, out_count, broken_count,   // 数字
  in: [], out: [], broken: [],         // 同 wiki_in/out/broken
  headings: [],                        // 同 wiki_headings
  section: '指南',                     // 一级分组
  nav: { label, order, hidden, parentPath },
  infobox: { image, caption, fields: [{label, value}] } | null,
  graph: { nodes, links }              // 局部图（同 wiki_local_graph）
}
```

### 3.2 生成的路由（插件自动生成）

| 路由 | 内容 |
|---|---|
| `/wiki-graph.json` | `{ generated, nodes:[{id,title,url,group,tags,in,out,size,missing}], links:[{source,target,count}] }` |
| `/wiki-search.json` | `[{ title, url, summary, tags:[], headings:[], text, updated }]` |
| `/wiki-stats.json` | 同 `wiki_stats()` |
| `/graph/` | 关系图谱整页（layout `wiki_graph`） |
| `/stats/` | 统计面板页（layout `wiki_stats`） |
| `/wiki/all/` | 全部页面索引（layout `wiki_allpages`） |

`id` = 页面 `source` 去扩展名（如 `_posts/guide/wikilinks`）。`size` 由入度+出度计算（3–22）。

### 3.3 页面内嵌数据

模板中局部图直接内联：`<script type="application/json" id="wiki-local-graph"><%- wiki_local_graph_json() %></script>`。
（`wiki_local_graph_json()` 已对 `</script>` 等做转义；也可用 `wiki_json(value)` 序列化任意数据。）

### 3.4 `wiki_stats()` 结构

统计口径：
- `links` = 已解析双链总数（按「页面 → 目标页面」去重，同一目标多次引用只记 1 条，另在 `count` 记出现次数）。
- `orphans` / `orphan_pages` = **无入链页面**（Wikipedia「孤立条目」口径，不代表没有任何链接）。
- `deadends` / `deadend_pages` = **无出链页面**。
- `broken` = 未解析双链的出现次数；`broken_links` 按目标去重。
- 自引用（`[[#章节]]` 或指向自身）不计入链接总数与反链。

```js
{
  pages, links, avg_out, orphans, deadends, broken,
  orphan_pages: [{ title, url, out_count, summary }],
  deadend_pages: [{ title, url, in_count }],
  broken_links: [{ raw, label, sources: [{ title, url }] }],
  top_in: [{ title, url, value }], top_out: [...],
  sections: [{ name, count }],
  tags: [{ name, count }],
  recent: [{ title, url, updated }],
  generated_at: '2026-10-25 09:40:00'
}
```

---

## 4. 视觉与 DOM 契约

参考 **Wikipedia Vector 2022**（浅色），中文排版。要点：

- 顶栏：白底、底部 1px `#a2a9b1` 分隔线；左侧站点字标（衬线体）+ 维基式圆形/书本 logo（内联 SVG）；
  中间搜索框（1px 边框、聚焦蓝色）；右侧链接（随机页面、统计、图谱、主题切换）。
- 主体：左 248px 侧栏（sticky，独立滚动）+ 内容列（`max-width: 960px`）。
- 正文：14px/1.65，色 `#202122`；链接 `#3366cc`，visited `#6b4ba1`，hover 下划线，红链 `#d73333`。
- 一级标题：衬线体 2rem、正常字重、下方 1px 分隔线；`h2` 衬线 1.6rem + 下边框；`h3` 无衬线加粗。
- 标题下 `siteSub`（如「来自 HexWiki，自由的知识库」）、hatnote（斜体缩进）。
- 信息框 `infobox`：右浮动 22em、`#f8f9fa` 底、`#a2a9b1` 边框、表头 `#eaecf0` 居中加粗。
- 文内「目录」框：`#f8f9fa` 底 + 边框，编号列表。
- 分类脚注（categories box）、页面页脚（最后编辑时间 + 许可说明）。
- 反链/出链/断链面板：维基「链入页面」风格盒子，标题栏浅蓝 `#eaecf0`，每条含来源页与上下文摘要。
- 侧栏目录：可折叠 `<ul>`/`<button aria-expanded>`，当前页高亮（左侧 3px 蓝条 + 浅蓝底 + 加粗），
  活跃路径自动展开、`localStorage` 记忆展开状态、顶部筛选框（实时过滤）、每项可显示反链数徽标。
- 关系图谱：纯前端 Canvas/SVG 力导向（**零依赖**），支持拖拽 / 缩放 / 平移 / hover 提示 / 点击跳转 /
  按分组着色 / 搜索高亮 / 局部图（文章页 360px 高）。
- 响应式：< 1000px 侧栏变抽屉（汉堡按钮 + 遮罩）；文内目录在窄屏折叠。
- 深色模式：`html[data-theme="dark"]` + CSS 变量 + localStorage，默认跟随系统。
- 可访问性：skip link、键盘可达、`aria-*`、`prefers-reduced-motion`、对比度。

必须存在的 class（CSS/JS 可自行扩展，但这些必须实现且被使用）：

```
.wiki-header .wiki-header__brand .wiki-search .theme-toggle
.wiki-shell .wiki-sidebar .wiki-sidebar__inner .wiki-main .wiki-footer
.nav-tree .nav-tree__filter .nav-tree__group .nav-tree__link .nav-tree__toggle
.nav-tree__item .is-active .is-open .nav-tree__badge .sidebar-stats
.article .article__title .site-sub .hatnote .article__tabs .tabs__item
.article__infobox .infobox .toc-box .article__content .article__categories
.links-panel .links-panel__head .links-panel__list .links-panel__item .links-panel__snippet
.link-stats .is-missing .wikilink
.local-graph #graph-canvas .graph-controls .graph-legend .graph-tooltip
.search-suggest .search-suggest__item .is-selected
.stats-grid .stat-card .stats-table .orphan-list .broken-list
.pagination .pagination__item
```

EJS 约定：`<%- include('partial/xxx') %>`；`page` 为当前页；`config`/`theme`/`site`/`url_for`/`__()` 可用。

---

## 5. 必需 layout

`layout.ejs`（骨架）、`index.ejs`（首页：导语 + 分组卡片 + 最近更新 + 统计预览）、`post.ejs`（条目页）、
`page.ejs`（普通页）、`archive.ejs`、`category.ejs`、`tag.ejs`、`wiki_graph.ejs`、`wiki_stats.ejs`、
`wiki_allpages.ejs`。

`post.ejs` 至少包含：面包屑、标题、`siteSub`、tabs（条目/讨论 | 阅读/编辑/查看历史，编辑链接可配）、
信息框、文内目录、正文、分类框、**反链/出链/断链面板**、局部关系图、页脚。

---

## 6. 验收标准

1. `npx hexo clean && npx hexo generate` 零报错；`public/` 产出上述路由与 JSON。
2. 打开任意条目：左侧多级目录可折叠、当前页高亮、祖先自动展开；正文双链可点击；断链为红色。
3. 条目页底部显示：链入 N 条（含来源摘要）、链出 M 条、断链 K 条，数字与图谱 JSON 一致。
4. `/graph/` 全站图谱可交互（拖拽/缩放/点击跳转/搜索）；条目页局部图与之数据一致。
5. `/stats/` 统计正确：页面数、链接数、孤立页、断链、被链最多页面；`/wiki/all/` 按字母索引。
6. 深色模式、移动端（<1000px）抽屉、搜索建议可用。
7. 与 Wikipedia 视觉对照：字体层级、链接颜色、信息框、目录框、脚注、页脚风格一致。
8. 单元测试：`node --test themes/hexowiki/test` 全绿（Lead 负责）。

---

## 7. 进度同步

- 任何阻塞 / 契约变更 → 立即消息 Lead（`send_message` target `lead`），不要静默猜测。
- 完成后在共享任务里 `complete`，并给出：改了哪些文件、如何验证、已知问题。
