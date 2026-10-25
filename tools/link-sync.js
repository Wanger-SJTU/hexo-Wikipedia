#!/usr/bin/env node
'use strict';

/**
 * HexWiki · 双链自动改链工具
 *
 * 监视 source/ 下的 Markdown：当页面 title 改名或文件被重命名时，
 * 自动把所有 [[旧名字]]（含 |显示文字、#章节）改成新名字。
 *
 * 用法：
 *   node tools/link-sync.js --once        # 扫描并修复一次（默认）
 *   node tools/link-sync.js --watch       # 常驻，默认每 2 秒检查一次
 *   node tools/link-sync.js --watch --interval=1000
 *   node tools/link-sync.js --dry-run     # 只报告，不写文件
 *   node tools/link-sync.js --quiet       # 仅输出改动/警告
 *
 * 说明：
 *   - 状态文件 .link-sync-state.json（已 gitignore），记录每个页面的 title/stem/hash；
 *   - 跳过围栏代码块与行内代码；不改 front-matter；
 *   - 文件重命名优先按 title 配对，其次按内容哈希配对；
 *   - 只处理 source/ 下的 .md。
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { rewriteContent, buildMappings } = require('./lib/link-sync-core');

const args = process.argv.slice(2);
const hasFlag = (name) => args.some((arg) => arg === name || arg.startsWith(name + '='));
const argValue = (name, fallback) => {
  const hit = args.find((arg) => arg.startsWith(name + '='));
  return hit ? hit.slice(name.length + 1) : fallback;
};

const ROOT = path.resolve(argValue('--root', process.env.LINK_SYNC_ROOT || path.join(__dirname, '..')));
const SOURCE_DIR = path.join(ROOT, 'source');
const STATE_FILE = path.join(ROOT, '.link-sync-state.json');
const LOCK_FILE = path.join('/tmp', 'hexo-link-sync.pid');
const DRY_RUN = hasFlag('--dry-run');
const QUIET = hasFlag('--quiet');
const WATCH = hasFlag('--watch');
const INTERVAL = Math.max(500, Number(argValue('--interval', 2000)) || 2000);

const IGNORE_DIRS = new Set(['node_modules', 'public', '.git', '.deploy_git', '.sync-trash']);

let frontMatter = null;
try {
  frontMatter = require(path.join(ROOT, 'node_modules', 'hexo-front-matter'));
} catch (err) {
  frontMatter = null;
}

function log(message) {
  if (QUIET && !/^(改动|提示|初始化|错误|完成)/.test(message)) return;
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  console.log(`[${stamp}] ${message}`);
}

function walk(dir, out) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    return out;
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!IGNORE_DIRS.has(entry.name)) walk(abs, out);
    } else if (entry.isFile() && /\.md$/i.test(entry.name)) {
      out.push(abs);
    }
  }
  return out;
}

function parseTitle(raw) {
  if (frontMatter && typeof frontMatter.parse === 'function') {
    try {
      const data = frontMatter.parse(raw);
      if (data && typeof data === 'object') {
        return {
          title: data.title != null ? String(data.title) : '',
          aliases: Array.isArray(data.aliases)
            ? data.aliases.map(String)
            : data.aliases
              ? String(data.aliases).split(/[,，;；]/).map((s) => s.trim()).filter(Boolean)
              : [],
          content: data._content != null ? String(data._content) : raw
        };
      }
    } catch (err) {
      /* fallback */
    }
  }
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw);
  const block = m ? m[1] : '';
  const titleMatch = /^title:\s*(.+)$/m.exec(block);
  return {
    title: titleMatch ? titleMatch[1].replace(/^["']|["']$/g, '').trim() : '',
    aliases: [],
    content: raw
  };
}

function scan() {
  const files = {};
  for (const abs of walk(SOURCE_DIR, [])) {
    let raw;
    try {
      raw = fs.readFileSync(abs, 'utf8');
    } catch (err) {
      continue;
    }
    const parsed = parseTitle(raw);
    if (!parsed.title) continue;
    const rel = path.relative(ROOT, abs).split(path.sep).join('/');
    files[rel] = {
      title: parsed.title,
      aliases: parsed.aliases,
      stem: path.basename(abs, path.extname(abs)),
      hash: crypto.createHash('sha1').update(raw).digest('hex')
    };
  }
  return files;
}

function loadState() {
  try {
    const data = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    if (data && data.files && typeof data.files === 'object') return data;
  } catch (err) {
    /* no state yet */
  }
  return null;
}

function saveState(files) {
  const tmp = STATE_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify({ version: 1, updatedAt: new Date().toISOString(), files }, null, 2));
  fs.renameSync(tmp, STATE_FILE);
}

function applyChanges(mappings, dryRun) {
  const files = walk(SOURCE_DIR, []);
  let changedFiles = 0;
  let changedLinks = 0;
  for (const abs of files) {
    let raw;
    try {
      raw = fs.readFileSync(abs, 'utf8');
    } catch (err) {
      continue;
    }
    const result = rewriteContent(raw, mappings);
    if (!result.count) continue;
    changedFiles += 1;
    changedLinks += result.count;
    const rel = path.relative(ROOT, abs).split(path.sep).join('/');
    if (!dryRun) fs.writeFileSync(abs, result.content);
    log(`改动：${rel}（${result.count} 条链接）`);
  }
  return { changedFiles, changedLinks };
}

function tick(initializing) {
  const next = scan();
  const state = loadState();
  if (!state) {
    if (!DRY_RUN) saveState(next);
    log(`初始化：记录 ${Object.keys(next).length} 个页面`);
    return;
  }
  const prev = state.files || {};
  const { mappings, notes } = buildMappings(prev, next);
  notes.forEach((note) => log('提示：' + note));

  if (!mappings.size) {
    if (JSON.stringify(prev) !== JSON.stringify(next) && !DRY_RUN) saveState(next);
    if (!initializing && !QUIET) {
      /* 无改动时不刷屏 */
    }
    return;
  }

  log(`检测到 ${mappings.size} 组名字变化：` +
    Array.from(mappings.entries()).map(([from, to]) => `${from} -> ${to}`).join('；'));

  const result = applyChanges(mappings, DRY_RUN);
  if (DRY_RUN) {
    log(`完成（dry-run）：${result.changedFiles} 个文件、${result.changedLinks} 条链接待修改`);
    return;
  }
  saveState(scan());
  log(`完成：${result.changedFiles} 个文件、${result.changedLinks} 条链接已更新`);
}

function acquireLock() {
  try {
    const pid = Number(fs.readFileSync(LOCK_FILE, 'utf8'));
    if (pid && pid !== process.pid) {
      try {
        process.kill(pid, 0);
        console.error(`[link-sync] 已有实例在运行（pid ${pid}），本次退出`);
        process.exit(0);
      } catch (err) {
        /* stale lock */
      }
    }
  } catch (err) {
    /* no lock */
  }
  fs.writeFileSync(LOCK_FILE, String(process.pid));
  const cleanup = () => {
    try {
      if (Number(fs.readFileSync(LOCK_FILE, 'utf8')) === process.pid) fs.unlinkSync(LOCK_FILE);
    } catch (err) {
      /* ignore */
    }
  };
  process.on('exit', cleanup);
  process.on('SIGINT', () => process.exit(0));
  process.on('SIGTERM', () => process.exit(0));
}

if (WATCH) acquireLock();

if (!fs.existsSync(SOURCE_DIR)) {
  console.error(`[link-sync] 找不到 source 目录：${SOURCE_DIR}`);
  process.exit(1);
}

if (WATCH) {
  log(`开始监视 ${path.relative(process.cwd(), SOURCE_DIR) || 'source'}（每 ${INTERVAL}ms 检查一次）`);
  tick(true);
  setInterval(() => {
    try {
      tick(false);
    } catch (err) {
      log('错误：' + err.message);
    }
  }, INTERVAL);
} else {
  tick(false);
}
