/* ==========================================================================
   HexWiki — 零依赖 Canvas 力导向关系图谱
   - 整页图谱（/graph/，数据来自 /wiki-graph.json）
   - 条目页 2 跳局部图谱（数据来自内联 <script id="wiki-local-graph">）
   - 拖拽、滚轮缩放、空白平移、hover 提示、点击跳转
   - 搜索高亮 / Enter 打开第一个匹配
   - 分组着色 + 图例筛选
   - DPR 适配 + ResizeObserver
   - prefers-reduced-motion 下直接结算，不做动画
   ========================================================================== */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var FONT_STACK = '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans CJK SC", "Source Han Sans SC", "Microsoft YaHei", sans-serif';
  var DEFAULT_PALETTE = ['#3366cc', '#14866d', '#ac6600', '#8a4b9c', '#0b6e8a', '#6b4ba1', '#3f6e3f'];
  var reduceMotion = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : { matches: false };

  function readJsonScript(id) {
    var element = doc.getElementById(id);
    if (!element) return null;
    try {
      return JSON.parse(element.textContent);
    } catch (err) {
      return null;
    }
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function debounce(fn, wait) {
    var timer = null;
    return function () {
      var args = arguments;
      var self = this;
      clearTimeout(timer);
      timer = setTimeout(function () {
        fn.apply(self, args);
      }, wait);
    };
  }

  function readColor(name, fallback) {
    var value = '';
    try {
      value = window.getComputedStyle(root).getPropertyValue(name);
    } catch (err) {
      value = '';
    }
    value = (value || '').trim();
    return value || fallback;
  }

  function init() {
    Array.prototype.slice.call(doc.querySelectorAll('[data-graph]')).forEach(setup);
  }

  function setup(section) {
    if (!section || section.getAttribute('data-graph-ready') === '1') return;

    var canvas = section.querySelector('[data-graph-canvas]');
    if (!canvas || !canvas.getContext) return;
    section.setAttribute('data-graph-ready', '1');

    // alpha:false：画布声明为不透明，合成时不再与页面背景/旧帧混合（可消除“浅色重影”）
    var ctx = canvas.getContext('2d', { alpha: false }) || canvas.getContext('2d');
    var stage = canvas.parentElement;
    var tooltip = section.querySelector('[data-graph-tooltip]');
    var statusEl = section.querySelector('[data-graph-status]');
    var legendEl = section.querySelector('[data-graph-legend]');
    var searchInput = section.querySelector('[data-graph-search]');
    var searchStatus = section.querySelector('[data-graph-search-status]');
    var mode = section.getAttribute('data-graph-mode') === 'full' ? 'full' : 'local';
    // 调试/兼容开关（正常使用不会带这些参数）：
    //   ?graph-animate=0  立即结算，不做初始力导向动画
    //   ?graph-layer=1    强制画布独立合成层（排查 GPU 合成残影）
    var urlQuery = window.location.search || '';
    // 运动强度：gentle（默认，缓慢漂移）/ normal（较快）/ none（无动画）
    var configMotion = section.getAttribute('data-motion') || window.__hexowikiGraphMotion || 'gentle';
    if (configMotion !== 'normal' && configMotion !== 'none') configMotion = 'gentle';
    var motionMode = /[?&]graph-motion=normal/.test(urlQuery) ? 'normal'
      : /[?&]graph-motion=gentle/.test(urlQuery) ? 'gentle'
      : configMotion;
    if (/[?&]graph-motion=none/.test(urlQuery) || /[?&]graph-animate=0/.test(urlQuery)) motionMode = 'none';
    var noAnimate = motionMode === 'none';
    var forceLayer = /[?&]graph-layer=1/.test(urlQuery);
    if (forceLayer) {
      canvas.style.transform = 'translateZ(0)';
      canvas.style.willChange = 'transform';
    }

    var messages = {
      loading: section.getAttribute('data-msg-loading') || '',
      error: section.getAttribute('data-msg-error') || '',
      ready: section.getAttribute('data-msg-ready') || '',
      readyBasic: section.getAttribute('data-msg-ready-basic') || '',
      match: section.getAttribute('data-msg-match') || '',
      noMatch: section.getAttribute('data-msg-no-match') || '',
      empty: section.getAttribute('data-msg-empty') || ''
    };
    var labels = {
      in: section.getAttribute('data-label-in') || 'in',
      out: section.getAttribute('data-label-out') || 'out',
      group: section.getAttribute('data-label-group') || 'group',
      ungrouped: section.getAttribute('data-label-ungrouped') || 'ungrouped',
      current: section.getAttribute('data-label-current') || 'current',
      missing: section.getAttribute('data-label-missing') || ''
    };

    var palette = (section.getAttribute('data-colors') || '')
      .split(',')
      .map(function (item) { return item.trim(); })
      .filter(Boolean);
    if (!palette.length) palette = DEFAULT_PALETTE;

    var nodes = [];
    var links = [];
    var nodeById = Object.create(null);
    var groups = [];
    var groupByName = Object.create(null);
    var hiddenGroups = Object.create(null);
    var matchedIds = null;
    var searchMatches = [];
    var currentId = null;
    var hovered = null;
    var userInteracted = false;
    var showLabels = section.getAttribute('data-labels') !== 'false';
    var labelsMinZoom = parseFloat(section.getAttribute('data-labels-min-zoom')) || 0.55;
    var labelsTop = parseInt(section.getAttribute('data-labels-top'), 10) || 12;
    var topLabelIds = new Set();

    Array.prototype.forEach.call(section.querySelectorAll('[data-graph-action="labels"]'), function (button) {
      button.setAttribute('aria-pressed', String(showLabels));
    });
    var autoFitDone = false;
    var debugTrack = null;

    var camera = { x: 0, y: 0, k: 1 };
    var cssW = 1;
    var cssH = 1;
    var dpr = 1;
    var dprY = 1;

    var sim = {
      running: false,
      ticks: 0,
      maxTicks: mode === 'full' ? 640 : 360,
      handle: 0
    };

    var colors = {};
    function refreshColors() {
      colors = {
        bg: readColor('--bg-subtle', '#f8f9fa'),
        surface: readColor('--bg', '#ffffff'),
        text: readColor('--text', '#202122'),
        muted: readColor('--text-muted', '#72777d'),
        edge: readColor('--border-subtle', '#c8ccd1'),
        accent: readColor('--accent', '#3366cc'),
        red: readColor('--link-red', '#d73333')
      };
    }
    refreshColors();

    var statusTimer = 0;

    function showStatus(text, persistent) {
      if (!statusEl || !text) return;
      statusEl.textContent = text;
      statusEl.hidden = false;
      clearTimeout(statusTimer);
      if (!persistent) {
        statusTimer = window.setTimeout(function () {
          statusEl.hidden = true;
        }, 6000);
      }
    }

    function hideStatus() {
      if (!statusEl) return;
      statusEl.hidden = true;
    }

    function formatTemplate(template, values) {
      if (!template) return '';
      return String(template).replace(/\{(\w+)\}/g, function (match, key) {
        return values && values[key] !== undefined ? values[key] : '';
      });
    }

    function visibleNodes() {
      return nodes.filter(function (node) {
        return !hiddenGroups[node.groupName];
      });
    }

    function visibleLinks() {
      return links.filter(function (link) {
        return !hiddenGroups[link.source.groupName] && !hiddenGroups[link.target.groupName];
      });
    }

    function nodeRadius(node) {
      var size = Number(node.size) || 4;
      var radius = 4 + Math.min(20, size) * 0.75;
      if (node.current) radius += 2;
      return radius;
    }

    // 硬碰撞分离：力导向的软排斥靠温度步进，用户把节点硬拖到另一个节点上时会叠成一个点。
    // 这里按「世界坐标下的半径和 + 间隙」强制分开；固定节点（正在拖的节点）不动，另一方被推出。
    function separateOverlaps(iterations) {
      var count = nodes.length;
      if (count < 2) return;
      var iters = Math.max(1, iterations || 1);
      for (var iter = 0; iter < iters; iter += 1) {
        for (var i = 0; i < count; i += 1) {
          var a = nodes[i];
          if (hiddenGroups[a.groupName]) continue;
          for (var j = i + 1; j < count; j += 1) {
            var b = nodes[j];
            if (hiddenGroups[b.groupName]) continue;
            var minGap = nodeRadius(a) + nodeRadius(b) + 4;
            var dx = b.x - a.x;
            var dy = b.y - a.y;
            var d2 = dx * dx + dy * dy;
            if (d2 >= minGap * minGap) continue;
            var d = Math.sqrt(d2) || 0.001;
            var push = minGap - d;
            var ux = dx / d;
            var uy = dy / d;
            if (a.fixed && b.fixed) continue;
            if (a.fixed) {
              b.x += ux * push;
              b.y += uy * push;
            } else if (b.fixed) {
              a.x -= ux * push;
              a.y -= uy * push;
            } else {
              a.x -= ux * push * 0.5;
              a.y -= uy * push * 0.5;
              b.x += ux * push * 0.5;
              b.y += uy * push * 0.5;
            }
          }
        }
      }
    }

    function readGraphData(raw) {
      nodes = [];
      links = [];
      nodeById = Object.create(null);
      groups = [];
      groupByName = Object.create(null);
      hiddenGroups = Object.create(null);
      matchedIds = null;
      searchMatches = [];
      currentId = null;
      hovered = null;

      var rawNodes = Array.isArray(raw && raw.nodes) ? raw.nodes : [];
      rawNodes.forEach(function (item) {
        if (!item || item.id === undefined || item.id === null) return;
        var id = String(item.id);
        if (nodeById[id]) return;
        var groupName = Array.isArray(item.group) ? item.group.join(' / ') : String(item.group || labels.ungrouped);
        var node = {
          id: id,
          title: String(item.title || id),
          url: item.url || '',
          groupName: groupName,
          tags: Array.isArray(item.tags) ? item.tags : [],
          inCount: Number(item.in) || 0,
          outCount: Number(item.out) || 0,
          size: Number(item.size) || 4,
          missing: !!item.missing,
          current: !!item.current,
          color: palette[0],
          x: 0,
          y: 0,
          index: nodes.length,
          fixed: false
        };
        if (node.current && !currentId) currentId = node.id;
        nodes.push(node);
        nodeById[id] = node;
      });

      if (!nodes.length) return false;

      var rawLinks = Array.isArray(raw && raw.links) ? raw.links : [];
      rawLinks.forEach(function (item) {
        if (!item) return;
        var source = nodeById[String(item.source)];
        var target = nodeById[String(item.target)];
        if (!source || !target || source === target) return;
        links.push({
          source: source,
          target: target,
          count: Number(item.count) || 1
        });
      });

      nodes.forEach(function (node) {
        if (!groupByName[node.groupName]) {
          groupByName[node.groupName] = {
            name: node.groupName,
            count: 0,
            index: groups.length,
            color: palette[groups.length % palette.length],
            nodes: [],
            missing: false,
            ungrouped: node.groupName === labels.ungrouped
          };
          groups.push(groupByName[node.groupName]);
        }
        groupByName[node.groupName].count += 1;
        groupByName[node.groupName].nodes.push(node);
        node.color = groupByName[node.groupName].color;
      });

      groups.sort(function (a, b) {
        return b.count - a.count || a.index - b.index;
      });

      var colorIndex = 0;
      groups.forEach(function (group, index) {
        group.index = index;
        group.missing = group.nodes.length > 0 && group.nodes.every(function (node) { return node.missing; });
        if (group.missing) group.color = readColor('--link-red', '#d73333');
        else if (group.ungrouped) group.color = '#72777d';
        else {
          group.color = palette[colorIndex % palette.length];
          colorIndex += 1;
        }
      });

      nodes.forEach(function (node) {
        node.color = groupByName[node.groupName].color;
      });

      // 稳定的初始圆形布局（黄金角散点，避免每次刷新重叠）
      var radius = Math.max(120, Math.min(320, 26 * Math.sqrt(nodes.length)));
      nodes.forEach(function (node, index) {
        var angle = index * 2.399963229728653;
        var distance = radius * Math.sqrt((index + 0.6) / nodes.length);
        node.x = Math.cos(angle) * distance;
        node.y = Math.sin(angle) * distance;
      });
      if (currentId && nodeById[currentId]) {
        nodeById[currentId].x = 0;
        nodeById[currentId].y = 0;
      }

      topLabelIds = new Set(
        nodes.slice()
          .sort(function (a, b) {
            return (b.inCount + b.outCount || b.size) - (a.inCount + a.outCount || a.size);
          })
          .slice(0, labelsTop)
          .map(function (node) { return node.id; })
      );

      return true;
    }

    function buildLegend() {
      if (!legendEl) return;
      legendEl.innerHTML = '';
      if (!groups.length) return;
      groups.forEach(function (group) {
        var button = doc.createElement('button');
        button.type = 'button';
        button.className = 'graph-legend__item';
        button.setAttribute('aria-pressed', 'true');
        button.title = labels.group + ': ' + group.name;

        var dot = doc.createElement('span');
        dot.className = 'graph-legend__dot';
        if (group.missing) dot.className += ' graph-legend__dot--missing';
        dot.style.setProperty('--dot', group.color);
        dot.style.background = group.color;

        var label = doc.createElement('span');
        label.className = 'graph-legend__label';
        label.textContent = group.name;

        var count = doc.createElement('span');
        count.className = 'graph-legend__count';
        count.textContent = String(group.count);

        button.appendChild(dot);
        button.appendChild(label);
        button.appendChild(count);
        button.addEventListener('click', function () {
          hiddenGroups[group.name] = !hiddenGroups[group.name];
          button.classList.toggle('is-off', !!hiddenGroups[group.name]);
          button.setAttribute('aria-pressed', String(!hiddenGroups[group.name]));
          userInteracted = true;
          requestDraw();
        });
        legendEl.appendChild(button);
      });

      var hasMissingGroup = groups.some(function (group) { return group.missing; });
      if (hasMissingGroup && labels.missing) {
        var note = doc.createElement('span');
        note.className = 'graph-legend__note';
        var noteDot = doc.createElement('span');
        noteDot.className = 'graph-legend__dot graph-legend__dot--missing';
        note.appendChild(noteDot);
        note.appendChild(doc.createTextNode(labels.missing));
        legendEl.appendChild(note);
      }
    }

    function simulationTick() {
      sim.ticks += 1;
      var count = nodes.length;
      if (count < 2) return;

      var displacement = new Array(count);
      var i;
      for (i = 0; i < count; i += 1) displacement[i] = { x: 0, y: 0 };

      var k = mode === 'full' ? 142 : 100;

      for (i = 0; i < count; i += 1) {
        for (var j = i + 1; j < count; j += 1) {
          var a = nodes[i];
          var b = nodes[j];
          var dx = a.x - b.x;
          var dy = a.y - b.y;
          var distance = Math.sqrt(dx * dx + dy * dy) || 0.01;
          var repel = (k * k) / distance;
          var ux = dx / distance;
          var uy = dy / distance;
          displacement[i].x += ux * repel;
          displacement[i].y += uy * repel;
          displacement[j].x -= ux * repel;
          displacement[j].y -= uy * repel;
        }
      }

      for (i = 0; i < links.length; i += 1) {
        var link = links[i];
        var source = link.source;
        var target = link.target;
        // 拖动期间不让弹簧把邻居吸向被拖节点：只保留排斥/碰撞，松手后恢复
        if (draggingNode && (source === draggingNode || target === draggingNode)) continue;
        var ldx = source.x - target.x;
        var ldy = source.y - target.y;
        var distance2 = Math.sqrt(ldx * ldx + ldy * ldy) || 0.01;
        var attract = (distance2 * distance2) / k;
        var lux = ldx / distance2;
        var luy = ldy / distance2;
        displacement[source.index].x -= lux * attract;
        displacement[source.index].y -= luy * attract;
        displacement[target.index].x += lux * attract;
        displacement[target.index].y += luy * attract;
      }

      // 轻微向心力，防止不连通子图越飘越远
      for (i = 0; i < count; i += 1) {
        displacement[i].x -= nodes[i].x * 0.06;
        displacement[i].y -= nodes[i].y * 0.06;
      }

      var progress = sim.ticks / sim.maxTicks;
      // 更平缓的温度曲线 + 单帧位移上限：既保留“活”的漂移感，又避免相邻帧位置差过大
      var gentle = motionMode !== 'normal';
      var temperature = Math.max(0.35, (1 - progress) * (gentle ? (mode === 'full' ? 5 : 4) : (mode === 'full' ? 14 : 10)));
      var maxStep = gentle ? (mode === 'full' ? 1.0 : 0.8) : (mode === 'full' ? 3.6 : 2.8);

      for (i = 0; i < count; i += 1) {
        var node = nodes[i];
        if (node.fixed) continue;
        var magnitude = Math.sqrt(displacement[i].x * displacement[i].x + displacement[i].y * displacement[i].y) || 0.01;
        var step = Math.min(magnitude, temperature, maxStep) / magnitude;
        node.x += displacement[i].x * step;
        node.y += displacement[i].y * step;
      }

      separateOverlaps(2);
    }

    function computeFitTarget() {
      var visible = visibleNodes();
      if (!visible.length || !cssW || !cssH) return null;

      var minX = Infinity;
      var minY = Infinity;
      var maxX = -Infinity;
      var maxY = -Infinity;

      visible.forEach(function (node) {
        var radius = nodeRadius(node);
        minX = Math.min(minX, node.x - radius);
        maxX = Math.max(maxX, node.x + radius);
        minY = Math.min(minY, node.y - radius);
        maxY = Math.max(maxY, node.y + radius);
      });

      var width = Math.max(1, maxX - minX);
      var height = Math.max(1, maxY - minY);
      var padding = mode === 'full' ? 44 : 32;
      var scale = Math.min(
        (cssW - padding * 2) / width,
        (cssH - padding * 2) / height
      );
      scale = clamp(scale, 0.18, mode === 'full' ? 1.35 : 1.1);

      return {
        k: scale,
        x: cssW / 2 - ((minX + maxX) / 2) * scale,
        y: cssH / 2 - ((minY + maxY) / 2) * scale
      };
    }

    // 逐帧缓动跟踪构图目标，替代原来每 40 帧一次“硬跳”的 fitView：
    // 整图瞬间平移/缩放最容易在屏幕上留下浅色双影
    function smoothFit(factor) {
      var target = computeFitTarget();
      if (!target) return;
      var f = factor || 0.1;
      var dx = (target.x - camera.x) * f;
      var dy = (target.y - camera.y) * f;
      var moveLen = Math.sqrt(dx * dx + dy * dy);
      var maxPan = motionMode === 'normal' ? 6 : 1.5; // 每帧最多平移
      if (moveLen > maxPan) {
        dx = dx / moveLen * maxPan;
        dy = dy / moveLen * maxPan;
      }
      camera.x += dx;
      camera.y += dy;

      var dk = (target.k - camera.k) * f;
      var maxK = Math.max(0.0005, camera.k * (motionMode === 'normal' ? 0.012 : 0.004)); // 每帧最多缩放
      if (Math.abs(dk) > maxK) dk = (dk > 0 ? 1 : -1) * maxK;
      camera.k += dk;
    }

    function fitView() {
      var target = computeFitTarget();
      if (!target) return;
      camera.k = target.k;
      camera.x = target.x;
      camera.y = target.y;
      autoFitDone = true;
      requestDraw();
    }

    function runSimulation() {
      if (sim.running || nodes.length < 2) {
        fitView();
        return;
      }
      sim.running = true;

      if (reduceMotion.matches || noAnimate) {
        for (var i = 0; i < sim.maxTicks; i += 1) simulationTick();
        sim.running = false;
        if (!userInteracted) fitView();
        requestDraw();
        return;
      }

      var frame = function () {
        simulationTick();
        if (!userInteracted) smoothFit(0.12);
        requestDraw();
        if (sim.ticks >= sim.maxTicks) {
          sim.running = false;
          if (!userInteracted) fitView();
          requestDraw();
          return;
        }
        sim.handle = window.requestAnimationFrame(frame);
      };
      sim.handle = window.requestAnimationFrame(frame);
    }

    function reheat() {
      if (reduceMotion.matches || noAnimate) {
        requestDraw();
        return;
      }
      sim.ticks = Math.max(0, sim.ticks - 150);
      if (!sim.running) runSimulation();
    }

    function boxesOverlap(a, b) {
      return !(a.x + a.w + 3 < b.x || b.x + b.w + 3 < a.x || a.y + a.h + 1 < b.y || b.y + b.h + 1 < a.y);
    }

    function drawLabels(candidates, hasMatch) {
      if (!showLabels || !candidates.length) return;
      candidates.sort(function (a, b) {
        var scoreA = (a.node.current ? 4 : 0) + (a.node === hovered ? 3 : 0)
          + (hasMatch && matchedIds.has(a.node.id) ? 2 : 0) + (a.node.missing ? 1 : 0);
        var scoreB = (b.node.current ? 4 : 0) + (b.node === hovered ? 3 : 0)
          + (hasMatch && matchedIds.has(b.node.id) ? 2 : 0) + (b.node.missing ? 1 : 0);
        return scoreB - scoreA || b.node.size - a.node.size;
      });

      var placed = [];
      ctx.font = '12px ' + FONT_STACK;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';

      candidates.forEach(function (candidate) {
        var text = candidate.node.title;
        if (text.length > 26) text = text.slice(0, 25) + '…';
        var width = ctx.measureText(text).width;
        var y = candidate.y + 4;
        var options = [
          { x: candidate.x + candidate.radius + 6, y: y },
          { x: candidate.x - candidate.radius - 6 - width, y: y }
        ];
        var chosen = null;

        for (var i = 0; i < options.length; i += 1) {
          var box = { x: options[i].x, y: y - 8, w: width, h: 16 };
          if (box.x < 2 || box.x + box.w > cssW - 2) continue;
          var collision = false;
          for (var j = 0; j < placed.length; j += 1) {
            if (boxesOverlap(box, placed[j])) {
              collision = true;
              break;
            }
          }
          if (!collision) {
            chosen = box;
            break;
          }
        }

        if (!chosen) return;
        placed.push(chosen);
        ctx.lineWidth = 3;
        ctx.strokeStyle = colors.bg;
        ctx.strokeText(text, chosen.x, y);
        ctx.fillStyle = candidate.node.missing ? colors.red : colors.text;
        ctx.fillText(text, chosen.x, y);
      });
    }

    function draw() {
      if (!ctx || !canvas.width || !canvas.height) return;
      // 整幅位图清屏（identity 变换），避免分数 DPR / 取整误差在右/下边缘留下残影
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = colors.bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // 绘图坐标仍用 CSS 像素，按位图/CSS 的精确比例缩放
      ctx.setTransform(dpr, 0, 0, dprY, 0, 0);

      var hasMatch = !!(matchedIds && matchedIds.size);
      var visible = visibleNodes();
      var shownLinks = visibleLinks();

      ctx.lineCap = 'round';

      shownLinks.forEach(function (link) {
        var a = link.source;
        var b = link.target;
        var ax = a.x * camera.k + camera.x;
        var ay = a.y * camera.k + camera.y;
        var bx = b.x * camera.k + camera.x;
        var by = b.y * camera.k + camera.y;
        var active = hasMatch && (matchedIds.has(a.id) || matchedIds.has(b.id));
        ctx.globalAlpha = hasMatch ? (active ? 0.9 : 0.1) : 0.5;
        ctx.strokeStyle = active ? colors.accent : colors.edge;
        ctx.lineWidth = active ? 1.7 : Math.min(2.6, 0.8 + link.count * 0.18);
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.stroke();
      });

      ctx.globalAlpha = 1;

      var labelCandidates = [];

      // 正在拖拽的节点放到最后绘制，避免被其它节点覆盖而看起来“融合”
      var drawOrder = visible;
      if (pointer && pointer.node) {
        drawOrder = visible.filter(function (node) { return node !== pointer.node; });
        drawOrder.push(pointer.node);
      }

      drawOrder.forEach(function (node) {
        var x = node.x * camera.k + camera.x;
        var y = node.y * camera.k + camera.y;
        var radius = Math.max(4.5, nodeRadius(node) * camera.k);
        var dim = hasMatch && !matchedIds.has(node.id);

        ctx.globalAlpha = dim ? 0.16 : 1;

        if (node.missing) {
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fillStyle = colors.bg;
          ctx.fill();
          ctx.setLineDash([4, 3]);
          ctx.strokeStyle = colors.red;
          ctx.lineWidth = 1.8;
          ctx.stroke();
          ctx.setLineDash([]);
        } else {
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fillStyle = node.color;
          ctx.fill();

          if (node.current || node === hovered || (hasMatch && matchedIds.has(node.id))) {
            ctx.strokeStyle = colors.accent;
            ctx.lineWidth = node.current ? 3 : 2.4;
            ctx.stroke();
          } else {
            ctx.strokeStyle = colors.surface;
            ctx.lineWidth = 1.4;
            ctx.stroke();
          }
        }

        ctx.globalAlpha = 1;

        var show = showLabels
          && (!hasMatch || matchedIds.has(node.id))
          && (mode === 'local' || hasMatch || camera.k >= labelsMinZoom || topLabelIds.has(node.id) || node === hovered || node.current);
        if (show) labelCandidates.push({ node: node, x: x, y: y, radius: radius });
      });

      if (mode === 'local' && labelCandidates.length > 7) {
        labelCandidates.sort(function (a, b) {
          return (b.node.current ? 1 : 0) - (a.node.current ? 1 : 0) || b.node.size - a.node.size;
        });
        labelCandidates = labelCandidates.slice(0, 7);
      }

      drawLabels(labelCandidates, hasMatch);

      ctx.globalAlpha = 1;

      // 调试模式：逐帧记录“最近两节点”的间隙，用于事后判断是否真的重叠过
      if (debugTrack) {
        var dbgMin = Infinity;
        var dbgPair = null;
        for (var di = 0; di < nodes.length; di += 1) {
          for (var dj = di + 1; dj < nodes.length; dj += 1) {
            var na = nodes[di];
            var nb = nodes[dj];
            var dbgGap = Math.sqrt(Math.pow(na.x - nb.x, 2) + Math.pow(na.y - nb.y, 2)) - nodeRadius(na) - nodeRadius(nb);
            if (dbgGap < dbgMin) {
              dbgMin = dbgGap;
              dbgPair = [na.title, nb.title];
            }
          }
        }
        debugTrack.current = { gap: dbgMin, pair: dbgPair };
        if (dbgMin < debugTrack.min) {
          debugTrack.min = dbgMin;
          debugTrack.minPair = dbgPair;
          debugTrack.minZoom = camera.k;
          debugTrack.minAt = Date.now();
        }
      }
    }

    var drawPending = false;
    // 高频交互（拖动/缩放/悬停/搜索）统一合并到下一帧绘制：
    // 避免一次 pointermove 里同步重绘多次，部分 GPU/驱动上会产生撕裂式拖影
    function requestDraw() {
      if (drawPending) return;
      drawPending = true;
      window.requestAnimationFrame(function () {
        drawPending = false;
        draw();
      });
    }

    function resize() {
      var rect = stage.getBoundingClientRect();
      // 用整数的内容盒尺寸作为 canvas 的 CSS 尺寸：
      // 位图 = round(css * dpr) 与 CSS 尺寸 1:1 对应，避免浏览器每帧重采样导致拖影/发虚
      var width = Math.round(stage.clientWidth || rect.width);
      var height = Math.round(stage.clientHeight || rect.height);
      if (width < 2 || height < 2) return;
      cssW = width;
      cssH = height;

      var ratio = window.devicePixelRatio || 1;
      ratio = Math.max(1, Math.min(3, ratio));
      var bitmapW = Math.max(1, Math.round(cssW * ratio));
      var bitmapH = Math.max(1, Math.round(cssH * ratio));
      // 仅在尺寸真正变化时重建位图：给 canvas.width/height 赋值会清空整张画布，
      // 在 ResizeObserver 抖动或重复调用时会造成闪烁/残影
      if (canvas.width !== bitmapW || canvas.height !== bitmapH) {
        canvas.width = bitmapW;
        canvas.height = bitmapH;
      }
      // CSS 尺寸固定为整数像素，canvas 不再依赖 width:100% 的分数尺寸
      canvas.style.width = cssW + 'px';
      canvas.style.height = cssH + 'px';
      // 精确映射：CSS 像素 → 位图像素
      dpr = canvas.width / cssW;
      dprY = canvas.height / cssH;

      if (!nodes.length) {
        draw();
        return;
      }
      if (!userInteracted && (!autoFitDone || sim.ticks >= sim.maxTicks)) fitView();
      else draw();
    }

    function nodeAt(screenX, screenY) {
      var visible = visibleNodes();
      for (var i = visible.length - 1; i >= 0; i -= 1) {
        var node = visible[i];
        var x = node.x * camera.k + camera.x;
        var y = node.y * camera.k + camera.y;
        var hitRadius = Math.max(7, nodeRadius(node) * camera.k) + 4;
        var dx = screenX - x;
        var dy = screenY - y;
        if (dx * dx + dy * dy <= hitRadius * hitRadius) return node;
      }
      return null;
    }

    function localPoint(event) {
      var rect = canvas.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }

    function toWorld(point) {
      return {
        x: (point.x - camera.x) / camera.k,
        y: (point.y - camera.y) / camera.k
      };
    }

    function showTooltip(node, screenX, screenY) {
      if (!tooltip) return;
      var lines = [node.title];
      lines.push(labels.group + '：' + node.groupName);
      lines.push(labels.in + ' ' + node.inCount + ' · ' + labels.out + ' ' + node.outCount);
      if (node.current) lines.push(labels.current);
      tooltip.textContent = lines.join('\n');
      tooltip.hidden = false;

      var width = tooltip.offsetWidth;
      var height = tooltip.offsetHeight;
      var left = screenX + 14;
      var top = screenY + 14;
      if (left + width > cssW - 6) left = screenX - width - 12;
      if (top + height > cssH - 6) top = screenY - height - 12;
      tooltip.style.left = Math.max(4, left) + 'px';
      tooltip.style.top = Math.max(4, top) + 'px';
    }

    function hideTooltip() {
      if (tooltip) tooltip.hidden = true;
    }

    function zoomAt(screenX, screenY, factor) {
      var nextScale = clamp(camera.k * factor, 0.15, 4.5);
      if (nextScale === camera.k) return;
      var worldX = (screenX - camera.x) / camera.k;
      var worldY = (screenY - camera.y) / camera.k;
      camera.k = nextScale;
      camera.x = screenX - worldX * nextScale;
      camera.y = screenY - worldY * nextScale;
      userInteracted = true;
      requestDraw();
    }

    /* ------------------------------ 交互 ------------------------------ */
    var pointer = null;
    var pointers = new Map();
    var pinch = null;
    var draggingNode = null;

    function beginPinch() {
      var points = Array.from(pointers.values());
      if (points.length < 2) return;
      var dx = points[0].x - points[1].x;
      var dy = points[0].y - points[1].y;
      pinch = {
        distance: Math.max(1, Math.sqrt(dx * dx + dy * dy))
      };
      if (pointer && pointer.node) {
        pointer.node.fixed = false;
        if (draggingNode === pointer.node) draggingNode = null;
      }
      pointer = null;
      hideTooltip();
      hovered = null;
    }

    canvas.addEventListener('pointerdown', function (event) {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      if (event.cancelable) event.preventDefault();
      try {
        canvas.setPointerCapture(event.pointerId);
      } catch (err) {
        /* ignore */
      }
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

      if (pointers.size === 2) {
        beginPinch();
        return;
      }

      var point = localPoint(event);
      var node = nodeAt(point.x, point.y);
      pointer = {
        id: event.pointerId,
        node: node,
        moved: false,
        startX: point.x,
        startY: point.y,
        lastClientX: event.clientX,
        lastClientY: event.clientY
      };

      if (node) {
        node.fixed = true;
        draggingNode = node;
        userInteracted = true;
        hideTooltip();
        reheat();
      }
      canvas.style.cursor = 'grabbing';
    });

    canvas.addEventListener('pointermove', function (event) {
      if (pointers.has(event.pointerId)) {
        pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      }

      if (pinch && pointers.size >= 2) {
        var points = Array.from(pointers.values());
        var dx = points[0].x - points[1].x;
        var dy = points[0].y - points[1].y;
        var distance = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        var rect = canvas.getBoundingClientRect();
        var midX = (points[0].x + points[1].x) / 2 - rect.left;
        var midY = (points[0].y + points[1].y) / 2 - rect.top;
        var factor = distance / pinch.distance;
        pinch.distance = distance;
        zoomAt(midX, midY, factor);
        return;
      }

      if (!pointer || pointer.id !== event.pointerId) {
        var hoverPoint = localPoint(event);
        var hoverNode = nodeAt(hoverPoint.x, hoverPoint.y);
        if (hoverNode !== hovered) {
          hovered = hoverNode;
          if (hoverNode) {
            canvas.style.cursor = 'pointer';
            showTooltip(hoverNode, hoverPoint.x, hoverPoint.y);
          } else {
            canvas.style.cursor = 'grab';
            hideTooltip();
          }
          requestDraw();
        } else if (hoverNode) {
          showTooltip(hoverNode, hoverPoint.x, hoverPoint.y);
        }
        return;
      }

      if (pointer.node) {
        var point = localPoint(event);
        var world = toWorld(point);
        pointer.node.x = world.x;
        pointer.node.y = world.y;
        if (Math.abs(point.x - pointer.startX) + Math.abs(point.y - pointer.startY) > 4) {
          pointer.moved = true;
          userInteracted = true;
        }
        separateOverlaps(3);
        requestDraw();
      } else {
        var moveX = event.clientX - pointer.lastClientX;
        var moveY = event.clientY - pointer.lastClientY;
        if (Math.abs(moveX) + Math.abs(moveY) > 2) {
          pointer.moved = true;
          userInteracted = true;
        }
        camera.x += moveX;
        camera.y += moveY;
        requestDraw();
      }

      pointer.lastClientX = event.clientX;
      pointer.lastClientY = event.clientY;
    });

    function endPointer(event) {
      pointers.delete(event.pointerId);

      if (pointers.size < 2) pinch = null;

      if (pointer && pointer.id === event.pointerId) {
        if (pointer.node) {
          pointer.node.fixed = false;
          if (draggingNode === pointer.node) draggingNode = null;
          if (!pointer.moved && pointer.node.url && !pointer.node.missing) {
            window.location.href = pointer.node.url;
            return;
          }
          reheat();
        }
        pointer = null;
      }

      canvas.style.cursor = hovered ? 'pointer' : 'grab';
    }

    canvas.addEventListener('pointerup', endPointer);
    canvas.addEventListener('pointercancel', endPointer);

    // 兜底：指针在画布外释放 / 窗口失焦时，确保不会留下永久固定的节点
    // （否则该节点会变成“钉子”，后续拖别的节点压上去时两者都无法分离）
    function releaseAllPointers() {
      if (!pointer && !draggingNode) return;
      if (pointer && pointer.node) pointer.node.fixed = false;
      pointer = null;
      draggingNode = null;
      pointers.clear();
      pinch = null;
      hideTooltip();
      requestDraw();
    }
    doc.addEventListener('pointerup', releaseAllPointers);
    doc.addEventListener('pointercancel', releaseAllPointers);
    window.addEventListener('blur', releaseAllPointers);

    canvas.addEventListener('pointerleave', function () {
      if (pointer) return;
      hovered = null;
      hideTooltip();
      canvas.style.cursor = 'grab';
      requestDraw();
    });

    canvas.addEventListener('wheel', function (event) {
      event.preventDefault();
      var point = localPoint(event);
      var factor = Math.exp(-event.deltaY * 0.0013);
      zoomAt(point.x, point.y, factor);
    }, { passive: false });

    canvas.addEventListener('dblclick', function (event) {
      var point = localPoint(event);
      zoomAt(point.x, point.y, 1.4);
    });

    canvas.addEventListener('keydown', function (event) {
      var centerX = cssW / 2;
      var centerY = cssH / 2;
      if (event.key === '+' || event.key === '=') {
        event.preventDefault();
        zoomAt(centerX, centerY, 1.2);
      } else if (event.key === '-') {
        event.preventDefault();
        zoomAt(centerX, centerY, 0.8);
      } else if (event.key === '0' || event.key === 'f' || event.key === 'F') {
        event.preventDefault();
        userInteracted = false;
        fitView();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        camera.x += 40;
        userInteracted = true;
        requestDraw();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        camera.x -= 40;
        userInteracted = true;
        requestDraw();
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        camera.y += 40;
        userInteracted = true;
        requestDraw();
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        camera.y -= 40;
        userInteracted = true;
        requestDraw();
      }
    });

    Array.prototype.forEach.call(section.querySelectorAll('[data-graph-action]'), function (button) {
      button.addEventListener('click', function () {
        var action = button.getAttribute('data-graph-action');
        if (action === 'zoom-in') {
          zoomAt(cssW / 2, cssH / 2, 1.25);
        } else if (action === 'zoom-out') {
          zoomAt(cssW / 2, cssH / 2, 0.8);
        } else if (action === 'fit') {
          userInteracted = false;
          fitView();
        } else if (action === 'labels') {
          showLabels = !showLabels;
          button.setAttribute('aria-pressed', String(showLabels));
          requestDraw();
        }
      });
    });

    /* ------------------------------ 搜索 ------------------------------ */
    function updateSearchStatus(text) {
      if (searchStatus) searchStatus.textContent = text || '';
    }

    function applySearch(value) {
      var query = String(value || '').trim().toLowerCase();
      matchedIds = null;
      searchMatches = [];

      if (!query) {
        updateSearchStatus('');
        requestDraw();
        return;
      }

      matchedIds = new Set();
      nodes.forEach(function (node) {
        var haystack = node.title + ' ' + node.groupName + ' ' + node.tags.join(' ');
        if (haystack.toLowerCase().indexOf(query) !== -1) {
          matchedIds.add(node.id);
          searchMatches.push(node);
        }
      });

      if (searchMatches.length) {
        updateSearchStatus(formatTemplate(messages.match, { count: searchMatches.length }));
      } else {
        updateSearchStatus(messages.noMatch);
      }
      requestDraw();
    }

    if (searchInput) {
      searchInput.addEventListener('input', debounce(function () {
        applySearch(searchInput.value);
      }, 90));

      searchInput.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') {
          event.preventDefault();
          if (searchMatches.length && searchMatches[0].url) {
            window.location.href = searchMatches[0].url;
          }
        } else if (event.key === 'Escape') {
          searchInput.value = '';
          applySearch('');
        }
      });
    }

    /* ------------------------------ 数据加载 ------------------------------ */
    function loadData(raw) {
      if (!readGraphData(raw)) {
        if (mode === 'local') showStatus(messages.empty, true);
        else showStatus(messages.error, true);
        resize();
        return;
      }

      hideStatus();
      buildLegend();
      separateOverlaps(4);
      resize();
      fitView();
      runSimulation();

      if (mode === 'full') {
        var missingCount = nodes.filter(function (node) { return node.missing; }).length;
        var readyText = missingCount > 0
          ? formatTemplate(messages.ready, { nodes: nodes.length, links: links.length, missing: missingCount })
          : formatTemplate(messages.readyBasic, { nodes: nodes.length, links: links.length });
        showStatus(readyText);
      }
    }

    if (mode === 'local') {
      var localData = readJsonScript('wiki-local-graph');
      if (localData) loadData(localData);
      else {
        showStatus(messages.empty || '', true);
        resize();
      }
    } else {
      var inlineData = readJsonScript('wiki-graph-data');
      var source = section.getAttribute('data-src');
      if (inlineData) {
        loadData(inlineData);
      } else if (source) {
        showStatus(messages.loading, true);
        resize();
        window.fetch(source, { credentials: 'same-origin' })
          .then(function (response) {
            if (!response.ok) throw new Error('HTTP ' + response.status);
            return response.json();
          })
          .then(function (data) {
            loadData(data);
          })
          .catch(function () {
            showStatus(messages.error || '加载失败', true);
            draw();
          });
      } else {
        showStatus(messages.error || '加载失败', true);
        resize();
      }
    }

    /* ------------------------------ 尺寸与主题 ------------------------------ */
    if (window.ResizeObserver) {
      var observer = new ResizeObserver(debounce(function () {
        resize();
      }, 40));
      observer.observe(stage);
    } else {
      window.addEventListener('resize', debounce(resize, 150));
    }

    doc.addEventListener('hexowiki:theme', function () {
      refreshColors();
      nodes.forEach(function (node) {
        if (node.missing) node.color = colors.red;
      });
      requestDraw();
    });

    if (window.MutationObserver) {
      var themeObserver = new MutationObserver(function () {
        refreshColors();
        requestDraw();
      });
      themeObserver.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    }

    // 初始尺寸（数据尚未到达时也准备好画布）
    resize();
    draw();

    // 调试钩子：URL 带 ?graph-debug=1 时可在控制台读取内部状态 + 页内诊断面板（不影响正常使用）
    if (/[?&]graph-debug=1/.test(window.location.search)) {
      window.__graphDebug = {
        get nodes() { return nodes; },
        get links() { return links; },
        get camera() { return camera; },
        get sim() { return sim; },
        get hovered() { return hovered; },
        get pointer() { return pointer; },
        get size() { return { cssW: cssW, cssH: cssH, dpr: dpr }; },
        nodeAt: function (x, y) { return nodeAt(x, y); }
      };

      // 页内诊断面板：实时显示最近两节点的“圆心距 - 半径和”。负数=真的重叠，>=0=只是渲染观感。
      var debugPanel = doc.createElement('div');
      debugPanel.id = 'wiki-graph-debug';
      debugPanel.style.cssText = [
        'position:fixed', 'right:12px', 'bottom:12px', 'z-index:99999',
        'padding:8px 10px', 'border-radius:4px', 'background:rgba(20,24,28,.92)',
        'color:#e6edf3', 'font:12px/1.55 ui-monospace,SFMono-Regular,Consolas,monospace',
        'box-shadow:0 2px 8px rgba(0,0,0,.35)', 'pointer-events:none',
        'white-space:pre', 'max-width:420px'
      ].join(';');
      doc.body.appendChild(debugPanel);
      debugTrack = { min: Infinity, minPair: null, minZoom: 0, minAt: 0, current: null };
      var debugLastLog = 0;
      window.setInterval(function () {
        var cur = debugTrack.current || { gap: null, pair: null };
        var fixedCount = nodes.filter(function (n) { return n.fixed; }).length;
        var zoom = camera.k;
        var curText = cur.gap === null ? '—' : cur.gap.toFixed(1) + 'px (屏幕 ' + (cur.gap * zoom).toFixed(1) + 'px)';
        var minText = isFinite(debugTrack.min)
          ? debugTrack.min.toFixed(1) + 'px (屏幕 ' + (debugTrack.min * debugTrack.minZoom).toFixed(1) + 'px) @zoom ' + debugTrack.minZoom.toFixed(2)
          : '—';
        var text = '当前最近: ' + curText + '  zoom=' + zoom.toFixed(2) + '  fixed=' + fixedCount +
          '\n历史最小: ' + minText +
          '\npair: ' + (cur.pair ? cur.pair.join(' ↔ ') : '—') +
          (debugTrack.minPair && debugTrack.minPair !== cur.pair ? '\n最小出现于: ' + debugTrack.minPair.join(' ↔ ') : '');
        debugPanel.textContent = text;
        var now = Date.now();
        if (now - debugLastLog > 2000) {
          debugLastLog = now;
          if (window.console && window.console.log) window.console.log('[hexowiki/debug] ' + text.replace(/\n/g, ' | '));
        }
      }, 200);
    }
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();
})();
