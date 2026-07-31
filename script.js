(function () {
  'use strict';

  // ===== 阻止默认行为 =====
  document.addEventListener('gesturestart', function (e) { e.preventDefault(); }, { passive: false });
  document.addEventListener('gesturechange', function (e) { e.preventDefault(); }, { passive: false });
  document.addEventListener('gestureend', function (e) { e.preventDefault(); }, { passive: false });

  var lastTouchEnd = 0;
  document.addEventListener('touchend', function (e) {
    var now = Date.now();
    if (now - lastTouchEnd <= 300) { e.preventDefault(); }
    lastTouchEnd = now;
  }, { passive: false });

  document.body.addEventListener('touchmove', function (e) {
    // 允许滑动容器的横向触摸移动
  }, { passive: false });

  // ===== 存储 =====
  function save(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function load(k, fb) { try { return localStorage.getItem(k) || fb; } catch (e) { return fb; } }

  // ===== 头像上传 =====
  var avatarImg = document.getElementById('avatar-img');
  var avatarCircle = avatarImg.parentElement;
  var avatarInput = document.getElementById('avatar-input');

  var saved = load('avatar_img', '');
  if (saved) {
    avatarImg.src = saved;
    avatarImg.classList.add('loaded');
    avatarCircle.classList.add('has-img');
  }

  document.getElementById('avatar-area').addEventListener('click', function () {
    avatarInput.click();
  });

  avatarInput.addEventListener('change', function (e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function (ev) {
      avatarImg.src = ev.target.result;
      avatarImg.classList.add('loaded');
      avatarCircle.classList.add('has-img');
      save('avatar_img', ev.target.result);
    };
    reader.readAsDataURL(file);
  });

  // ===== 底部装饰文字 =====
  var decoEl = document.getElementById('deco-text');
  if (decoEl) {
    var sd = load('deco_text', null);
    if (sd !== null) decoEl.textContent = sd;
    decoEl.addEventListener('click', function () {
      var nd = prompt('装饰文字', decoEl.textContent);
      if (nd !== null) { decoEl.textContent = nd; save('deco_text', nd); }
    });
  }

  // ===== 4 个浮窗（图标+文字均可编辑）=====
  var bubbles = document.querySelectorAll('.float-bubble');

  bubbles.forEach(function (b) {
    var key = b.dataset.key;
    var iconEl = b.querySelector('.bubble-icon');
    var labelEl = b.querySelector('.bubble-label');

    var si = load('w_' + key + '_i', null);
    var st = load('w_' + key + '_t', null);
    if (si !== null) iconEl.textContent = si;
    if (st !== null) labelEl.textContent = st;

    b.addEventListener('click', function () {
      var ni = prompt('图标', iconEl.textContent);
      if (ni !== null && ni.trim()) { iconEl.textContent = ni.trim(); save('w_' + key + '_i', ni.trim()); }

      var nt = prompt('文字', labelEl.textContent);
      if (nt !== null && nt.trim()) { labelEl.textContent = nt.trim(); save('w_' + key + '_t', nt.trim()); }
    });
  });

  // ===== 下半部分毛玻璃组件 =====

  // 左上标题文字
  var pTitleEl = document.getElementById('panel-title');
  var spt = load('p_title', null);
  if (spt !== null) pTitleEl.textContent = spt;

  pTitleEl.addEventListener('click', function () {
    var nt = prompt('标题文字', pTitleEl.textContent);
    if (nt !== null) { pTitleEl.textContent = nt; save('p_title', nt); }
  });

  // 右上日期文字
  var metaTextEl = document.getElementById('meta-text');
  var smt = load('p_meta_text', null);
  if (smt !== null) metaTextEl.textContent = smt;

  // 右上爱心图标
  var metaIconEl = document.getElementById('meta-icon');
  var smi = load('p_meta_icon', null);
  if (smi !== null) metaIconEl.textContent = smi;

  document.querySelector('.panel-meta').addEventListener('click', function () {
    var nt = prompt('日期文字', metaTextEl.textContent);
    if (nt !== null) { metaTextEl.textContent = nt; save('p_meta_text', nt); }

    var ni = prompt('图标', metaIconEl.textContent);
    if (ni !== null && ni.trim()) { metaIconEl.textContent = ni.trim(); save('p_meta_icon', ni.trim()); }
  });

  // 三宫格图片上传
  var frames = document.querySelectorAll('.panel-frame');

  frames.forEach(function (frame) {
    var key = frame.dataset.key;
    var imgEl = frame.querySelector('.frame-img');
    var inputEl = frame.querySelector('.frame-input');

    var sf = load('pf_' + key, '');
    if (sf) { imgEl.src = sf; imgEl.classList.add('loaded'); frame.classList.add('has-img'); }

    frame.addEventListener('click', function () {
      inputEl.click();
    });

    inputEl.addEventListener('change', function (e) {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function (ev) {
        imgEl.src = ev.target.result;
        imgEl.classList.add('loaded');
        frame.classList.add('has-img');
        save('pf_' + key, ev.target.result);
      };
      reader.readAsDataURL(file);
    });
  });

  // ===== 滑动切换逻辑 =====
  var wrapper = document.getElementById('pages-wrapper');
  var dots = document.querySelectorAll('#page-dots .dot');
  var currentPage = 0;
  var totalPages = 2;
  var startX = 0, startY = 0, moveX = 0;
  var isDragging = false;
  var isHorizontal = null; // 判断滑动方向

  function goToPage(idx) {
    if (idx < 0) idx = 0;
    if (idx >= totalPages) idx = totalPages - 1;
    currentPage = idx;
    wrapper.style.transform = 'translateX(' + (-idx * 50) + '%)';
    dots.forEach(function (d, i) {
      d.classList.toggle('active', i === idx);
    });
  }

  // 页面指示点点击
  dots.forEach(function (d) {
    d.addEventListener('click', function () {
      goToPage(parseInt(d.dataset.page));
    });
  });

  // 触摸滑动
  wrapper.addEventListener('touchstart', function (e) {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    moveX = 0;
    isDragging = true;
    isHorizontal = null;
    wrapper.style.transition = 'none';
  }, { passive: true });

  wrapper.addEventListener('touchmove', function (e) {
    if (!isDragging) return;
    var dx = e.touches[0].clientX - startX;
    var dy = e.touches[0].clientY - startY;

    // 首次移动判断方向
    if (isHorizontal === null && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
      isHorizontal = Math.abs(dx) > Math.abs(dy);
    }

    if (!isHorizontal) return; // 纵向滑动不处理

    e.preventDefault();
    moveX = dx;
    var offset = -currentPage * 50;
    var dragPercent = (moveX / wrapper.parentElement.offsetWidth) * 100;
    wrapper.style.transform = 'translateX(' + (offset + dragPercent) + '%)';
  }, { passive: false });

  wrapper.addEventListener('touchend', function () {
    if (!isDragging) return;
    isDragging = false;
    wrapper.style.transition = 'transform 0.3s cubic-bezier(0.33, 1, 0.68, 1)';

    if (isHorizontal && Math.abs(moveX) > 50) {
      if (moveX < 0 && currentPage < totalPages - 1) {
        goToPage(currentPage + 1);
      } else if (moveX > 0 && currentPage > 0) {
        goToPage(currentPage - 1);
      } else {
        goToPage(currentPage);
      }
    } else {
      goToPage(currentPage);
    }
    moveX = 0;
  }, { passive: true });

  // 鼠标滑动（桌面端测试）
  var mouseDown = false;
  wrapper.addEventListener('mousedown', function (e) {
    startX = e.clientX;
    moveX = 0;
    mouseDown = true;
    wrapper.style.transition = 'none';
  });

  wrapper.addEventListener('mousemove', function (e) {
    if (!mouseDown) return;
    moveX = e.clientX - startX;
    var offset = -currentPage * 50;
    var dragPercent = (moveX / wrapper.parentElement.offsetWidth) * 100;
    wrapper.style.transform = 'translateX(' + (offset + dragPercent) + '%)';
  });

  wrapper.addEventListener('mouseup', function () {
    if (!mouseDown) return;
    mouseDown = false;
    wrapper.style.transition = 'transform 0.3s cubic-bezier(0.33, 1, 0.68, 1)';

    if (Math.abs(moveX) > 50) {
      if (moveX < 0 && currentPage < totalPages - 1) {
        goToPage(currentPage + 1);
      } else if (moveX > 0 && currentPage > 0) {
        goToPage(currentPage - 1);
      } else {
        goToPage(currentPage);
      }
    } else {
      goToPage(currentPage);
    }
    moveX = 0;
  });

  wrapper.addEventListener('mouseleave', function () {
    if (mouseDown) {
      mouseDown = false;
      wrapper.style.transition = 'transform 0.3s cubic-bezier(0.33, 1, 0.68, 1)';
      goToPage(currentPage);
    }
  });

  // ===== 第二页大图框上传 =====
  var bigframe = document.getElementById('page2-bigframe');
  var bigframeImg = document.getElementById('bigframe-img');
  var bigframePh = document.getElementById('bigframe-ph');
  var bigframeInput = document.getElementById('bigframe-input');

  var sbf = load('bigframe_img', '');
  if (sbf) {
    bigframeImg.src = sbf;
    bigframeImg.classList.add('loaded');
    bigframe.classList.add('has-img');
  }

  bigframe.addEventListener('click', function () {
    bigframeInput.click();
  });

  bigframeInput.addEventListener('change', function (e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function (ev) {
      bigframeImg.src = ev.target.result;
      bigframeImg.classList.add('loaded');
      bigframe.classList.add('has-img');
      save('bigframe_img', ev.target.result);
    };
    reader.readAsDataURL(file);
  });
})();
