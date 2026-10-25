'use strict';
/** HexWiki 交互冒烟测试（CDP，无第三方依赖，需要本机 Chrome/Chromium）
 * 前置：另一个终端运行 npm run server（默认 http://127.0.0.1:4100）
 * 用法：node tools/check-interactions.js
 * 可用 WIKI_URL / CDP_PORT / CHROME_BIN 覆盖默认值。
 */
const { spawn } = require('child_process');
const fs = require('fs');
const PORT = Number(process.env.CDP_PORT || 9334);
const BASE = process.env.WIKI_URL || 'http://127.0.0.1:4100';
const CHROME = process.env.CHROME_BIN || '/usr/bin/google-chrome';

if (!fs.existsSync(CHROME)) {
  console.error('[check-interactions] 找不到浏览器：' + CHROME + '\n' +
    '请安装 Chrome/Chromium，或用 CHROME_BIN=/path/to/chrome 指定。');
  process.exit(2);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class CDP {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 0;
    this.pending = new Map();
    this.ready = new Promise((res, rej) => { this.ws.onopen = () => res(); this.ws.onerror = rej; });
    this.ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
      }
    };
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async eval(expression) {
    const res = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (res.exceptionDetails) throw new Error('EVAL ERROR: ' + JSON.stringify(res.exceptionDetails).slice(0, 500));
    return res.result.value;
  }
}

(async () => {
  const profile = '/tmp/cdp-interact-' + process.pid;
  const chrome = spawn(CHROME, ['--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
    '--disable-dev-shm-usage', '--no-first-run', `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`, '--window-size=1440,900', 'about:blank'], { stdio: 'ignore' });

  const results = [];
  const record = (name, pass, detail) => {
    results.push({ name, pass, detail });
    console.log((pass ? 'PASS ' : 'FAIL ') + name + (detail ? '  → ' + JSON.stringify(detail) : ''));
  };

  try {
    let list = null;
    for (let i = 0; i < 60; i++) {
      try { list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); break; }
      catch (e) { await sleep(200); }
    }
    const target = list.find((t) => t.type === 'page');
    const cdp = new CDP(target.webSocketDebuggerUrl);
    await cdp.ready;
    await cdp.send('Runtime.enable');
    await cdp.send('Page.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

    const goto = async (path) => {
      await cdp.send('Page.navigate', { url: BASE + path });
      await sleep(1600);
    };

    /* 1. 搜索建议 */
    await goto('/');
    const search = await cdp.eval(`(async () => {
      const input = document.querySelector('.wiki-search__input');
      if (!input) return { error: 'no input' };
      input.focus();
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(input, '双链');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(r => setTimeout(r, 800));
      const box = document.querySelector('.search-suggest');
      const items = [...document.querySelectorAll('.search-suggest__item')];
      return {
        visible: !!box && !box.hidden,
        count: items.length,
        first: items[0] ? items[0].textContent.trim().slice(0, 40) : '',
        firstHref: items[0] ? (items[0].querySelector('a') || items[0]).getAttribute('href') : ''
      };
    })()`);
    record('搜索建议（输入“双链”）', !search.error && search.count > 0 && search.visible, search);

    /* 2. 点击建议 → 跳转 */
    const clicked = await cdp.eval(`(() => {
      const item = document.querySelector('.search-suggest__item');
      if (!item) return { error: 'no item' };
      const target = item.querySelector('a') || item;
      target.click();
      return { clicked: true };
    })()`);
    await sleep(1400);
    const nav = await cdp.eval(`({ path: location.pathname, title: document.title })`);
    record('点击搜索结果跳转', !clicked.error && !!nav.path && nav.path !== '/', nav);

    /* 3. 红链点击不跳转 + 提示 */
    await goto('/wiki/faq/');
    const redlink = await cdp.eval(`(async () => {
      const before = location.pathname;
      const link = document.querySelector('a.wikilink--missing');
      if (!link) return { error: 'no red link' };
      link.click();
      await new Promise(r => setTimeout(r, 400));
      const toast = document.querySelector('.wiki-toast');
      return { before, after: location.pathname, toast: toast ? toast.textContent : '' };
    })()`);
    record('红链点击不跳转并提示', !redlink.error && redlink.before === redlink.after && !!redlink.toast, redlink);

    /* 4. 深色模式切换与持久化 */
    const dark = await cdp.eval(`(async () => {
      const btn = document.querySelector('[data-theme-toggle]');
      if (!btn) return { error: 'no toggle' };
      const before = document.documentElement.getAttribute('data-theme');
      btn.click();
      await new Promise(r => setTimeout(r, 200));
      const after = document.documentElement.getAttribute('data-theme');
      return { before, after, stored: localStorage.getItem('hexowiki.theme') || '' };
    })()`);
    record('深色模式切换', !dark.error && dark.after && dark.after !== dark.before, dark);

    /* 5. 侧栏筛选 */
    await goto('/wiki/wikilinks/');
    const filter = await cdp.eval(`(async () => {
      const input = document.querySelector('.nav-tree__filter');
      if (!input) return { error: 'no filter' };
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      const before = document.querySelectorAll('.nav-tree__item').length;
      setter.call(input, '图谱');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(r => setTimeout(r, 400));
      const visible = [...document.querySelectorAll('.nav-tree__item')].filter(el => el.offsetParent !== null).length;
      return { before, visible, matched: [...document.querySelectorAll('.nav-tree__link')].filter(a => a.offsetParent !== null).map(a => a.textContent.trim()) };
    })()`);
    record('侧栏目录筛选', !filter.error && filter.visible < filter.before && filter.matched.length > 0, filter);

    /* 5b. 标签索引筛选 */
    await goto('/tags/');
    const tagFilter = await cdp.eval(`(async () => {
      const input = document.querySelector('[data-tag-filter]');
      if (!input) return { error: 'no tag filter' };
      const items = [...document.querySelectorAll('[data-tag-item]')];
      const before = items.filter((i) => !i.hidden).length;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(input, '链接');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 350));
      const visible = items.filter((i) => !i.hidden).length;
      const status = (document.querySelector('[data-tag-status]') || {}).textContent || '';
      return { before, visible, status };
    })()`);
    record('标签索引筛选', !tagFilter.error && tagFilter.visible > 0 && tagFilter.visible < tagFilter.before && /个标签/.test(tagFilter.status), tagFilter);

    /* 5c. 数学公式与代码复制 */
    await goto('/wiki/math-code/');
    const mathCode = await cdp.eval(`({
      katex: document.querySelectorAll('.katex').length,
      copy: document.querySelectorAll('.code-copy').length
    })`);
    record('数学公式与代码复制', mathCode.katex > 0 && mathCode.copy > 0, mathCode);

    /* 6. 移动端抽屉 */
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await goto('/wiki/wikilinks/');
    const drawer = await cdp.eval(`(async () => {
      const btn = document.querySelector('[data-menu-toggle]');
      if (!btn) return { error: 'no menu toggle' };
      btn.click();
      await new Promise(r => setTimeout(r, 400));
      return { open: document.body.classList.contains('is-drawer-open'), hamburgerVisible: btn.offsetParent !== null };
    })()`);
    record('移动端抽屉', !drawer.error && drawer.open === true, drawer);

    /* 7. 图谱渲染 + 搜索高亮 */
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await goto('/graph/');
    await sleep(1200);
    const graph = await cdp.eval(`(async () => {
      const canvas = document.querySelector('[data-graph-canvas]');
      if (!canvas) return { error: 'no canvas' };
      const ctx = canvas.getContext('2d');
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let painted = 0;
      for (let i = 3; i < data.length; i += 4000) if (data[i] > 0) painted++;
      const input = document.querySelector('[data-graph-search]');
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(input, '双链');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(r => setTimeout(r, 600));
      const status = document.querySelector('[data-graph-search-status]');
      return {
        canvas: canvas.width + 'x' + canvas.height,
        paintedSamples: painted,
        status: status ? status.textContent.trim() : '',
        legend: document.querySelectorAll('.graph-legend__item').length
      };
    })()`);
    record('图谱画布渲染', !graph.error && graph.paintedSamples > 0, graph);

    /* 7.1 画布像素比：位图/CSS 必须精确等于 devicePixelRatio，否则每帧重采样会发虚/拖影 */
    const pixelRatio = await cdp.eval(`(() => {
      const c = document.querySelector('[data-graph-canvas]');
      if (!c) return { error: 'no canvas' };
      return {
        bitmapRatio: Number((c.width / c.clientWidth).toFixed(4)),
        dpr: window.devicePixelRatio,
        cssWidth: c.style.width,
        clientWidth: c.clientWidth
      };
    })()`);
    record('图谱画布像素比精确（无重采样）',
      !pixelRatio.error && Math.abs(pixelRatio.bitmapRatio - pixelRatio.dpr) < 0.01,
      pixelRatio);
    record('图谱搜索高亮状态', !graph.error && graph.status.length > 0, { status: graph.status });

    /* 7.2 拖动节点不应与其它节点重叠（硬碰撞分离回归）
       用 reduced-motion 让力导向立即结算，节点坐标稳定后做确定性拖拽 */
    await cdp.send('Emulation.setEmulatedMedia', {
      media: 'screen', features: [{ name: 'prefers-reduced-motion', value: 'reduce' }]
    });
    await goto('/graph/?graph-debug=1');
    await sleep(500);
    const pick = await cdp.eval(`(() => {
      const g = window.__graphDebug;
      if (!g) return { error: 'no debug hook' };
      const ns = g.nodes.slice().sort((a, b) => (b.inCount + b.outCount) - (a.inCount + a.outCount));
      const A = ns[0];
      const linked = g.links.filter((l) => l.source === A || l.target === A).map((l) => l.source === A ? l.target : l.source);
      const B = linked[0] || ns[1];
      const c = document.querySelector('[data-graph-canvas]');
      const rect = c.getBoundingClientRect();
      const cam = g.camera;
      return {
        a: A.id, b: B.id,
        ax: rect.left + A.x * cam.k + cam.x,
        ay: rect.top + A.y * cam.k + cam.y
      };
    })()`);
    let minGap = Infinity;
    let grabbed = null;
    if (!pick.error) {
      await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: pick.ax, y: pick.ay, button: 'left', buttons: 1, clickCount: 1 });
      grabbed = await cdp.eval(`(() => {
        const g = window.__graphDebug;
        return g.pointer && g.pointer.node ? g.pointer.node.id : null;
      })()`);
      for (let i = 0; i < 20; i += 1) {
        const p = await cdp.eval(`(() => {
          const g = window.__graphDebug;
          const c = document.querySelector('[data-graph-canvas]');
          const rect = c.getBoundingClientRect();
          const cam = g.camera;
          const A = g.nodes.find((n) => n.id === ${JSON.stringify(pick.a)});
          const B = g.nodes.find((n) => n.id === ${JSON.stringify(pick.b)});
          const sx = (n) => rect.left + n.x * cam.k + cam.x;
          const sy = (n) => rect.top + n.y * cam.k + cam.y;
          const rad = (n) => (4 + Math.min(20, Number(n.size) || 4) * 0.75 + (n.current ? 2 : 0)) * cam.k;
          return {
            bx: sx(B), by: sy(B),
            gap: Math.hypot(sx(A) - sx(B), sy(A) - sy(B)) - rad(A) - rad(B)
          };
        })()`);
        minGap = Math.min(minGap, p.gap);
        await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p.bx, y: p.by, button: 'left', buttons: 1 });
        await sleep(50);
      }
      await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: pick.ax, y: pick.ay, button: 'left', buttons: 0, clickCount: 1 });
    }
    await cdp.send('Emulation.setEmulatedMedia', { media: 'screen', features: [] });
    record('拖动节点不与其他节点重叠（碰撞分离）', !pick.error && grabbed === pick.a && minGap > -1.5, {
      grabbed, minGap: Number.isFinite(minGap) ? Number(minGap.toFixed(2)) : null,
      pair: [pick.a, pick.b]
    });

    /* 8. 局部图数据与画布 */
    await goto('/wiki/wikilinks/');
    const local = await cdp.eval(`(async () => {
      const json = document.getElementById('wiki-local-graph');
      const canvas = document.querySelector('[data-graph-canvas]');
      if (!json) return { error: 'no data' };
      const parsed = JSON.parse(json.textContent);
      return {
        nodes: parsed.nodes.length,
        links: parsed.links.length,
        canvas: canvas ? canvas.width + 'x' + canvas.height : 'none'
      };
    })()`);
    record('局部关系图数据与画布', !local.error && local.nodes > 0 && local.canvas !== 'none', local);

    const failed = results.filter((r) => !r.pass);
    console.log('\n' + (failed.length ? '❌ 失败 ' + failed.length + '/' + results.length : '✅ 交互测试全部通过 ' + results.length + ' 项'));
    process.exitCode = failed.length ? 1 : 0;
    cdp.ws.close();
  } finally {
    chrome.kill('SIGKILL');
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) {}
  }
})().catch((err) => { console.error('FAILED:', err.message); process.exit(1); });
