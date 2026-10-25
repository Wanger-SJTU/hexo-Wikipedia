'use strict';

/**
 * HexWiki · 双链自动改链内核（纯函数，可单测）
 *
 * 能力：
 *  - 从 Markdown 中提取 front-matter 的 title / aliases / 文件名 stem；
 *  - 比较前后两次扫描，得到「旧名字 -> 新名字」映射（标题改名、文件重命名）；
 *  - 把正文里的 [[旧名字]] / [[旧名字|显示]] / [[旧名字#章节]] 改写为新名字，
 *    跳过围栏代码块与行内代码，保留显示文字与章节锚点，不改 front-matter。
 */

const WIKILINK_RE = /\[\[([^[\]\n]{1,300})\]\]/g;
const FENCE_RE = /^\s{0,3}(`{3,}|~{3,})/;
const FRONT_MATTER_RE = /^(---\r?\n[\s\S]*?\r?\n---\r?\n?)/;

function normalizeName(value) {
  return String(value == null ? '' : value)
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function parseInner(inner) {
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

/** 改写一行中的双链（跳过行内代码） */
function rewriteLine(line, mappings, stats) {
  if (line.indexOf('[[') === -1) return line;
  return line.replace(/(`[^`\n]*`)|([^`]+)/g, (segment, code, text) => {
    if (code) return segment;
    return text.replace(WIKILINK_RE, (raw, inner) => {
      const parsed = parseInner(inner);
      if (!parsed || !parsed.target) return raw;
      const key = normalizeName(parsed.target);
      if (!mappings.has(key)) return raw;
      const next = mappings.get(key);
      if (normalizeName(next) === key) return raw;
      stats.count += 1;
      return '[[' + next +
        (parsed.anchor ? '#' + parsed.anchor : '') +
        (parsed.label ? '|' + parsed.label : '') +
        ']]';
    });
  });
}

/**
 * 改写整篇 Markdown。
 * @param {string} raw 原文
 * @param {Map<string,string>} mappings 归一化旧名 -> 新名
 * @returns {{content:string, count:number}} count = 改写的链接数
 */
function rewriteContent(raw, mappings) {
  const text = String(raw == null ? '' : raw);
  const stats = { count: 0 };
  if (!mappings || !mappings.size) return { content: text, count: 0 };

  const fm = FRONT_MATTER_RE.exec(text);
  const head = fm ? fm[1] : '';
  const body = fm ? text.slice(head.length) : text;

  const lines = body.split('\n');
  let fence = null;
  const out = lines.map((line) => {
    const m = FENCE_RE.exec(line);
    if (m) {
      if (!fence) fence = m[1][0];
      else if (m[1][0] === fence) fence = null;
      return line;
    }
    if (fence) return line;
    return rewriteLine(line, mappings, stats);
  });

  return { content: head + out.join('\n'), count: stats.count };
}

/**
 * 由前后两次文件快照计算映射。
 * 快照：{ [相对路径]: { title, aliases, stem, hash } }
 * @returns {{mappings: Map<string,string>, notes: string[]}}
 */
function buildMappings(prev, next) {
  const mappings = new Map();
  const notes = [];
  const add = (from, to, kind) => {
    const f = String(from || '').trim();
    const t = String(to || '').trim();
    if (!f || !t) return;
    const key = normalizeName(f);
    if (!key || normalizeName(t) === key) return;
    if (mappings.has(key) && normalizeName(mappings.get(key)) !== normalizeName(t)) {
      notes.push(`跳过有歧义的映射（${kind}）：${f} -> ${t}`);
      return;
    }
    mappings.set(key, t);
  };

  // 1) 同一路径标题改名
  for (const rel of Object.keys(next)) {
    if (prev[rel] && prev[rel].title !== next[rel].title) {
      add(prev[rel].title, next[rel].title, '标题');
    }
  }

  // 2) 文件重命名：先按标题一致配对，再按内容哈希配对
  const removed = Object.keys(prev).filter((rel) => !next[rel]);
  const added = Object.keys(next).filter((rel) => !prev[rel]);
  const used = new Set();
  for (const rel of removed) {
    let match = added.find((candidate) => !used.has(candidate) &&
      normalizeName(next[candidate].title) === normalizeName(prev[rel].title));
    if (!match) {
      match = added.find((candidate) => !used.has(candidate) && next[candidate].hash === prev[rel].hash);
    }
    if (!match) continue;
    used.add(match);
    add(prev[rel].stem, next[match].stem, '文件名');
    add(prev[rel].title, next[match].title, '标题');
    notes.push(`重命名：${rel} -> ${match}`);
  }

  return { mappings, notes };
}

module.exports = {
  normalizeName,
  parseInner,
  rewriteContent,
  rewriteLine,
  buildMappings
};
