#!/usr/bin/env node
'use strict';

/**
 * 把 Obsidian 仓库（collections）正式导入 Hexo：
 *  - 补 front-matter（title/date/permalink/disableNunjucks/wiki:false/nav_hidden）
 *  - 唯一 permalink（用相对路径，清洗非法 URL 字符）
 *  - 图片/附件移到 source/images/collections 并改写引用
 *  - ![[...]] 嵌入、[[双链]]、HTML <img> 引用改写
 *  - 生成 /collections/ 文档索引
 *
 * 用法：
 *   node tools/import-collections.js                         # 全量导入
 *   node tools/import-collections.js --only wechat --limit 50 --dry-run
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const yaml = require(path.join(ROOT, 'node_modules', 'js-yaml'));
const frontMatter = require(path.join(ROOT, 'node_modules', 'hexo-front-matter'));

function arg(name, fallback) {
  const hit = process.argv.find((item) => item.startsWith('--' + name + '='));
  return hit ? hit.slice(name.length + 3) : fallback;
}
const has = (name) => process.argv.includes('--' + name);

const SRC = path.resolve(arg('src', '/home/wanger/codes/collections'));
const DOCS_OUT = path.resolve(ROOT, arg('docs-dir', 'source/_posts/collections'));
const ASSETS_OUT = path.resolve(ROOT, arg('assets-dir', 'source/images/collections'));
const INDEX_FILE = path.resolve(ROOT, arg('index-file', 'source/collections/index.md'));
const DATA_FILE = path.resolve(ROOT, arg('data-file', 'source/_data/collections.json'));
const URL_PREFIX = ('/' + String(arg('url', '/collections')).replace(/^\/+|\/+$/g, '') + '/').replace(/\/+/g, '/');
const IMAGE_URL_BASE = ('/images/' + path.basename(ASSETS_OUT) + '/').replace(/\/+/g, '/');
const ONLY = String(arg('only', '')).replace(/^\/+|\/+$/g, '');
const LIMIT = Number(arg('limit', 0)) || 0;
const DRY = has('dry-run');

const SKIP_DIRS = new Set(['.git', '.obsidian', '.trash', 'node_modules']);
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|bmp|avif|tiff?|heic)$/i;

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function walk(dir, out) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    return out;
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.') && entry.name !== '.well-known') continue;
    if (SKIP_DIRS.has(entry.name)) continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(abs, out);
    else if (entry.isFile()) out.push(abs);
  }
  return out;
}

function toPosix(value) {
  return String(value).split(path.sep).join('/');
}

function normalizeName(value) {
  return String(value == null ? '' : value)
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function slugSegment(value) {
  const text = String(value || '')
    .normalize('NFKC')
    .replace(/[\\/:*?"<>|#%&{}$!@+`=]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 90);
  return text || 'untitled';
}

function encodeUrl(url) {
  return encodeURI(url).replace(/#/g, '%23').replace(/\?/g, '%3F');
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeMarkdownLabel(value) {
  return String(value == null ? '' : value).replace(/[[\]\n\r]/g, ' ').trim();
}

function stripFrontMatter(raw) {
  return raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
}

function firstHeading(body) {
  const lines = stripFrontMatter(body).split('\n');
  let fence = null;
  for (const line of lines) {
    const f = /^\s{0,3}(`{3,}|~{3,})/.exec(line);
    if (f) {
      if (!fence) fence = f[1][0];
      else if (f[1][0] === fence) fence = null;
      continue;
    }
    if (fence) continue;
    const m = /^\s{0,3}#\s+(.+?)\s*#*\s*$/.exec(line);
    if (m) return m[1].trim();
  }
  return '';
}

function parseDoc(abs) {
  const raw = fs.readFileSync(abs, 'utf8');
  let data = null;
  let body = raw;
  let malformed = false;
  try {
    data = frontMatter.parse(raw);
    if (data && typeof data === 'object' && typeof data._content === 'string') {
      body = data._content;
    } else if (data && typeof data === 'object') {
      body = stripFrontMatter(raw);
    }
  } catch (err) {
    malformed = true;
    data = null;
    body = stripFrontMatter(raw);
  }
  const rel = toPosix(path.relative(SRC, abs)).replace(/\.md$/i, '');
  const stem = path.posix.basename(rel);
  let title = data && data.title != null ? String(data.title).trim() : '';
  if (!title) title = firstHeading(body).replace(/[*_`]/g, '').trim();
  if (!title) title = stem.replace(/^[\s._-]+/, '').trim() || '未命名文档';

  let date = data && data.date ? data.date : null;
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    try {
      const stat = fs.statSync(abs);
      date = stat.mtime;
    } catch (err) {
      date = new Date();
    }
  }
  let updated = data && data.updated ? data.updated : date;
  if (!(updated instanceof Date) || Number.isNaN(updated.getTime())) updated = date;

  let tags = data && data.tags ? data.tags : [];
  if (typeof tags === 'string') tags = tags.split(/[,，;；]/);
  if (!Array.isArray(tags)) tags = [];
  tags = tags.map((tag) => String(tag).trim()).filter(Boolean);

  let aliases = data && data.aliases ? data.aliases : [];
  if (typeof aliases === 'string') aliases = aliases.split(/[,，;；]/);
  if (!Array.isArray(aliases)) aliases = [];

  return {
    abs,
    rel,
    stem,
    title,
    date,
    updated,
    tags,
    aliases: aliases.map(String).filter(Boolean),
    sourceUrl: data && data.source && /^https?:/.test(String(data.source)) ? String(data.source) : '',
    body,
    malformed,
    data: data || {}
  };
}

function formatDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function buildUrl(rel, used) {
  const parts = rel.split('/').filter(Boolean).map(slugSegment);
  let url = URL_PREFIX + parts.join('/') + '/';
  if (used.has(url)) {
    url = URL_PREFIX + parts.join('/') + '-' + crypto.createHash('sha1').update(rel).digest('hex').slice(0, 6) + '/';
  }
  used.add(url);
  return url;
}

function main() {
  if (!fs.existsSync(SRC)) {
    console.error('[import] 找不到源目录：' + SRC);
    process.exit(1);
  }

  const allFiles = walk(SRC, []);
  let docFiles = allFiles.filter((abs) => /\.md$/i.test(abs));
  let assetFiles = allFiles.filter((abs) => !/\.md$/i.test(abs));

  if (ONLY) {
    docFiles = docFiles.filter((abs) => toPosix(path.relative(SRC, abs)).startsWith(ONLY + '/'));
    assetFiles = assetFiles.filter((abs) => toPosix(path.relative(SRC, abs)).startsWith(ONLY + '/'));
  }
  docFiles.sort((a, b) => toPosix(path.relative(SRC, a)).localeCompare(toPosix(path.relative(SRC, b)), 'zh-Hans-CN'));
  assetFiles.sort();

  let docs = docFiles.map(parseDoc);
  if (LIMIT) docs = docs.slice(0, LIMIT);

  console.log(`[import] 源：${SRC}`);
  console.log(`[import] 文档：${docs.length} / 附件：${assetFiles.length}${ONLY ? '（only=' + ONLY + '）' : ''}`);
  if (!docs.length) {
    console.error('[import] 没有可导入的 Markdown');
    process.exit(1);
  }

  const usedUrls = new Set();
  const docByRel = new Map();
  const docByName = new Map();
  const docByStem = new Map();
  const warnings = [];

  for (const doc of docs) {
    doc.url = buildUrl(doc.rel, usedUrls);
    doc.permalink = decodeURIComponent(doc.url);
    docByRel.set(doc.rel, doc);
    const add = (map, name, value) => {
      const key = normalizeName(name);
      if (!key) return;
      const existing = map.get(key);
      if (existing && existing !== value) {
        warnings.push(`重名：${name}（${existing.rel} / ${value.rel}）`);
        return;
      }
      map.set(key, value);
    };
    add(docByName, doc.title, doc);
    add(docByStem, doc.stem, doc);
    for (const alias of doc.aliases) add(docByName, alias, doc);
  }

  // 附件索引
  const assetByRel = new Map();
  const assetByBase = new Map();
  for (const abs of assetFiles) {
    const rel = toPosix(path.relative(SRC, abs));
    const item = {
      abs,
      rel,
      base: path.posix.basename(rel),
      ext: path.posix.extname(rel).toLowerCase(),
      url: IMAGE_URL_BASE + rel.split('/').map(encodeURIComponent).join('/')
    };
    assetByRel.set(rel, item);
    if (!assetByBase.has(item.base)) assetByBase.set(item.base, []);
    assetByBase.get(item.base).push(item);
  }

  function findAsset(noteRel, rawPath) {
    let target = String(rawPath || '').trim();
    if (!target || /^https?:|^data:|^mailto:/i.test(target)) return null;
    target = target.replace(/^<|>$/g, '').replace(/^\.\//, '');
    try {
      target = decodeURIComponent(target);
    } catch (err) {
      /* keep */
    }
    const noteDir = path.posix.dirname(noteRel);
    const candidates = [
      path.posix.normalize(path.posix.join(noteDir, target)),
      path.posix.normalize(target.replace(/^\/+/, ''))
    ];
    for (const candidate of candidates) {
      if (assetByRel.has(candidate)) return assetByRel.get(candidate);
    }
    const base = path.posix.basename(target);
    const list = assetByBase.get(base) || [];
    if (!list.length) return null;
    const preferred = list.find((item) => item.rel.startsWith(noteDir + '/'))
      || list.find((item) => item.rel.split('/')[0] === noteDir.split('/')[0]);
    return preferred || (list.length === 1 ? list[0] : list[0]);
  }

  function findDoc(noteRel, rawName) {
    const name = String(rawName || '').trim();
    if (!name) return null;
    const rel = path.posix.normalize(path.posix.join(path.posix.dirname(noteRel), name)).replace(/\.md$/i, '');
    if (docByRel.has(rel)) return docByRel.get(rel);
    return docByName.get(normalizeName(name)) || docByStem.get(normalizeName(name)) || null;
  }

  function renderEmbed(inner, doc) {
    const pipe = inner.indexOf('|');
    let target = (pipe === -1 ? inner : inner.slice(0, pipe)).trim();
    let label = pipe === -1 ? '' : inner.slice(pipe + 1).trim();
    if (/^(width|height)=/i.test(label) || /^\d+$/.test(label)) label = '';
    target = target.replace(/^\.\//, '');

    const asset = findAsset(doc.rel, target);
    const hitDoc = asset ? null : findDoc(doc.rel, target);
    const display = escapeMarkdownLabel(label || path.posix.basename(target) || target);
    if (asset) {
      if (IMAGE_EXT.test(asset.ext)) return `![${display}](${asset.url})`;
      return `[${display}](${asset.url})`;
    }
    if (hitDoc) return `[${display}](${encodeUrl(hitDoc.url)})`;
    return null;
  }

  const wikilinkSlug = (text) => String(text || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}\-_]/gu, '');

  function renderWikilink(inner, doc) {
    const pipe = inner.indexOf('|');
    let target = (pipe === -1 ? inner : inner.slice(0, pipe)).trim();
    let label = pipe === -1 ? '' : inner.slice(pipe + 1).trim();
    let anchor = '';
    const hash = target.indexOf('#');
    if (hash !== -1) {
      anchor = target.slice(hash + 1).trim();
      target = target.slice(0, hash).trim();
    }
    const hit = target ? findDoc(doc.rel, target) : doc;
    const display = escapeMarkdownLabel(label || target || doc.title);
    if (!hit) {
      return `<span class="wikilink wikilink--missing" title="未导入的页面">${escapeHtml(display)}</span>`;
    }
    let url = encodeUrl(hit.url);
    if (anchor) url += '#' + encodeURIComponent(wikilinkSlug(anchor));
    return `[${display}](${url})`;
  }

  function transformText(text, doc) {
    let out = String(text);

    out = out.replace(/!\[\[([^\[\]\n]+)\]\]/g, (whole, inner) => {
      const rendered = renderEmbed(inner, doc);
      return rendered == null ? whole : rendered;
    });

    out = out.replace(/!\[([^\]]*)\]\(([^)\n]+)\)/g, (whole, alt, rawHref) => {
      let href = String(rawHref).trim();
      if (/^https?:|^data:/i.test(href)) return whole;
      href = href.replace(/^<|>$/g, '').replace(/\s+["'][^"']*["']\s*$/, '');
      const asset = findAsset(doc.rel, href);
      if (!asset) return whole;
      return `![${alt || ''}](${asset.url})`;
    });

    out = out.replace(/<img\b[^>]*>/gi, (tag) => tag.replace(
      /\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)')/i,
      (whole, doubleQuoted, singleQuoted) => {
        const href = doubleQuoted || singleQuoted || '';
        if (/^https?:|^data:/i.test(href)) return whole;
        const asset = findAsset(doc.rel, href);
        return asset ? 'src="' + asset.url + '"' : whole;
      }
    ));

    out = out.replace(/\[\[([^\[\]\n]+)\]\]/g, (whole, inner) => renderWikilink(inner, doc));

    // 中文紧邻 ** 时 CommonMark 不识别加粗（如 **加粗**一方面），转为 <strong>
    out = out.replace(/\*\*[ \t]*([^*\n]+?)[ \t]*\*\*/g, (whole, inner) => {
      const text = inner.trim();
      return text ? '<strong>' + text + '</strong>' : whole;
    });

    return out;
  }

  function decodeHtmlEntities(text) {
    return String(text == null ? '' : text)
      .replace(/&nbsp;/gi, ' ')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;|&apos;/gi, "'")
      .replace(/&amp;/gi, '&')
      .replace(/&#x([0-9a-f]+);/gi, (whole, hex) => String.fromCodePoint(parseInt(hex, 16)))
      .replace(/&#(\d+);/g, (whole, dec) => String.fromCodePoint(Number(dec)));
  }

  function splitEmbeddedCommands(body) {
    const lines = String(body == null ? '' : body).split('\n');
    const out = [];
    let fence = null;
    for (const line of lines) {
      const f = /^\s{0,3}(`{3,}|~{3,})/.exec(line);
      if (f) {
        if (!fence) fence = f[1][0];
        else if (f[1][0] === fence) fence = null;
        out.push(line);
        continue;
      }
      if (fence) {
        out.push(line);
        continue;
      }
      const m = line.match(/(?:^|[。！？；;，,、：:])((?:docker|tokenspeed|pip|git|npm|yarn|curl|wget)\s+[^\n]*)$/);
      if (m && m.index > 0) {
        const cut = m.index + 1;
        const prefix = line.slice(0, cut).replace(/\s+$/, '');
        const command = m[1].trim();
        if (prefix && command.length > 3) {
          out.push(prefix);
          out.push(command);
          continue;
        }
      }
      out.push(line);
    }
    return out.join('\n');
  }

  function looksLikeCode(line) {
    const raw = String(line || '');
    const text = raw.trim();
    if (!text || text.length > 300) return false;
    if (/^(```|~~~)/.test(text)) return false;
    if (/^`[^`]*`$/.test(text)) return false;
    if (/^(#include|#define|#pragma|#if|#endif|using\s+|namespace\s+|template\b|typedef\b|struct\b|class\b|void\b|int\b|float\b|double\b|char\b|long\b|short\b|unsigned\b|signed\b|bool\b|const\b|static\b|public\b|private\b|protected\b|for\s*\(|while\s*\(|if\s*\(|else\b|switch\s*\(|case\b|return\b|break\b|continue\b|import\s+|from\s+|def\s+|print\s*\(|console\.|function\b|let\b|var\b|SELECT\b|INSERT\b|UPDATE\b|DELETE\b|CREATE\b|curl\b|pip\b|npm\b|git\b|docker\b|cmake\b|make\b|__m\d+|std::|Var\b|Func\b|Buffer\b|Expr\b|Image\b|Param\b|RVar\b|FuncRef\b|Halide::|gradient\b)/.test(text)) return true;
    if (/^[A-Za-z_]\w*\.[A-Za-z_]\w*\s*\(/.test(text)) return true;
    if (/^\.(LC\d+|L\d+|string|text|globl|section|data|align|type|size)\b/.test(text)) return true;
    if (/^[A-Za-z_]\w*::/.test(text) || /^[A-Za-z_]\w*\s*\[[^\]]*\]:$/.test(text)) return true;
    if (/^(sub|mov|add|call|ret|push|pop|lea|cmp|jne|je|jmp|test|xor|and|or|imul|movzx|movsx|nop|endbr64|inc|dec|shl|shr|neg|not)\b/.test(text)) return true;
    if (/^[A-Za-z_]\w*[\w\s\*&]*\([^;]*$/.test(text)) return true; // 函数签名
    if (/^[A-Za-z_]\w*[\w\s\*&]*[;=]/.test(text)) return true; // 声明/赋值
    if (/^[A-Za-z_]\w*\s*->/.test(text)) return true; // 成员访问
    if (/^[A-Za-z_]\w*\s*\([^)]*\)\s*;?$/.test(text)) return true; // 调用
    if (/^--?[A-Za-z]/.test(text)) return true;
    if (/^(docker|tokenspeed|pip|npm|yarn|curl|wget|cd|export|git|bash|sh|make|cmake|sudo)\b/.test(text)) return true;
    if (/\\\s*$/.test(raw)) return true;
    if (/^[{}();,\[\]]+;?$/.test(text)) return true;
    if (/^\/\//.test(text) || /^\/\*/.test(text) || /^\*\s/.test(text)) return true;
    if (/^( {4}|\t)/.test(raw) && /[;{}()=]/.test(text)) return true;
    return false;
  }

  function detectLang(text) {
    if (/^\s*\.(LC\d+|L\d+|string|text|globl|section|data)\b|^\s*(mov|sub|add|call|ret|lea|cmp|push|pop)\b/m.test(text)) return 'x86asm';
    // Halide / C++ 特征优先
    if (/(^|\n)\s*(Var|Func|Buffer|Expr|Image|Param|RVar|FuncRef)\b|gradient\.|#include|std::|__m\d+/.test(text)) return 'cpp';
    const jsLike = /(console\.|=>|\bfunction\s+\w+\s*\(|\b(const|let)\s+\w+\s*=)/.test(text);
    if (!jsLike && /(void\s+\w+\s*\(|int\s+\w+|for\s*\()/.test(text)) return 'cpp';
    if (/(^|\n)\s*(def\s+|import\s+|from\s+|print\s*\()/.test(text)) return 'python';
    if (jsLike) return 'js';
    if (/\b(SELECT|INSERT|UPDATE|DELETE|CREATE)\b/i.test(text)) return 'sql';
    if (/(^|\n)\s*(\$ |pip\b|npm\b|git\b|docker\b|tokenspeed\b|cd\b|export\b|curl\b|wget\b|cmake\b)/.test(text)) return 'bash';
    return 'text';
  }

  function stripStrayBackticks(body) {
    const lines = String(body == null ? '' : body).split('\n');
    const out = [];
    let fence = null;
    for (const line of lines) {
      const f = /^\s{0,3}(`{3,}|~{3,})/.exec(line);
      if (f) {
        if (!fence) fence = f[1][0];
        else if (f[1][0] === fence) fence = null;
        out.push(line);
        continue;
      }
      if (fence) {
        out.push(line);
        continue;
      }
      let clean = line;
      const trimmed = clean.trim();
      if (trimmed === '`') continue;
      if (/^`(?!``)/.test(trimmed)) {
        const rest = trimmed.slice(1);
        // 单行完整的 `inline code` 保留
        if (rest.length > 1 && rest.endsWith('`')) {
          out.push(clean);
          continue;
        }
        clean = clean.replace(/^(\s*)`/, '$1');
      }
      // 行尾单独一个反引号（多行代码块的收尾）
      if (/`\s*$/.test(clean) && (clean.match(/`/g) || []).length === 1) {
        clean = clean.replace(/`\s*$/, '');
      }
      out.push(clean);
    }
    return out.join('\n');
  }

  function autoFenceCode(body) {
    const normalized = String(body == null ? '' : body).replace(/^(\s*)Bufferint>/gm, '$1Buffer<int>');
    const lines = normalized.split('\n');
    const out = [];
    let fence = null;
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      const f = /^\s{0,3}(`{3,}|~{3,})/.exec(line);
      if (f) {
        if (!fence) fence = f[1][0];
        else if (f[1][0] === fence) fence = null;
        out.push(line);
        i += 1;
        continue;
      }
      if (fence) {
        out.push(line);
        i += 1;
        continue;
      }
      if (!looksLikeCode(line)) {
        out.push(line);
        i += 1;
        continue;
      }

      const group = [line];
      let j = i + 1;
      while (j < lines.length) {
        const next = lines[j];
        if (/^\s{0,3}(`{3,}|~{3,})/.test(next)) break;
        if (!next.trim()) {
          if (j + 1 < lines.length && looksLikeCode(lines[j + 1])) {
            group.push('');
            j += 1;
            continue;
          }
          break;
        }
        if (looksLikeCode(next) || /^( {2,}|\t)/.test(next) || /^\s+#/.test(next)) {
          group.push(next);
          j += 1;
          continue;
        }
        break;
      }
      if (group.length < 2 && !/[;{}]/.test(line)) {
        out.push(line);
        i += 1;
        continue;
      }
      const fixed = group.map((item) => item
        .replace(/^(\s*)Bufferint>/, '$1Buffer<int>')
        .replace(/^(#include)\s+([A-Za-z0-9_./-]+\.h)\s*$/, '$1 <$2>'));
      if (out.length && out[out.length - 1].trim()) out.push('');
      out.push('```' + detectLang(fixed.join('\n')));
      out.push(...fixed);
      out.push('```', '');
      i = j;
    }
    return out.join('\n');
  }

  function transformBody(body, doc) {
    const lines = String(body).split('\n');
    let fence = null;
    const output = [];
    for (const line of lines) {
      const f = /^\s{0,3}(`{3,}|~{3,})/.exec(line);
      if (f) {
        if (!fence) fence = f[1][0];
        else if (f[1][0] === fence) fence = null;
        output.push(line);
        continue;
      }
      if (fence) {
        output.push(line);
        continue;
      }
      let clean = line;
      if (!/^( {4}|\t)/.test(clean)) {
        // 单边/悬空加粗标记：`**` 单独一行、标题结尾多一个 `**`、跨行 ** 等
        if (/^\s*\*\*\s*$/.test(clean)) continue;
        clean = clean.replace(/^(\s*#{1,6}\s+.*?)\s*\*\*\s*$/, '$1');
        clean = clean.replace(/^(\s*#{1,6}\s+)\*\*\s*(.*)$/, '$1$2');
        const markerCount = (clean.match(/\*\*/g) || []).length;
        if (markerCount === 1) {
          clean = clean.replace(/^\s*\*\*\s*/, '').replace(/\s*\*\*\s*$/, '');
        }
      }
      output.push(clean.replace(/(`[^`\n]*`)|([^`]+)/g, (segment, code, plain) => (
        code ? segment : transformText(plain, doc)
      )));
    }
    return output.join('\n');
  }

  // 清理旧输出
  if (!DRY) {
    fs.rmSync(DOCS_OUT, { recursive: true, force: true });
    fs.rmSync(ASSETS_OUT, { recursive: true, force: true });
    ensureDir(DOCS_OUT);
    ensureDir(ASSETS_OUT);

    for (const asset of assetByRel.values()) {
      const dest = path.join(ASSETS_OUT, asset.rel);
      ensureDir(path.dirname(dest));
      fs.copyFileSync(asset.abs, dest);
    }
  }

  const indexGroups = new Map();
  let written = 0;
  let replacedEmbeds = 0;
  let replacedWiki = 0;

  for (const doc of docs) {
    const prepared = splitEmbeddedCommands(decodeHtmlEntities(doc.body));
    const body = transformBody(autoFenceCode(stripStrayBackticks(prepared)), doc);
    const fm = {
      title: doc.title,
      date: formatDate(doc.date),
      updated: formatDate(doc.updated),
      layout: 'post',
      permalink: doc.permalink,
      disableNunjucks: true,
      wiki: false,
      nav_hidden: true,
      categories: ['文档']
    };
    if (doc.tags.length) fm.tags = doc.tags;
    if (doc.sourceUrl) fm.source_url = doc.sourceUrl;

    const yamlText = yaml.dump(fm, { lineWidth: -1, noRefs: true, quotingType: '"', forceQuotes: false });
    const output = `---\n${yamlText}---\n\n${body}`;

    if (!DRY) {
      const dest = path.join(DOCS_OUT, doc.rel + '.md');
      ensureDir(path.dirname(dest));
      fs.writeFileSync(dest, output);
    }
    written += 1;

    const top = doc.rel.split('/')[0] || '其它';
    if (!indexGroups.has(top)) indexGroups.set(top, []);
    indexGroups.get(top).push(doc);
  }

  if (!DRY) {
    const lines = [
      '---',
      'title: 文档库',
      `date: ${formatDate(new Date())}`,
      'layout: page',
      'wiki: false',
      'nav_hidden: true',
      'comments: false',
      '---',
      '',
      `共导入 **${docs.length}** 篇文档，按原始目录分组。`,
      ''
    ];
    const tops = [...indexGroups.keys()].sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));
    for (const top of tops) {
      const items = indexGroups.get(top).slice().sort((a, b) => a.title.localeCompare(b.title, 'zh-Hans-CN'));
      lines.push(`## ${top}（${items.length}）`, '');
      for (const item of items) {
        lines.push(`- [${item.title.replace(/[[\]()]/g, ' ')}](${encodeUrl(item.url)})`);
      }
      lines.push('');
    }
    ensureDir(path.dirname(INDEX_FILE));
    fs.writeFileSync(INDEX_FILE, lines.join('\n'));

    // 目录树：保持原始多级结构，供侧栏与目录页使用
    const dirRoot = { name: '', path: '', route: '', url: URL_PREFIX, children: new Map(), docs: [] };
    for (const doc of docs) {
      const parts = doc.rel.split('/').slice(0, -1);
      let node = dirRoot;
      for (const part of parts) {
        let child = node.children.get(part);
        if (!child) {
          const childPath = node.path ? node.path + '/' + part : part;
          const childRoute = childPath.split('/').map(slugSegment).join('/');
          child = {
            name: part,
            path: childPath,
            route: childRoute,
            url: URL_PREFIX + childRoute + '/',
            children: new Map(),
            docs: []
          };
          node.children.set(part, child);
        }
        node = child;
      }
      node.docs.push({
        title: doc.title,
        url: encodeUrl(doc.url),
        date: formatDate(doc.date).slice(0, 10)
      });
    }

    const countDir = (node) => {
      let total = node.docs.length;
      for (const child of node.children.values()) total += countDir(child);
      node.count = total;
      return total;
    };
    countDir(dirRoot);

    const sortDir = (node) => {
      node.childrenArr = [...node.children.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-Hans-CN'));
      node.childrenArr.forEach(sortDir);
    };
    sortDir(dirRoot);

    const tree = dirRoot.childrenArr.map(function toNode(node) {
      return {
        name: node.name,
        path: node.path,
        url: node.url,
        count: node.count,
        children: node.childrenArr.map(toNode)
      };
    });

    const dirs = {};
    const walkDirs = (node, ancestors) => {
      for (const child of node.childrenArr) {
        dirs[child.path] = {
          name: child.name,
          path: child.path,
          route: child.route,
          url: child.url,
          count: child.count,
          ancestors,
          children: child.childrenArr.map((sub) => ({ name: sub.name, url: sub.url, count: sub.count })),
          docs: child.docs
            .slice()
            .sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title, 'zh-Hans-CN'))
        };
        walkDirs(child, ancestors.concat([{ name: child.name, url: child.url }]));
      }
    };
    walkDirs(dirRoot, [{ name: '文档库', url: URL_PREFIX }]);

    const groups = dirRoot.childrenArr.map((node) => {
      const items = docs
        .filter((doc) => doc.rel.indexOf(node.path + '/') === 0)
        .slice()
        .sort((a, b) => b.date - a.date);
      return {
        name: node.name,
        count: node.count,
        url: node.url,
        examples: items.slice(0, 4).map((item) => ({ title: item.title, url: encodeUrl(item.url) }))
      };
    });

    const tagSet = new Set();
    for (const doc of docs) for (const tag of doc.tags) tagSet.add(tag);
    const recent = docs.slice().sort((a, b) => b.date - a.date).slice(0, 10).map((item) => ({
      title: item.title,
      url: encodeUrl(item.url),
      updated: formatDate(item.updated || item.date).slice(0, 10)
    }));
    const latest = docs.slice().sort((a, b) => b.date - a.date)[0];
    const data = {
      count: docs.length,
      groups,
      tree,
      dirs,
      recent,
      tags: tagSet.size,
      updated: latest ? formatDate(latest.updated || latest.date).slice(0, 10) : '',
      url: URL_PREFIX
    };
    ensureDir(path.dirname(DATA_FILE));
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2) + '\n');
    console.log(`[import] 数据索引：${DATA_FILE}`);
  }

  console.log(`[import] 写入文档：${written}，索引：${INDEX_FILE}`);
  console.log(`[import] 附件：${assetByRel.size}，重名警告：${warnings.length}`);
  if (warnings.length) console.log('[import] 重名示例：' + warnings.slice(0, 5).join('；'));
  console.log(`[import] 完成${DRY ? '（dry-run）' : ''}`);
}

main();
