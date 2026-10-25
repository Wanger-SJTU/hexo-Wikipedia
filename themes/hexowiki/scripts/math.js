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
    const text = tex.trim();
    if (!text) return whole;
    // 中文说明句/HTML 标记不应整体塞进 KaTeX，去掉美元符号按普通文本渲染
    if (/[\u3400-\u9fff]/.test(text) || /<[^>]+>|\*\*/.test(text)) return tex;
    // 纯数字/价格（$5.00$）不当公式
    if (/^[\d.,]+$/.test(text)) return whole;
    const mathLike = /[\\^_{}=<>]|\b(sum|frac|sqrt|int|cdot|times|alpha|beta|gamma|theta|lambda|sigma|omega|prod|lim|log|sin|cos|tan)\b/.test(text);
    // 内侧有空格时，要求内容像公式，避免把 “$5 and $10” 当公式
    if ((/^\s|\s$/.test(tex)) && !mathLike) return whole;
    return addToken(store, text, false) || whole;
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

function wrapBareMathLines(content) {
  const lines = String(content == null ? '' : content).split('\n');
  const out = [];
  let fence = null;
  const mathHint = /\\(left|right|begin\{|end\{|frac|sum|int|cdot|times|sqrt|mathbf|text|overline|hat|vec|displaystyle)/;
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
    let text = line.trim();
    if (!text) {
      out.push(line);
      continue;
    }
    const dollarCount = (text.match(/\$/g) || []).length;
    if (dollarCount >= 2 || /^\\\(|^\\\[/.test(text) || text.indexOf('`') !== -1) {
      out.push(line);
      continue;
    }
    if (/^[#>]|^[-+]\s|^!\[|^\[.*\]\(|role="presentation"|^</.test(text)) {
      out.push(line);
      continue;
    }
    // 只处理独立公式行：不含中文、不含 HTML/Markdown 标记，且以字母或反斜杠开头
    if (/[\u3400-\u9fff]/.test(text) || /<[^>]+>|\*\*/.test(text) || !/^[A-Za-z\\]/.test(text)) {
      out.push(line);
      continue;
    }
    // 至少要有公式命令 + 等号/矩阵环境，避免误伤普通文本
    if (!mathHint.test(text)) {
      out.push(line);
      continue;
    }
    if (!/[=]|\\begin\{/.test(text)) {
      out.push(line);
      continue;
    }
    text = text.replace(/\s*\$$/, ''); // 行尾残留的单个 $
    if (text.length > 2000) {
      out.push(line);
      continue;
    }
    out.push('$$');
    out.push(text);
    out.push('$$');
  }
  return out.join('\n');
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
  if (!/\$|\\\(|\\\[|\\(left|right|begin\{)/.test(data.content)) return data;
  data.content = wrapBareMathLines(data.content);
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
