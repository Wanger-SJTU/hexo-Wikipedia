'use strict';

/**
 * HexWiki · 文本层工具（纯函数，无 Hexo 依赖，可直接单测）
 *
 * 负责：
 *  - front-matter 剥离
 *  - [[双链]] 抽取（跳过围栏代码块与行内代码）
 *  - 双链内部语法解析（目标 / 显示文字 / 章节锚点）
 *  - Markdown 去格式化（摘要 / 搜索正文 / 反链上下文）
 *  - 反链上下文摘要（snippet）
 *  - 从渲染后的 HTML 提取标题（含 marked 生成的 id）
 */

const WIKILINK_RE = /\[\[([^[\]\n]{1,300})\]\]/g;
const FENCE_RE = /^\s{0,3}(`{3,}|~{3,})/;
const FRONT_MATTER_RE = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/;

/** 去掉 YAML front-matter（若存在） */
function stripFrontMatter(raw) {
  if (!raw) return '';
  return String(raw).replace(FRONT_MATTER_RE, '');
}

/**
 * 解析 [[...]] 内部：`目标#章节|显示文字`
 * @returns {{target:string, label:string|null, anchor:string|null}|null}
 */
function parseWikilinkInner(inner) {
  if (inner == null) return null;
  let text = String(inner).trim();
  if (!text) return null;

  let label = null;
  const pipe = text.indexOf('|');
  if (pipe !== -1) {
    label = text.slice(pipe + 1).trim() || null;
    text = text.slice(0, pipe).trim();
  }

  let anchor = null;
  const hash = text.indexOf('#');
  if (hash !== -1) {
    anchor = text.slice(hash + 1).trim() || null;
    text = text.slice(0, hash).trim();
  }

  if (!text && !anchor) return null;
  return { target: text, label, anchor };
}

/** 把行内代码替换成等长空格，避免在代码里误判双链（保持下标不变） */
function maskInlineCode(line) {
  return String(line).replace(/`[^`\n]*`/g, (m) => ' '.repeat(m.length));
}

/**
 * 从 Markdown 中抽取所有双链。
 * @param {string} markdown
 * @param {{snippetRadius?: number, withSnippet?: boolean}} [opts]
 * @returns {Array<{raw:string,target:string,label:string|null,anchor:string|null,index:number,snippet:string}>}
 */
function extractWikilinks(markdown, opts = {}) {
  const links = [];
  if (!markdown) return links;

  const radius = Number.isFinite(opts.snippetRadius) ? opts.snippetRadius : 110;
  const withSnippet = opts.withSnippet !== false;

  const lines = String(markdown).split('\n');
  let offset = 0;
  let inFence = false;
  let fenceChar = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fence = FENCE_RE.exec(line);
    if (fence) {
      if (!inFence) {
        inFence = true;
        fenceChar = fence[1][0];
      } else if (fence[1][0] === fenceChar) {
        inFence = false;
        fenceChar = '';
      }
      offset += line.length + 1;
      continue;
    }

    if (!inFence) {
      const masked = maskInlineCode(line);
      WIKILINK_RE.lastIndex = 0;
      let m;
      while ((m = WIKILINK_RE.exec(masked))) {
        // ![[...]] 视为嵌入语法，不当作双链
        if (m.index > 0 && masked[m.index - 1] === '!') continue;
        const parsed = parseWikilinkInner(m[1]);
        if (!parsed) continue;
        const index = offset + m.index;
        links.push({
          raw: line.substr(m.index, m[0].length),
          target: parsed.target,
          label: parsed.label,
          anchor: parsed.anchor,
          index,
          snippet: withSnippet ? snippetAround(markdown, index, radius) : ''
        });
      }
    }
    offset += line.length + 1;
  }
  return links;
}

/**
 * 抽取反链上下文：取链接所在段落（行窗口），去 Markdown 后截断。
 */
function snippetAround(markdown, index, radius = 110) {
  const src = String(markdown || '');
  if (!src) return '';
  const r = Math.max(20, Number(radius) || 110);

  let start = Math.max(0, index - r);
  if (start > 0) {
    const nl = src.indexOf('\n', start);
    if (nl !== -1 && nl < index) start = nl + 1;
  }
  let end = Math.min(src.length, index + r);
  if (end < src.length) {
    const nl = src.lastIndexOf('\n', end);
    if (nl > index) end = nl;
  }

  let text = stripMarkdown(src.slice(start, end)).replace(/\s+/g, ' ').trim();
  if (!text) return '';
  if (start > 0) text = '…' + text;
  if (end < src.length) text = text + '…';
  const max = 220;
  if (text.length > max) {
    // 尽量保留链接附近的内容
    const head = Math.floor(max * 0.42);
    text = text.slice(0, head) + ' … ' + text.slice(-(max - head - 3));
  }
  return text;
}

/** 解码常见 HTML 实体 */
function decodeEntities(text) {
  return String(text || '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");
}

/** 去掉 HTML 标签 */
function stripHtml(text) {
  return decodeEntities(String(text || '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

/** Markdown → 纯文本（用于摘要 / 搜索 / 反链上下文） */
function stripMarkdown(md) {
  if (!md) return '';
  let text = String(md);
  text = text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
  text = text.replace(/```[\s\S]*?```/g, ' ');
  text = text.replace(/~~~[\s\S]*?~~~/g, ' ');
  text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1');
  text = text.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
  text = text.replace(/\[\[([^[\]\n]+)\]\]/g, (m, inner) => {
    const parsed = parseWikilinkInner(inner);
    if (!parsed) return inner;
    return parsed.label || parsed.target || inner;
  });
  text = text.replace(/`([^`]*)`/g, '$1');
  text = text.replace(/<[^>]+>/g, ' ');
  text = text.replace(/^#{1,6}\s+/gm, '');
  text = text.replace(/^\s{0,3}>\s?/gm, '');
  text = text.replace(/^\s*[-*+]\s+/gm, '');
  text = text.replace(/^\s*\d+\.\s+/gm, '');
  text = text.replace(/^\s*\|?[\s:|-]+\|[\s|:-]*$/gm, ' ');
  text = text.replace(/\|/g, ' ');
  text = text.replace(/(\*\*|__)([\s\S]*?)\1/g, '$2');
  text = text.replace(/~~([\s\S]*?)~~/g, '$1');
  text = text.replace(/(\*|_)([^*_\n]+)\1/g, '$2');
  text = text.replace(/^\s*([-=])\1{2,}\s*$/gm, ' ');
  return text.replace(/\s+/g, ' ').trim();
}

/** 第一段有效正文（用于自动摘要） */
function firstParagraph(md, limit = 140) {
  const body = stripFrontMatter(md);
  const blocks = body.split(/\n{2,}/);
  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;
    if (/^#{1,6}\s/.test(trimmed)) continue;
    if (/^```|^~~~/.test(trimmed)) continue;
    if (/^\s*([-*+]|\d+\.)\s/.test(trimmed)) continue;
    if (/^\s*\|/.test(trimmed)) continue;
    if (/^\s*>/.test(trimmed)) {
      const quoted = stripMarkdown(trimmed);
      if (quoted) return truncate(quoted, limit);
      continue;
    }
    const text = stripMarkdown(trimmed);
    if (text) return truncate(text, limit);
  }
  return '';
}

function truncate(text, limit) {
  const s = String(text || '');
  if (s.length <= limit) return s;
  return s.slice(0, Math.max(1, limit - 1)).trimEnd() + '…';
}

/**
 * 从 Markdown 提取标题（兜底用；正式标题列表从渲染后的 HTML 提取）
 * @returns {Array<{level:number,text:string,raw:string,index:number}>}
 */
function extractHeadings(md) {
  const out = [];
  if (!md) return out;
  const lines = String(md).split('\n');
  let inFence = false;
  let fenceChar = '';
  let offset = 0;
  for (const line of lines) {
    const fence = FENCE_RE.exec(line);
    if (fence) {
      if (!inFence) {
        inFence = true;
        fenceChar = fence[1][0];
      } else if (fence[1][0] === fenceChar) {
        inFence = false;
      }
      offset += line.length + 1;
      continue;
    }
    if (!inFence) {
      const m = /^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line);
      if (m) {
        const raw = m[2].trim();
        const text = stripMarkdown(raw);
        if (text) {
          out.push({ level: m[1].length, text, raw, index: offset + line.indexOf(m[2]) });
        }
      }
    }
    offset += line.length + 1;
  }
  return out;
}

/**
 * 从渲染后的 HTML 提取标题（含 id，供文内目录 / 搜索 / 锚点解析）
 * @returns {Array<{level:number,id:string,text:string}>}
 */
function extractHeadingsFromHtml(html) {
  const out = [];
  if (!html) return out;
  const re = /<h([1-6])\b([^>]*)>([\s\S]*?)<\/h\1>/gi;
  let m;
  while ((m = re.exec(html))) {
    const attrs = m[2] || '';
    const idMatch = /\bid\s*=\s*["']([^"']*)["']/i.exec(attrs);
    const text = stripHtml(m[3]);
    if (!text) continue;
    out.push({
      level: Number(m[1]),
      id: idMatch ? decodeEntities(idMatch[1]) : '',
      text
    });
  }
  return out;
}

module.exports = {
  WIKILINK_RE,
  stripFrontMatter,
  parseWikilinkInner,
  extractWikilinks,
  snippetAround,
  stripMarkdown,
  stripHtml,
  decodeEntities,
  firstParagraph,
  extractHeadings,
  extractHeadingsFromHtml,
  truncate
};
