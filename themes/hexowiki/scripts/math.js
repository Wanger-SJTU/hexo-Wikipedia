'use strict';

/**
 * 数学公式占位符：
 * marked 的 breaks=true 会把 $$ 块拆成 <br>，并且会吃掉 \, 等反斜杠；
 * 这里在 Markdown 渲染前把公式抽成占位符，渲染后再还原成 .math-tex 节点，
 * 由 KaTeX 在浏览器端精确渲染。
 */
const TOKEN_RE = /@@HEXOMATH_(\d+)@@/g;

function escapeAttr(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '&#10;');
}

function addToken(store, tex, display) {
  const value = String(tex == null ? '' : tex).trim();
  if (!value) return '';
  const index = store.length;
  store.push({ tex: value, display: !!display });
  return `@@HEXOMATH_${index}@@`;
}

function extractInline(text, store) {
  let out = String(text);

  // $$...$$（单行块级）
  out = out.replace(/(?<!\\)\$\$([\s\S]+?)\$\$/g, (whole, tex) => addToken(store, tex, true) || whole);
  // \[...\]
  out = out.replace(/(?<!\\)\\\[([\s\S]+?)\\\]/g, (whole, tex) => addToken(store, tex, true) || whole);
  // \(...\)
  out = out.replace(/(?<!\\)\\\(([\s\S]+?)\\\)/g, (whole, tex) => addToken(store, tex, false) || whole);
  // $...$（行内；拒绝首尾空白，避免把 “$5 and $10” 当公式）
  out = out.replace(/(?<!\\)\$([^$\n]+?)\$/g, (whole, tex) => {
    if (!tex.trim() || /^\s|\s$/.test(tex)) return whole;
    return addToken(store, tex, false) || whole;
  });

  return out;
}

function processLine(line, store) {
  // 行内代码不参与公式解析
  return line.replace(/(`+[^`]*?`+)/g, (code) => code)
    .split(/(`+[^`]*?`+)/g)
    .map((part) => (/^`/.test(part) ? part : extractInline(part, store)))
    .join('');
}

function extractMath(content, store) {
  const lines = String(content == null ? '' : content).split('\n');
  const out = [];
  let fence = null;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const fenceMatch = /^\s{0,3}(`{3,}|~{3,})/.exec(line);
    if (fenceMatch) {
      if (!fence) fence = fenceMatch[1][0];
      else if (fenceMatch[1][0] === fence) fence = null;
      out.push(line);
      i += 1;
      continue;
    }
    if (fence) {
      out.push(line);
      i += 1;
      continue;
    }

    const trimmed = line.trim();
    if (trimmed === '$$' || trimmed === '\\[') {
      const close = trimmed === '$$' ? '$$' : '\\]';
      const body = [];
      let j = i + 1;
      while (j < lines.length && lines[j].trim() !== close) {
        body.push(lines[j]);
        j += 1;
      }
      if (j < lines.length) {
        const token = addToken(store, body.join('\n'), true);
        if (token) {
          out.push(token);
          i = j + 1;
          continue;
        }
      }
    }

    // 4 空格缩进代码块保持原样
    if (/^( {4}|\t)/.test(line)) {
      out.push(line);
      i += 1;
      continue;
    }

    out.push(processLine(line, store));
    i += 1;
  }

  return out.join('\n');
}

function restoreMath(html, store) {
  return String(html == null ? '' : html).replace(TOKEN_RE, (whole, index) => {
    const item = store[Number(index)];
    if (!item) return whole;
    const display = item.display ? '1' : '0';
    const className = item.display ? 'math-tex math-display' : 'math-tex';
    return `<span class="${className}" data-display="${display}" data-tex="${escapeAttr(item.tex)}"></span>`;
  });
}

hexo.extend.filter.register('before_post_render', function (data) {
  if (!data || typeof data.content !== 'string' || !data.content) return data;
  if (!/\$|\\\(|\\\[/.test(data.content)) return data;
  const store = [];
  const content = extractMath(data.content, store);
  if (store.length) {
    data.content = content;
    data.__hexoMath = store;
  }
  return data;
}, 11);

hexo.extend.filter.register('after_post_render', function (data) {
  if (!data || !Array.isArray(data.__hexoMath) || !data.__hexoMath.length) return data;
  data.content = restoreMath(data.content, data.__hexoMath);
  if (typeof data.excerpt === 'string' && data.excerpt) {
    data.excerpt = restoreMath(data.excerpt, data.__hexoMath);
  }
  return data;
}, 4);
