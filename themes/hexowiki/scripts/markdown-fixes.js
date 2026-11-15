'use strict';

/**
 * 修复导入文档中的“单反引号多行代码块”。
 * 原文档形如：
 *   ![](image.svg)`code
 *   more code
 *   `
 * Markdown 会把换行折叠为行内 code，这里转换为正常 fenced code block。
 */
function fixSingleBacktickBlocks(content) {
  const lines = String(content == null ? '' : content).split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const ticks = (line.match(/`/g) || []).length;
    if (ticks === 1) {
      const pos = line.lastIndexOf('`');
      const prefix = line.slice(0, pos).trim();
      const startsAtStart = prefix === '' && line.trimStart().startsWith('`');
      const afterLink = /\]\([^)]*\)$/.test(prefix);
      if (startsAtStart || afterLink) {
        let j = i + 1;
        while (j < lines.length && lines[j].trim() !== '`') j++;
        if (j < lines.length) {
          if (prefix) out.push(prefix);
          out.push('```');
          const first = line.slice(pos + 1);
          if (first.trim()) out.push(first);
          for (let k = i + 1; k < j; k++) out.push(lines[k]);
          out.push('```');
          i = j + 1;
          continue;
        }
      }
    }
    out.push(line);
    i++;
  }
  return out.join('\n');
}

hexo.extend.filter.register('before_post_render', function (data) {
  if (!data || typeof data.content !== 'string' || !data.content) return data;
  data.content = fixSingleBacktickBlocks(data.content);
  return data;
}, 10);
