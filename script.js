(function () {
  'use strict';

  // ===== localStorage 工具 =====
  function save(key, val) {
    try { localStorage.setItem(key, val); } catch (e) {}
  }
  function load(key, def) {
    try { var v = localStorage.getItem(key); return v === null ? def : v; } catch (e) { return def; }
  }
  function saveObj(key, obj) { save(key, JSON.stringify(obj)); }
  function loadObj(key, def) { try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch (e) { return def; } }

  // ===== 100vh 兼容性 =====
  function setVH() {
    var vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', vh + 'px');
  }
  setVH();
  window.addEventListener('resize', setVH);
  window.addEventListener('orientationchange', function () { setTimeout(setVH, 100); });

  // ===== 常量 =====
  var LONG_PRESS_MS = 500;
  var EDGE_ZONE = 50;
  var PAGE_SWITCH_MS = 500;
  var SWIPE_THRESHOLD = 0.2;
  var VELOCITY_THRESHOLD = 0.5;
  var MOVE_THRESHOLD = 8;

  // ===== 状态机 =====
  var S = { IDLE: 0, PENDING: 1, SWIPING: 2, EDITING: 3, DRAGGING: 4 };
  var state = S.IDLE;

  // ===== 页面导航 =====
  var pagesWrapper = document.getElementById('pages-wrapper');
  var pages = document.querySelectorAll('.page');
  var dots = document.querySelectorAll('#page-dots .dot');
  var editDoneBtn = document.getElementById('edit-done-btn');
  var totalPages = pages.length;
  var currentPage = 0;

  function getScreenWidth() { return window.innerWidth; }

  function goToPage(idx) {
    if (idx < 0) idx = 0;
    if (idx >= totalPages) idx = totalPages - 1;
    currentPage = idx;
    pagesWrapper.classList.remove('dragging');
    pagesWrapper.style.transform = 'translateX(' + (-currentPage * 50) + '%)';
    updateDots();
  }

  function updateDots() {
    for (var i = 0; i < dots.length; i++) {
      if (i === currentPage) dots[i].classList.add('active');
      else dots[i].classList.remove('active');
    }
  }

  for (var i = 0; i < dots.length; i++) {
    (function (idx) {
      dots[idx].addEventListener('click', function () { goToPage(idx); });
    })(i);
  }

  // ===== 边缘翻页指示器 =====
  var edgeLeft = document.createElement('div');
  edgeLeft.className = 'edge-indicator left';
  var edgeRight = document.createElement('div');
  edgeRight.className = 'edge-indicator right';
  document.body.appendChild(edgeLeft);
  document.body.appendChild(edgeRight);

  // ===== 编辑模式 =====
  function enterEditMode() {
    if (state === S.EDITING || state === S.DRAGGING) return;
    state = S.EDITING;
    editDoneBtn.style.display = 'block';
    addWobble();
  }

  function exitEditMode() {
    if (state === S.DRAGGING) endDrag();
    state = S.IDLE;
    editDoneBtn.style.display = 'none';
    removeWobble();
  }

  function addWobble() {
    document.querySelectorAll('.draggable').forEach(function (el) {
      el.classList.add('wobble');
    });
  }

  function removeWobble() {
    document.querySelectorAll('.draggable').forEach(function (el) {
      el.classList.remove('wobble');
    });
  }

  editDoneBtn.addEventListener('click', function () {
    exitEditMode();
    saveLayout();
  });

  // ===== 删除组件功能（仅组件有删除按钮，APP没有）=====
  document.addEventListener('click', function (e) {
    var deleteBtn = e.target.closest('.delete-btn');
    if (!deleteBtn) return;
    e.stopPropagation();
    e.preventDefault();

    // 找到要删除的组件（.block-item）
    var blockItem = deleteBtn.closest('.block-item');
    if (!blockItem) return;

    // 删除动画
    blockItem.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
    blockItem.style.transform = 'scale(0.5)';
    blockItem.style.opacity = '0';

    setTimeout(function () {
      blockItem.remove();
      saveLayout();
    }, 300);
  });

  // ===== 拖拽系统 =====
  var dragState = {
    originEl: null,
    ghost: null,
    offsetX: 0,
    offsetY: 0,
    dropTarget: null,
    edgeTimer: null,
    dragType: null,
    originPage: null
  };

  function getDragType(el) {
    if (el.classList.contains('app-drag')) return 'app';
    if (el.classList.contains('dock-drag')) return 'dock';
    if (el.classList.contains('block-item')) return 'block';
    return null;
  }

  function getPageOf(el) {
    var p = el.closest('.page');
    return p ? Array.from(pages).indexOf(p) : -1;
  }

  function startDrag(el, clientX, clientY) {
    state = S.DRAGGING;
    dragState.originEl = el;
    dragState.dragType = getDragType(el);
    dragState.originPage = getPageOf(el);

    var rect = el.getBoundingClientRect();
    dragState.offsetX = clientX - rect.left;
    dragState.offsetY = clientY - rect.top;

    // 创建幽灵
    var ghost = el.cloneNode(true);
    ghost.classList.add('drag-ghost');
    ghost.classList.remove('wobble', 'drag-placeholder', 'drop-highlight');
    ghost.style.width = rect.width + 'px';
    ghost.style.height = rect.height + 'px';
    ghost.style.left = (clientX - dragState.offsetX) + 'px';
    ghost.style.top = (clientY - dragState.offsetY) + 'px';
    document.body.appendChild(ghost);
    dragState.ghost = ghost;

    // 标记原始元素
    el.classList.remove('wobble');
    el.classList.add('drag-placeholder');

    // 移除其他元素的 wobble 以减少干扰
    removeWobble();

    dragState.dropTarget = null;
  }

  function moveDrag(clientX, clientY) {
    if (state !== S.DRAGGING || !dragState.ghost) return;

    // 移动幽灵
    dragState.ghost.style.left = (clientX - dragState.offsetX) + 'px';
    dragState.ghost.style.top = (clientY - dragState.offsetY) + 'px';

    // 查找放置目标
    var prevTarget = dragState.dropTarget;
    dragState.ghost.style.display = 'none';
    var elem = document.elementFromPoint(clientX, clientY);
    dragState.ghost.style.display = '';

    var targetDraggable = null;
    if (elem) {
      if (dragState.dragType === 'app') {
        targetDraggable = elem.closest('.app-drag[data-drag-id]');
      } else if (dragState.dragType === 'dock') {
        targetDraggable = elem.closest('.dock-drag[data-drag-id]');
      } else if (dragState.dragType === 'block') {
        targetDraggable = elem.closest('.block-item[data-drag-id]');
      }
    }

    if (prevTarget && prevTarget !== targetDraggable) {
      prevTarget.classList.remove('drop-highlight');
    }

    if (targetDraggable && targetDraggable !== dragState.originEl) {
      targetDraggable.classList.add('drop-highlight');
      dragState.dropTarget = targetDraggable;
    } else {
      dragState.dropTarget = null;
    }

    // 边缘检测 - 翻页
    clearTimeout(dragState.edgeTimer);
    var screenW = getScreenWidth();

    if (dragState.dragType !== 'dock') {
      if (clientX < EDGE_ZONE && currentPage > 0) {
        edgeLeft.classList.add('active');
        dragState.edgeTimer = setTimeout(function () {
          switchPageDuringDrag(-1);
          edgeLeft.classList.remove('active');
        }, PAGE_SWITCH_MS);
      } else if (clientX > screenW - EDGE_ZONE && currentPage < totalPages - 1) {
        edgeRight.classList.add('active');
        dragState.edgeTimer = setTimeout(function () {
          switchPageDuringDrag(1);
          edgeRight.classList.remove('active');
        }, PAGE_SWITCH_MS);
      } else {
        edgeLeft.classList.remove('active');
        edgeRight.classList.remove('active');
      }
    }
  }

  function switchPageDuringDrag(direction) {
    var newPage = currentPage + direction;
    if (newPage < 0 || newPage >= totalPages) return;
    goToPage(newPage);
    if (dragState.dropTarget) {
      dragState.dropTarget.classList.remove('drop-highlight');
      dragState.dropTarget = null;
    }
  }

  function endDrag() {
    if (state !== S.DRAGGING) return;
    clearTimeout(dragState.edgeTimer);
    edgeLeft.classList.remove('active');
    edgeRight.classList.remove('active');

    var originEl = dragState.originEl;
    var dropTarget = dragState.dropTarget;
    var dragType = dragState.dragType;

    if (dropTarget) {
      swapElements(originEl, dropTarget);
      dropTarget.classList.remove('drop-highlight');
    } else {
      // 没有放置目标，检查是否跨页了
      var currentPageIdx = getPageOf(originEl);
      if (dragType !== 'dock' && currentPageIdx !== dragState.originPage && dragType !== null) {
        moveElementToCurrentPage(originEl);
      }
    }

    // 清理
    originEl.classList.remove('drag-placeholder');
    if (dragState.ghost) {
      dragState.ghost.remove();
      dragState.ghost = null;
    }
    dragState.originEl = null;
    dragState.dropTarget = null;
    dragState.dragType = null;
    dragState.originPage = null;

    // 回到编辑模式
    state = S.EDITING;
    addWobble();
    saveLayout();
  }

  function moveElementToCurrentPage(el) {
    var targetPage = pages[currentPage];
    if (!targetPage) return;
    var dragType = getDragType(el);

    if (dragType === 'app') {
      var appGrid = targetPage.querySelector('.app-grid, .page2-apps');
      if (appGrid) {
        appGrid.appendChild(el);
      } else {
        targetPage.appendChild(el);
      }
    } else if (dragType === 'block') {
      targetPage.appendChild(el);
    }
  }

  function swapSiblings(parent, el1, el2) {
    var children = Array.from(parent.children);
    var idx1 = children.indexOf(el1);
    var idx2 = children.indexOf(el2);
    if (idx1 < 0 || idx2 < 0) return;

    if (idx1 < idx2) {
      parent.insertBefore(el2, el1);
      if (children[idx2 + 1]) {
        parent.insertBefore(el1, children[idx2 + 1]);
      } else {
        parent.appendChild(el1);
      }
    } else {
      parent.insertBefore(el1, el2);
      if (children[idx1 + 1]) {
        parent.insertBefore(el2, children[idx1 + 1]);
      } else {
        parent.appendChild(el2);
      }
    }
  }

  function swapElements(el1, el2) {
    var type = dragState.dragType;

    if (type === 'app') {
      var parent1 = el1.parentNode;
      var parent2 = el2.parentNode;

      if (parent1 === parent2) {
        swapSiblings(parent1, el1, el2);
      } else {
        var ref1 = el1.nextSibling;
        var ref2 = el2.nextSibling;
        parent1.insertBefore(el2, ref1);
        parent2.insertBefore(el1, ref2);
      }
    } else if (type === 'dock') {
      var dockInner = el1.parentNode;
      if (dockInner === el2.parentNode) {
        swapSiblings(dockInner, el1, el2);
      }
    } else if (type === 'block') {
      var page1 = el1.parentNode;
      var page2 = el2.parentNode;

      if (page1 === page2) {
        var blocks = Array.from(page1.querySelectorAll(':scope > .block-item'));
        var b1 = blocks.indexOf(el1);
        var b2 = blocks.indexOf(el2);
        if (b1 < b2) {
          page1.insertBefore(el2, el1);
          if (blocks[b2 + 1]) page1.insertBefore(el1, blocks[b2 + 1]);
          else page1.appendChild(el1);
        } else {
          page1.insertBefore(el1, el2);
          if (blocks[b1 + 1]) page1.insertBefore(el2, blocks[b1 + 1]);
          else page1.appendChild(el2);
        }
      } else {
        var r1 = el1.nextSibling;
        var r2 = el2.nextSibling;
        page1.insertBefore(el2, r1);
        page2.insertBefore(el1, r2);
      }
    }
  }

  // ===== 布局持久化 =====
  function saveLayout() {
    var layout = { pages: [], appOrders: {}, dockOrder: [] };

    pages.forEach(function (page, idx) {
      var items = [];
      page.querySelectorAll(':scope > .block-item[data-drag-id]').forEach(function (el) {
        items.push(el.dataset.dragId);
      });
      layout.pages.push(items);
    });

    document.querySelectorAll('.app-grid[data-drag-id], .page2-apps[data-drag-id]').forEach(function (grid) {
      var apps = [];
      grid.querySelectorAll(':scope > .app-drag[data-drag-id]').forEach(function (app) {
        apps.push(app.dataset.dragId);
      });
      layout.appOrders[grid.dataset.dragId] = apps;
    });

    document.querySelectorAll('.dock-inner .dock-drag[data-drag-id]').forEach(function (d) {
      layout.dockOrder.push(d.dataset.dragId);
    });

    saveObj('desktop_layout', layout);
  }

  function loadLayout() {
    var layout = loadObj('desktop_layout', null);
    if (!layout) return;

    if (layout.pages) {
      layout.pages.forEach(function (itemIds, pageIdx) {
        if (pageIdx >= pages.length) return;
        var page = pages[pageIdx];
        itemIds.forEach(function (id) {
          var el = document.querySelector('.block-item[data-drag-id="' + id + '"]');
          if (el) page.appendChild(el);
        });
      });
    }

    if (layout.appOrders) {
      Object.keys(layout.appOrders).forEach(function (gridId) {
        var grid = document.querySelector('[data-drag-id="' + gridId + '"]');
        if (!grid) return;
        layout.appOrders[gridId].forEach(function (appId) {
          var app = grid.querySelector('.app-drag[data-drag-id="' + appId + '"]');
          if (app) grid.appendChild(app);
        });
      });
    }

    if (layout.dockOrder && layout.dockOrder.length) {
      var dockInner = document.querySelector('.dock-inner');
      layout.dockOrder.forEach(function (dockId) {
        var d = dockInner.querySelector('.dock-drag[data-drag-id="' + dockId + '"]');
        if (d) dockInner.appendChild(d);
      });
    }
  }

  // ===== 统一触摸/鼠标事件处理 =====
  var pending = {
    startX: 0, startY: 0, startTime: 0,
    currentX: 0, target: null, isHorizontal: null,
    longPressTimer: null, currentClientX: 0, currentClientY: 0,
    moved: false
  };

  function handleStart(clientX, clientY, target) {
    // 如果点击了删除按钮，不处理
    if (target.closest('.delete-btn')) return;

    // 编辑模式
    if (state === S.EDITING) {
      var draggable = target.closest('.draggable[data-drag-id]');
      if (draggable) {
        startDrag(draggable, clientX, clientY);
        return;
      } else if (!target.closest('#edit-done-btn')) {
        exitEditMode();
        saveLayout();
        return;
      }
      return;
    }

    // 正常模式
    state = S.PENDING;
    pending.startX = clientX;
    pending.startY = clientY;
    pending.startTime = Date.now();
    pending.currentX = 0;
    pending.target = target;
    pending.isHorizontal = null;
    pending.currentClientX = clientX;
    pending.currentClientY = clientY;
    pending.moved = false;

    clearTimeout(pending.longPressTimer);
    var draggableEl = target.closest('.draggable[data-drag-id]');
    pending.longPressTimer = setTimeout(function () {
      if (state === S.PENDING && !pending.moved) {
        if (draggableEl) {
          enterEditMode();
          startDrag(draggableEl, pending.currentClientX, pending.currentClientY);
        }
      }
    }, LONG_PRESS_MS);

    pagesWrapper.classList.add('dragging');
  }

  function handleMove(clientX, clientY) {
    pending.currentClientX = clientX;
    pending.currentClientY = clientY;

    if (state === S.DRAGGING) {
      moveDrag(clientX, clientY);
      return;
    }

    if (state === S.PENDING) {
      var diffX = clientX - pending.startX;
      var diffY = clientY - pending.startY;

      if (pending.isHorizontal === null && (Math.abs(diffX) > MOVE_THRESHOLD || Math.abs(diffY) > MOVE_THRESHOLD)) {
        pending.isHorizontal = Math.abs(diffX) > Math.abs(diffY);
        pending.moved = true;
      }

      if (pending.isHorizontal === false) {
        clearTimeout(pending.longPressTimer);
        state = S.IDLE;
        pagesWrapper.classList.remove('dragging');
        return;
      }

      if (pending.isHorizontal) {
        clearTimeout(pending.longPressTimer);
        state = S.SWIPING;
      }
    }

    if (state === S.SWIPING) {
      var dx = clientX - pending.startX;
      if (currentPage === 0 && dx > 0) dx = dx * 0.3;
      else if (currentPage === totalPages - 1 && dx < 0) dx = dx * 0.3;
      pending.currentX = dx;
      var movePercent = (dx / getScreenWidth()) * 50;
      pagesWrapper.style.transform = 'translateX(' + (-currentPage * 50 + movePercent) + '%)';
    }
  }

  function handleEnd() {
    if (state === S.DRAGGING) {
      endDrag();
      return;
    }

    clearTimeout(pending.longPressTimer);

    if (state === S.PENDING) {
      state = S.IDLE;
      pagesWrapper.classList.remove('dragging');
      return;
    }

    if (state === S.SWIPING) {
      pagesWrapper.classList.remove('dragging');
      var elapsed = Date.now() - pending.startTime;
      var velocity = Math.abs(pending.currentX) / elapsed;
      var threshold = getScreenWidth() * SWIPE_THRESHOLD;

      if (pending.currentX < -threshold || (velocity > VELOCITY_THRESHOLD && pending.currentX < -30)) {
        goToPage(currentPage + 1);
      } else if (pending.currentX > threshold || (velocity > VELOCITY_THRESHOLD && pending.currentX > 30)) {
        goToPage(currentPage - 1);
      } else {
        goToPage(currentPage);
      }
      state = S.IDLE;
      return;
    }

    state = S.IDLE;
  }

  // ===== 触摸事件 =====
  pagesWrapper.addEventListener('touchstart', function (e) {
    handleStart(e.touches[0].clientX, e.touches[0].clientY, e.target);
  }, { passive: true });

  pagesWrapper.addEventListener('touchmove', function (e) {
    if (state === S.DRAGGING || state === S.EDITING) e.preventDefault();
    handleMove(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: false });

  pagesWrapper.addEventListener('touchend', function () {
    handleEnd();
  }, { passive: true });

  pagesWrapper.addEventListener('touchcancel', function () {
    if (state === S.DRAGGING) endDrag();
    else {
      state = S.IDLE;
      clearTimeout(pending.longPressTimer);
      pagesWrapper.classList.remove('dragging');
      goToPage(currentPage);
    }
  });

  // ===== 鼠标事件（PC端调试）=====
  var mouseDown = false;

  pagesWrapper.addEventListener('mousedown', function (e) {
    mouseDown = true;
    handleStart(e.clientX, e.clientY, e.target);
    e.preventDefault();
  });

  document.addEventListener('mousemove', function (e) {
    if (!mouseDown && state !== S.DRAGGING && state !== S.EDITING) return;
    if (state === S.DRAGGING || (mouseDown && state === S.PENDING) || (mouseDown && state === S.SWIPING)) {
      handleMove(e.clientX, e.clientY);
    }
  });

  document.addEventListener('mouseup', function () {
    if (!mouseDown && state !== S.DRAGGING) return;
    mouseDown = false;
    handleEnd();
  });

  // ===== 阻止默认行为 =====
  document.addEventListener('gesturestart', function (e) { e.preventDefault(); }, { passive: false });
  document.addEventListener('gesturechange', function (e) { e.preventDefault(); }, { passive: false });
  document.addEventListener('gestureend', function (e) { e.preventDefault(); }, { passive: false });

  var lastTouchEnd = 0;
  document.addEventListener('touchend', function (e) {
    var now = Date.now();
    if (now - lastTouchEnd <= 300) e.preventDefault();
    lastTouchEnd = now;
  }, { passive: false });

  // ===== 文字编辑功能（编辑模式下禁用）=====
  var editables = document.querySelectorAll('[data-edit="text"]');
  editables.forEach(function (el) {
    var key = el.dataset.key;
    var sv = load('txt_' + key, null);
    if (sv !== null) el.textContent = sv;

    el.addEventListener('click', function (e) {
      if (state === S.EDITING || state === S.DRAGGING) return;
      e.stopPropagation();
      var nv = prompt('编辑文字', el.textContent);
      if (nv !== null) { el.textContent = nv; save('txt_' + key, nv); }
    });
  });

  // ===== widget 头像上传 =====
  var widgetAvatar = document.getElementById('widget-avatar');
  var widgetAvatarImg = document.getElementById('widget-avatar-img');
  var widgetAvatarInput = document.getElementById('widget-avatar-input');

  var wai = load('widget_avatar', '');
  if (wai) { widgetAvatarImg.src = wai; widgetAvatarImg.classList.add('loaded'); widgetAvatar.classList.add('has-img'); }

  widgetAvatar.addEventListener('click', function (e) {
    if (state === S.EDITING || state === S.DRAGGING) return;
    widgetAvatarInput.click();
  });
  widgetAvatarInput.addEventListener('change', function (e) {
    var file = e.target.files[0]; if (!file) return;
    var reader = new FileReader();
    reader.onload = function (ev) {
      widgetAvatarImg.src = ev.target.result;
      widgetAvatarImg.classList.add('loaded');
      widgetAvatar.classList.add('has-img');
      save('widget_avatar', ev.target.result);
    };
    reader.readAsDataURL(file);
  });

  // ===== PhotoBook 图片上传 =====
  var gpFrames = document.querySelectorAll('.gp-img-frame');
  gpFrames.forEach(function (frame) {
    var key = frame.dataset.key;
    var imgEl = frame.querySelector('.gp-frame-img');
    var inputEl = frame.querySelector('.gp-frame-input');

    var sf = load('img_' + key, '');
    if (sf) { imgEl.src = sf; imgEl.classList.add('loaded'); frame.classList.add('has-img'); }

    frame.addEventListener('click', function () {
      if (state === S.EDITING || state === S.DRAGGING) return;
      inputEl.click();
    });
    inputEl.addEventListener('change', function (e) {
      var file = e.target.files[0]; if (!file) return;
      var reader = new FileReader();
      reader.onload = function (ev) {
        imgEl.src = ev.target.result; imgEl.classList.add('loaded'); frame.classList.add('has-img');
        save('img_' + key, ev.target.result);
      };
      reader.readAsDataURL(file);
    });
  });

  // ===== page2-bigframe 大图上传 =====
  var bigframe = document.getElementById('page2-bigframe');
  var bigframeImg = document.getElementById('bigframe-img');
  var bigframeInput = document.getElementById('bigframe-input');

  var sbf = load('bigframe_img', '');
  if (sbf) { bigframeImg.src = sbf; bigframeImg.classList.add('loaded'); bigframe.classList.add('has-img'); }

  bigframe.addEventListener('click', function () {
    if (state === S.EDITING || state === S.DRAGGING) return;
    bigframeInput.click();
  });
  bigframeInput.addEventListener('change', function (e) {
    var file = e.target.files[0]; if (!file) return;
    var reader = new FileReader();
    reader.onload = function (ev) {
      bigframeImg.src = ev.target.result;
      bigframeImg.classList.add('loaded');
      bigframe.classList.add('has-img');
      save('bigframe_img', ev.target.result);
    };
    reader.readAsDataURL(file);
  });

  // ===== Story Mode 组件 =====
  var storyAvatar = document.getElementById('story-avatar');
  var storyAvatarImg = document.getElementById('story-avatar-img');
  var storyAvatarInput = document.getElementById('story-avatar-input');

  var ssa = load('s_avatar', '');
  if (ssa) { storyAvatarImg.src = ssa; storyAvatarImg.classList.add('loaded'); storyAvatar.classList.add('has-img'); }

  storyAvatar.addEventListener('click', function () {
    if (state === S.EDITING || state === S.DRAGGING) return;
    storyAvatarInput.click();
  });
  storyAvatarInput.addEventListener('change', function (e) {
    var file = e.target.files[0]; if (!file) return;
    var reader = new FileReader();
    reader.onload = function (ev) {
      storyAvatarImg.src = ev.target.result;
      storyAvatarImg.classList.add('loaded');
      storyAvatar.classList.add('has-img');
      save('s_avatar', ev.target.result);
    };
    reader.readAsDataURL(file);
  });

  var storyFrames = document.querySelectorAll('.story-img-frame');
  storyFrames.forEach(function (frame) {
    var key = frame.dataset.key;
    var imgEl = frame.querySelector('.story-frame-img');
    var inputEl = frame.querySelector('.story-frame-input');

    var sf = load('s_' + key, '');
    if (sf) { imgEl.src = sf; imgEl.classList.add('loaded'); frame.classList.add('has-img'); }

    frame.addEventListener('click', function () {
      if (state === S.EDITING || state === S.DRAGGING) return;
      inputEl.click();
    });
    inputEl.addEventListener('change', function (e) {
      var file = e.target.files[0]; if (!file) return;
      var reader = new FileReader();
      reader.onload = function (ev) {
        imgEl.src = ev.target.result; imgEl.classList.add('loaded'); frame.classList.add('has-img');
        save('s_' + key, ev.target.result);
      };
      reader.readAsDataURL(file);
    });
  });

  var storyDelete = document.getElementById('story-delete');
  if (storyDelete) {
    storyDelete.addEventListener('click', function (e) {
      e.stopPropagation();
      if (state === S.EDITING || state === S.DRAGGING) return;
      if (confirm('确定清除 Story Mode 所有自定义数据？')) {
        var keys = ['story_title', 'story_sub', 'story_user', 'story_bio', 'story_tag', 'story_text', 'story_date', 'story_time', 'story_reroll', 's_avatar', 's_si1', 's_si2', 's_si3', 's_si4'];
        keys.forEach(function (k) { try { localStorage.removeItem('txt_' + k); } catch (e) { } });
        keys.forEach(function (k) { try { localStorage.removeItem('s_' + k); } catch (e) { } });
        location.reload();
      }
    });
  }

  // ===== 初始化 =====
  loadLayout();
  goToPage(0);
})();
