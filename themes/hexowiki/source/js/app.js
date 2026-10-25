/* ==========================================================================
   HexWiki — 主题交互脚本（零依赖）
   - 深色模式（localStorage + 跟随系统）
   - 侧栏折叠 / 移动端抽屉
   - 多级目录折叠记忆 + 实时筛选
   - 搜索建议（/wiki-search.json）
   - 键盘 "/" 聚焦搜索
   - 文内目录滚动高亮
   - 红链点击提示、宽表格横向滚动容器
   - 全部条目页实时筛选
   ========================================================================== */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var body = doc.body;
  if (!body) return;

  var STORE = {
    theme: 'hexowiki.theme',
    sidebar: 'hexowiki.sidebar',
    nav: 'hexowiki.nav'
  };

  var missingToast = body.getAttribute('data-missing-toast') || '该条目尚未创建。';
  var bodyRoot = body.getAttribute('data-root') || '/';
  var prefersReducedMotion = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null;
  var mobileQuery = window.matchMedia ? window.matchMedia('(max-width: 1000px)') : null;

  function $(selector, context) {
    return (context || doc).querySelector(selector);
  }

  function $all(selector, context) {
    return Array.prototype.slice.call((context || doc).querySelectorAll(selector));
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

  function safeGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (err) {
      return null;
    }
  }

  function safeSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (err) {
      /* ignore quota / privacy mode */
    }
  }

  function readJSON(key, fallback) {
    try {
      var raw = safeGet(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (err) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      safeSet(key, JSON.stringify(value));
    } catch (err) {
      /* ignore */
    }
  }

  function isMobile() {
    return mobileQuery ? mobileQuery.matches : window.innerWidth < 1000;
  }

  /* ----------------------------------------------------------------------
     1. 深色模式
     ---------------------------------------------------------------------- */
  function currentTheme() {
    var theme = root.getAttribute('data-theme');
    return theme === 'dark' ? 'dark' : 'light';
  }

  function applyTheme(theme, persist) {
    theme = theme === 'dark' ? 'dark' : 'light';
    root.setAttribute('data-theme', theme);
    root.style.colorScheme = theme;

    var isDark = theme === 'dark';
    $all('[data-theme-toggle]').forEach(function (button) {
      button.setAttribute('aria-pressed', String(isDark));
      var label = isDark
        ? button.getAttribute('data-label-light')
        : button.getAttribute('data-label-dark');
      if (label) {
        button.setAttribute('aria-label', label);
        button.title = label;
      }
    });

    if (persist) safeSet(STORE.theme, theme);

    try {
      doc.dispatchEvent(new CustomEvent('hexowiki:theme', { detail: { theme: theme } }));
    } catch (err) {
      /* older browsers */
    }
  }

  $all('[data-theme-toggle]').forEach(function (button) {
    button.addEventListener('click', function () {
      applyTheme(currentTheme() === 'dark' ? 'light' : 'dark', true);
    });
  });

  function syncThemeButton() {
    applyTheme(currentTheme(), false);
  }

  syncThemeButton();

  if (window.matchMedia) {
    var systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
    var onSystemChange = function (event) {
      if (!safeGet(STORE.theme)) applyTheme(event.matches ? 'dark' : 'light', false);
    };
    if (systemTheme.addEventListener) systemTheme.addEventListener('change', onSystemChange);
    else if (systemTheme.addListener) systemTheme.addListener(onSystemChange);
  }

  /* ----------------------------------------------------------------------
     2. 侧栏折叠 / 移动端抽屉
     ---------------------------------------------------------------------- */
  var menuToggle = $('[data-menu-toggle]');
  var overlay = $('[data-sidebar-overlay]');
  var sidebar = $('#wiki-sidebar');
  var lastFocus = null;

  function syncMenuButton() {
    if (!menuToggle) return;
    var label;
    if (isMobile()) {
      var open = body.classList.contains('is-drawer-open');
      menuToggle.setAttribute('aria-expanded', String(open));
      label = open ? menuToggle.getAttribute('data-label-close') : menuToggle.getAttribute('data-label-open');
    } else {
      var collapsed = root.getAttribute('data-sidebar') === 'collapsed';
      menuToggle.setAttribute('aria-expanded', String(!collapsed));
      label = collapsed ? menuToggle.getAttribute('data-label-open') : menuToggle.getAttribute('data-label-close');
    }
    if (label) {
      menuToggle.setAttribute('aria-label', label);
      menuToggle.title = label;
    }
  }

  function setDrawer(open) {
    body.classList.toggle('is-drawer-open', open);
    if (overlay) {
      overlay.hidden = !open;
      overlay.setAttribute('aria-hidden', String(!open));
    }
    if (sidebar) sidebar.setAttribute('aria-hidden', String(isMobile() ? !open : false));
    if (open) {
      lastFocus = doc.activeElement;
      var target = $('[data-nav-filter]', sidebar) || $('.nav-tree__toggle', sidebar);
      if (target) {
        window.setTimeout(function () {
          try {
            target.focus({ preventScroll: true });
          } catch (err) {
            target.focus();
          }
        }, 120);
      }
    } else if (lastFocus && typeof lastFocus.focus === 'function') {
      try {
        lastFocus.focus({ preventScroll: true });
      } catch (err) {
        /* ignore */
      }
      lastFocus = null;
    }
    syncMenuButton();
  }

  function setSidebarCollapsed(collapsed) {
    if (collapsed) root.setAttribute('data-sidebar', 'collapsed');
    else root.removeAttribute('data-sidebar');
    safeSet(STORE.sidebar, collapsed ? 'collapsed' : 'expanded');
    syncMenuButton();
  }

  if (menuToggle) {
    menuToggle.addEventListener('click', function () {
      if (isMobile()) {
        setDrawer(!body.classList.contains('is-drawer-open'));
      } else {
        setSidebarCollapsed(root.getAttribute('data-sidebar') !== 'collapsed');
      }
    });
  }

  $all('[data-sidebar-collapse]').forEach(function (button) {
    button.addEventListener('click', function () {
      if (isMobile()) setDrawer(false);
      else setSidebarCollapsed(true);
    });
  });

  if (overlay) {
    overlay.addEventListener('click', function () {
      setDrawer(false);
    });
  }

  doc.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && body.classList.contains('is-drawer-open')) {
      setDrawer(false);
    }
  });

  // 移动端点击目录链接后关闭抽屉
  if (sidebar) {
    sidebar.addEventListener('click', function (event) {
      var link = event.target && event.target.closest ? event.target.closest('a') : null;
      if (link && isMobile()) setDrawer(false);
    });
  }

  var onViewportChange = debounce(function () {
    if (!isMobile()) {
      setDrawer(false);
    }
    syncMenuButton();
    syncTocMode();
  }, 150);

  if (mobileQuery) {
    if (mobileQuery.addEventListener) mobileQuery.addEventListener('change', onViewportChange);
    else if (mobileQuery.addListener) mobileQuery.addListener(onViewportChange);
  } else {
    window.addEventListener('resize', onViewportChange);
  }

  syncMenuButton();
  if (sidebar) sidebar.setAttribute('aria-hidden', String(isMobile()));

  /* ----------------------------------------------------------------------
     3. 多级目录：折叠记忆 + 筛选
     ---------------------------------------------------------------------- */
  var navTree = $('[data-nav-tree]');
  var navState = readJSON(STORE.nav, {});
  var navInitialOpen = {};

  function directChild(element, selector) {
    if (!element) return null;
    for (var i = 0; i < element.children.length; i += 1) {
      var child = element.children[i];
      if (child.matches && child.matches(selector)) return child;
    }
    return null;
  }

  function setGroupOpen(button, open, persist) {
    if (!button) return;
    button.setAttribute('aria-expanded', String(open));
    var group = button.closest('.nav-tree__group');
    if (group) group.classList.toggle('is-open', open);
    var id = button.getAttribute('aria-controls');
    var children = id ? doc.getElementById(id) : null;
    if (children) children.hidden = !open;
    if (persist) {
      var key = button.getAttribute('data-nav-key');
      if (key) {
        navState[key] = open;
        writeJSON(STORE.nav, navState);
      }
    }
  }

  function restoreNavOpen() {
    if (!navTree) return;
    $all('[data-nav-key]', navTree).forEach(function (button) {
      var key = button.getAttribute('data-nav-key');
      var open = Object.prototype.hasOwnProperty.call(navState, key)
        ? navState[key]
        : navInitialOpen[key];
      setGroupOpen(button, !!open, false);
    });
  }

  function filterList(list, query) {
    var any = false;
    if (!list) return any;

    Array.prototype.forEach.call(list.children, function (item) {
      if (!item || item.tagName !== 'LI') return;

      if (item.getAttribute('data-nav-type') === 'page') {
        var hit = (item.textContent || '').toLowerCase().indexOf(query) !== -1;
        item.hidden = !hit;
        if (hit) any = true;
        return;
      }

      var button = directChild(item, '.nav-tree__toggle');
      var wrapper = directChild(item, '.nav-tree__children');
      var labelEl = button ? button.querySelector('.nav-tree__label') : null;
      var labelHit = !!(labelEl && labelEl.textContent.toLowerCase().indexOf(query) !== -1);
      var childList = wrapper ? directChild(wrapper, 'ul') : null;
      var childHit = filterList(childList, query);

      if (labelHit && wrapper) {
        $all('.nav-tree__item', wrapper).forEach(function (el) {
          el.hidden = false;
        });
      }

      item.hidden = !(labelHit || childHit);
      if ((labelHit || childHit) && button) setGroupOpen(button, true, false);
      if (labelHit || childHit) any = true;
    });

    return any;
  }

  function clearNavFilter() {
    if (!navTree) return;
    $all('.nav-tree__item', navTree).forEach(function (item) {
      item.hidden = false;
    });
    restoreNavOpen();
  }

  if (navTree) {
    $all('[data-nav-key]', navTree).forEach(function (button) {
      var key = button.getAttribute('data-nav-key');
      navInitialOpen[key] = button.getAttribute('aria-expanded') === 'true';
      if (Object.prototype.hasOwnProperty.call(navState, key)) {
        setGroupOpen(button, !!navState[key], false);
      }
      button.addEventListener('click', function () {
        setGroupOpen(button, button.getAttribute('aria-expanded') !== 'true', true);
      });
    });

    var navFilter = $('[data-nav-filter]');
    if (navFilter) {
      navFilter.addEventListener('input', debounce(function () {
        var query = (navFilter.value || '').trim().toLowerCase();
        if (!query) {
          clearNavFilter();
          return;
        }
        filterList(directChild(navTree, 'ul'), query);
      }, 70));
      navFilter.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
          navFilter.value = '';
          clearNavFilter();
        }
      });
    }
  }

  /* ----------------------------------------------------------------------
     4. 搜索建议
     ---------------------------------------------------------------------- */
  var searchForm = $('[data-search-form]');
  var searchInput = $('.wiki-search__input');
  var suggestBox = $('.search-suggest');
  var suggestData = null;
  var suggestPromise = null;
  var suggestItems = [];
  var activeIndex = -1;
  var searchLimit = parseInt((searchForm && searchForm.getAttribute('data-limit')) || '8', 10);
  if (!searchLimit || searchLimit < 1) searchLimit = 8;

  function fetchSearchData() {
    if (suggestPromise) return suggestPromise;
    var src = (searchForm && searchForm.getAttribute('data-src'))
      || (suggestBox && suggestBox.getAttribute('data-src'))
      || bodyRoot + 'wiki-search.json';
    suggestPromise = window.fetch(src, { credentials: 'same-origin' })
      .then(function (response) {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.json();
      })
      .then(function (data) {
        suggestData = Array.isArray(data) ? data : [];
        return suggestData;
      })
      .catch(function () {
        suggestData = [];
        return suggestData;
      });
    return suggestPromise;
  }

  function scoreItem(item, query) {
    var title = String(item.title || '').toLowerCase();
    var score = 0;
    if (title === query) score = 100;
    else if (title.indexOf(query) === 0) score = 70;
    else if (title.indexOf(query) !== -1) score = 50;

    if (!score && String(item.summary || '').toLowerCase().indexOf(query) !== -1) score = 22;
    if (!score && (item.tags || []).join(' ').toLowerCase().indexOf(query) !== -1) score = 16;
    if (!score && (item.headings || []).join(' ').toLowerCase().indexOf(query) !== -1) score = 12;
    if (!score && String(item.text || '').toLowerCase().indexOf(query) !== -1) score = 6;

    return score;
  }

  function showSuggest() {
    if (!suggestBox) return;
    suggestBox.hidden = false;
    if (searchInput) searchInput.setAttribute('aria-expanded', 'true');
  }

  function hideSuggest() {
    if (!suggestBox) return;
    suggestBox.hidden = true;
    suggestBox.innerHTML = '';
    suggestItems = [];
    activeIndex = -1;
    if (searchInput) {
      searchInput.setAttribute('aria-expanded', 'false');
      searchInput.removeAttribute('aria-activedescendant');
    }
  }

  function setActiveItem(index) {
    if (!suggestItems.length) return;
    if (index < 0) index = suggestItems.length - 1;
    if (index >= suggestItems.length) index = 0;
    activeIndex = index;
    suggestItems.forEach(function (item, i) {
      item.classList.toggle('is-selected', i === activeIndex);
      item.setAttribute('aria-selected', String(i === activeIndex));
    });
    var active = suggestItems[activeIndex];
    if (active) {
      if (searchInput) searchInput.setAttribute('aria-activedescendant', active.id);
      if (active.scrollIntoView) active.scrollIntoView({ block: 'nearest' });
    }
  }

  function messageNode(className, text) {
    var node = doc.createElement('div');
    node.className = className;
    node.textContent = text;
    return node;
  }

  function renderSuggestions(query) {
    if (!suggestBox) return;
    if (!query) {
      hideSuggest();
      return;
    }

    var data = suggestData || [];
    var matches = data
      .map(function (item) {
        return { item: item, score: scoreItem(item, query) };
      })
      .filter(function (entry) {
        return entry.score > 0;
      })
      .sort(function (a, b) {
        return b.score - a.score || String(a.item.title).localeCompare(String(b.item.title), 'zh-Hans-CN');
      })
      .slice(0, searchLimit)
      .map(function (entry) {
        return entry.item;
      });

    suggestBox.innerHTML = '';
    suggestItems = [];
    activeIndex = -1;

    if (!matches.length) {
      suggestBox.appendChild(messageNode(
        'search-suggest__empty',
        suggestBox.getAttribute('data-empty') || '没有找到匹配的条目'
      ));
      showSuggest();
      return;
    }

    matches.forEach(function (item, index) {
      var link = doc.createElement('a');
      link.className = 'search-suggest__item';
      link.href = item.url || '#';
      link.id = 'search-suggest-item-' + index;
      link.setAttribute('role', 'option');
      link.setAttribute('aria-selected', 'false');

      var title = doc.createElement('span');
      title.className = 'search-suggest__title';
      title.textContent = item.title || item.url || '';
      link.appendChild(title);

      if (item.summary) {
        var summary = doc.createElement('span');
        summary.className = 'search-suggest__summary';
        summary.textContent = item.summary;
        link.appendChild(summary);
      }

      link.addEventListener('mouseenter', function () {
        setActiveItem(index);
      });

      suggestBox.appendChild(link);
      suggestItems.push(link);
    });

    showSuggest();
  }

  if (searchForm && searchInput && suggestBox) {
    var runSearch = debounce(function () {
      var query = (searchInput.value || '').trim().toLowerCase();
      if (!query) {
        hideSuggest();
        return;
      }
      if (suggestData) {
        renderSuggestions(query);
        return;
      }
      suggestBox.innerHTML = '';
      suggestBox.appendChild(messageNode(
        'search-suggest__loading',
        suggestBox.getAttribute('data-loading') || '正在搜索…'
      ));
      showSuggest();
      fetchSearchData().then(function () {
        if ((searchInput.value || '').trim()) renderSuggestions(String(searchInput.value).trim().toLowerCase());
      });
    }, 120);

    searchInput.addEventListener('focus', function () {
      fetchSearchData();
      if ((searchInput.value || '').trim()) runSearch();
    });

    searchInput.addEventListener('input', runSearch);

    searchInput.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        if (suggestBox.hidden) runSearch();
        else setActiveItem(activeIndex + 1);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveItem(activeIndex - 1);
      } else if (event.key === 'Enter') {
        if (activeIndex >= 0 && suggestItems[activeIndex]) {
          event.preventDefault();
          window.location.href = suggestItems[activeIndex].getAttribute('href');
        } else if (suggestItems.length) {
          event.preventDefault();
          window.location.href = suggestItems[0].getAttribute('href');
        }
      } else if (event.key === 'Escape') {
        hideSuggest();
        searchInput.blur();
      }
    });

    searchForm.addEventListener('submit', function (event) {
      if (suggestItems.length) {
        event.preventDefault();
        var target = suggestItems[activeIndex >= 0 ? activeIndex : 0];
        if (target) window.location.href = target.getAttribute('href');
      }
    });

    doc.addEventListener('click', function (event) {
      if (!suggestBox.contains(event.target) && !searchForm.contains(event.target)) hideSuggest();
    });

    searchInput.addEventListener('blur', function () {
      window.setTimeout(function () {
        if (!searchForm.contains(doc.activeElement)) hideSuggest();
      }, 150);
    });
  }

  // 键盘 "/" 聚焦搜索
  doc.addEventListener('keydown', function (event) {
    if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;
    var target = event.target;
    var tag = (target && target.tagName ? target.tagName : '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || (target && target.isContentEditable)) return;
    if (!searchInput) return;
    event.preventDefault();
    searchInput.focus();
    searchInput.select();
  });

  /* ----------------------------------------------------------------------
     5. 随机页面
     ---------------------------------------------------------------------- */
  $all('[data-random-src]').forEach(function (link) {
    link.addEventListener('click', function (event) {
      event.preventDefault();
      var src = link.getAttribute('data-random-src');
      var fallback = link.getAttribute('href');
      window.fetch(src, { credentials: 'same-origin' })
        .then(function (response) {
          return response.ok ? response.json() : [];
        })
        .then(function (list) {
          if (Array.isArray(list) && list.length) {
            var pick = list[Math.floor(Math.random() * list.length)];
            if (pick && pick.url) {
              window.location.href = pick.url;
              return;
            }
          }
          if (fallback) window.location.href = fallback;
        })
        .catch(function () {
          if (fallback) window.location.href = fallback;
        });
    });
  });

  /* ----------------------------------------------------------------------
     6. 红链点击：阻止跳转 + 提示
     ---------------------------------------------------------------------- */
  var toastTimer = null;

  function showToast(message) {
    var toast = $('.wiki-toast');
    if (!toast) {
      toast = doc.createElement('div');
      toast.className = 'wiki-toast';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      body.appendChild(toast);
    }
    toast.textContent = message;
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 3200);
  }

  doc.addEventListener('click', function (event) {
    var anchor = event.target && event.target.closest ? event.target.closest('a') : null;
    if (!anchor) return;
    var isMissing = anchor.classList.contains('wikilink--missing')
      || (anchor.classList.contains('wikilink') && anchor.classList.contains('is-missing'))
      || anchor.getAttribute('data-missing') === '1';
    if (isMissing) {
      event.preventDefault();
      showToast(missingToast);
    }
  });

  /* ----------------------------------------------------------------------
     7. 文内目录：窄屏折叠 + 滚动高亮
     ---------------------------------------------------------------------- */
  var tocBox = $('#wiki-toc');
  var tocLinks = tocBox ? $all('.toc-box__link', tocBox) : [];
  var tocHeadings = tocLinks
    .map(function (link) {
      var href = link.getAttribute('href') || '';
      var id = href.charAt(0) === '#' ? decodeURIComponent(href.slice(1)) : '';
      return id ? doc.getElementById(id) : null;
    })
    .filter(Boolean);

  var wasMobile = isMobile();

  function syncTocMode() {
    if (!tocBox) return;
    var nowMobile = isMobile();
    if (nowMobile && !wasMobile) tocBox.removeAttribute('open');
    else if (!nowMobile && wasMobile) tocBox.setAttribute('open', '');
    wasMobile = nowMobile;
  }

  if (tocBox) {
    if (isMobile()) tocBox.removeAttribute('open');
    else tocBox.setAttribute('open', '');
  }

  var tocTicking = false;

  function setActiveToc(id) {
    tocLinks.forEach(function (link) {
      link.classList.toggle('is-active', link.getAttribute('href') === '#' + id);
    });
  }

  function updateActiveHeading() {
    if (!tocHeadings.length) return;
    var offset = 92;
    var current = tocHeadings[0];
    for (var i = 0; i < tocHeadings.length; i += 1) {
      var rect = tocHeadings[i].getBoundingClientRect();
      if (rect.top <= offset) current = tocHeadings[i];
    }
    if (current && current.id) setActiveToc(current.id);
  }

  function onTocScroll() {
    if (tocTicking) return;
    tocTicking = true;
    window.requestAnimationFrame(function () {
      tocTicking = false;
      updateActiveHeading();
    });
  }

  if (tocHeadings.length) {
    window.addEventListener('scroll', onTocScroll, { passive: true });
    updateActiveHeading();
  }

  /* ----------------------------------------------------------------------
     8. 宽表格：加横向滚动容器
     ---------------------------------------------------------------------- */
  if (body.getAttribute('data-table-scroll') !== 'off') {
    $all('.article__content table').forEach(function (table) {
      if (table.closest('.infobox') || table.closest('figure.highlight')) return;
      if (table.parentElement && table.parentElement.classList.contains('table-scroll')) return;
      var wrapper = doc.createElement('div');
      wrapper.className = 'table-scroll';
      table.parentNode.insertBefore(wrapper, table);
      wrapper.appendChild(table);
    });
  }

  /* ----------------------------------------------------------------------
     9. 全部条目页筛选
     ---------------------------------------------------------------------- */
  var allpagesFilter = $('[data-allpages-filter]');

  if (allpagesFilter) {
    var allpageItems = $all('[data-allpages-item]');
    var allpageGroups = $all('[data-allpages-group]');
    var allpageStatus = $('[data-allpages-status]');
    var allpageEmpty = $('[data-allpages-empty]');

    var applyAllpagesFilter = function (value) {
      var query = String(value || '').trim().toLowerCase();
      var visible = 0;

      allpageItems.forEach(function (item) {
        var haystack = (item.getAttribute('data-search') || item.textContent || '').toLowerCase();
        var show = !query || haystack.indexOf(query) !== -1;
        item.hidden = !show;
        if (show) visible += 1;
      });

      allpageGroups.forEach(function (group) {
        var hasVisible = allpageItems.some(function (item) {
          return group.contains(item) && !item.hidden;
        });
        group.hidden = !hasVisible;
      });

      if (allpageStatus) {
        allpageStatus.textContent = query ? visible + ' / ' + allpageItems.length : '';
      }
      if (allpageEmpty) allpageEmpty.hidden = !(query && visible === 0);
    };

    allpagesFilter.addEventListener('input', debounce(function () {
      applyAllpagesFilter(allpagesFilter.value);
    }, 80));

    var initialQuery = '';
    try {
      initialQuery = new URLSearchParams(window.location.search).get('q') || '';
    } catch (err) {
      initialQuery = '';
    }
    if (initialQuery) {
      allpagesFilter.value = initialQuery;
      applyAllpagesFilter(initialQuery);
    }
  }

  /* ----------------------------------------------------------------------
     9b. 标签索引页筛选
     ---------------------------------------------------------------------- */
  var tagFilter = $('[data-tag-filter]');

  if (tagFilter) {
    var tagItems = $all('[data-tag-item]');
    var tagSections = $all('[data-tag-section]');
    var tagStatus = $('[data-tag-status]');
    var tagEmpty = $('[data-tag-empty]');

    var applyTagFilter = function (value) {
      var query = String(value || '').trim().toLowerCase();
      var visible = Object.create(null);

      tagItems.forEach(function (item) {
        var name = item.getAttribute('data-tag-name') || item.textContent || '';
        var show = !query || name.toLowerCase().indexOf(query) !== -1;
        item.hidden = !show;
        if (show) visible[name] = true;
      });

      tagSections.forEach(function (section) {
        section.hidden = !$all('[data-tag-item]', section).some(function (item) {
          return !item.hidden;
        });
      });

      var count = Object.keys(visible).length;
      if (tagStatus) tagStatus.textContent = query ? count + ' 个标签' : '';
      if (tagEmpty) tagEmpty.hidden = !(query && count === 0);
    };

    tagFilter.addEventListener('input', debounce(function () {
      applyTagFilter(tagFilter.value);
    }, 80));

    var initialTagQuery = '';
    try {
      initialTagQuery = new URLSearchParams(window.location.search).get('q') || '';
    } catch (err) {
      initialTagQuery = '';
    }
    if (initialTagQuery) {
      tagFilter.value = initialTagQuery;
      applyTagFilter(initialTagQuery);
    }
  }

  /* ----------------------------------------------------------------------
     9c. 代码块复制按钮
     ---------------------------------------------------------------------- */
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var area = doc.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', 'readonly');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      body.appendChild(area);
      area.select();
      try {
        doc.execCommand('copy');
        resolve();
      } catch (err) {
        reject(err);
      } finally {
        if (area.parentNode) area.parentNode.removeChild(area);
      }
    });
  }

  $all('.article__content figure.highlight, .article__content pre').forEach(function (block) {
    if (block.tagName === 'PRE' && block.closest('figure.highlight')) return;
    if (block.querySelector('.code-copy')) return;
    var codeEl = block.matches('figure.highlight')
      ? (block.querySelector('.code pre') || block.querySelector('code'))
      : (block.querySelector('code') || block);
    if (!codeEl) return;
    var text = (codeEl.innerText || codeEl.textContent || '').replace(/\s+$/, '');
    if (!text) return;

    var button = doc.createElement('button');
    button.type = 'button';
    button.className = 'code-copy';
    button.setAttribute('aria-label', '复制代码');
    button.textContent = '复制';
    button.addEventListener('click', function () {
      copyText(text).then(function () {
        button.textContent = '已复制';
        showToast('代码已复制');
        window.setTimeout(function () { button.textContent = '复制'; }, 1600);
      }).catch(function () {
        showToast('复制失败，请手动选择代码');
      });
    });
    block.appendChild(button);
  });

  /* ----------------------------------------------------------------------
     10. 首屏锚点定位修正（sticky header 偏移由 CSS scroll-margin 处理）
     ---------------------------------------------------------------------- */
  if (window.location.hash && window.location.hash.length > 1) {
    var anchorTarget = null;
    try {
      anchorTarget = doc.getElementById(decodeURIComponent(window.location.hash.slice(1)));
    } catch (err) {
      anchorTarget = null;
    }
    if (anchorTarget && anchorTarget.scrollIntoView) {
      window.setTimeout(function () {
        anchorTarget.scrollIntoView({ block: 'start' });
      }, 0);
    }
  }

  // 暴露少量状态，方便主题测试/调试
  window.HexWiki = {
    applyTheme: applyTheme,
    currentTheme: currentTheme,
    setDrawer: setDrawer,
    setSidebarCollapsed: setSidebarCollapsed
  };
})();
