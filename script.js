(function () {
  'use strict';

  // ===== localStorage 工具 =====
  function save(key, val) {
    try { localStorage.setItem(key, val); } catch (e) {}
  }
  function load(key, def) {
    try { var v = localStorage.getItem(key); return v === null ? def : v; } catch (e) { return def; }
  }

  // ===== 100vh 兼容性 =====
  function setVH() {
    var vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', vh + 'px');
  }
  setVH();
  window.addEventListener('resize', setVH);
  window.addEventListener('orientationchange', function () { setTimeout(setVH, 100); });

  // ===== 滑动切换逻辑 =====
  var pagesWrapper = document.getElementById('pages-wrapper');
  var totalPages = 2;
  var currentPage = 0;
  var startX = 0, startY = 0, currentX = 0;
  var isDragging = false, isHorizontal = null, startTime = 0;

  function getScreenWidth() {
    return window.innerWidth || document.documentElement.clientWidth;
  }

  function goToPage(index) {
    if (index < 0) index = 0;
    if (index >= totalPages) index = totalPages - 1;
    currentPage = index;
    var offset = -currentPage * 50;
    pagesWrapper.style.transform = 'translateX(' + offset + '%)';
    updateDots();
  }

  function updateDots() {
    var dots = document.querySelectorAll('#page-dots .dot');
    for (var i = 0; i < dots.length; i++) {
      if (i === currentPage) dots[i].classList.add('active');
      else dots[i].classList.remove('active');
    }
  }

  // 页面指示点点击切换
  var dots = document.querySelectorAll('#page-dots .dot');
  for (var i = 0; i < dots.length; i++) {
    (function (idx) {
      dots[idx].addEventListener('click', function () { goToPage(idx); });
    })(i);
  }

  // ===== 触摸事件 =====
  pagesWrapper.addEventListener('touchstart', function (e) {
    var touch = e.touches[0];
    startX = touch.clientX; startY = touch.clientY;
    currentX = 0; isDragging = true; isHorizontal = null; startTime = Date.now();
    pagesWrapper.classList.add('dragging');
  }, { passive: true });

  pagesWrapper.addEventListener('touchmove', function (e) {
    if (!isDragging) return;
    var touch = e.touches[0];
    var diffX = touch.clientX - startX;
    var diffY = touch.clientY - startY;

    if (isHorizontal === null) {
      if (Math.abs(diffX) > 5 || Math.abs(diffY) > 5) {
        isHorizontal = Math.abs(diffX) > Math.abs(diffY);
      }
    }
    if (isHorizontal === false) {
      isDragging = false;
      pagesWrapper.classList.remove('dragging');
      return;
    }

    if (currentPage === 0 && diffX > 0) diffX = diffX * 0.3;
    else if (currentPage === totalPages - 1 && diffX < 0) diffX = diffX * 0.3;

    currentX = diffX;
    var movePercent = (diffX / getScreenWidth()) * 50;
    var newOffset = -currentPage * 50 + movePercent;
    pagesWrapper.style.transform = 'translateX(' + newOffset + '%)';
  }, { passive: true });

  pagesWrapper.addEventListener('touchend', function (e) {
    if (!isDragging) { pagesWrapper.classList.remove('dragging'); return; }
    isDragging = false;
    pagesWrapper.classList.remove('dragging');

    if (isHorizontal === false) { goToPage(currentPage); return; }

    var elapsed = Date.now() - startTime;
    var velocity = Math.abs(currentX) / elapsed;
    var threshold = getScreenWidth() * 0.2;

    if (currentX < -threshold || (velocity > 0.5 && currentX < -30)) {
      goToPage(currentPage + 1);
    } else if (currentX > threshold || (velocity > 0.5 && currentX > 30)) {
      goToPage(currentPage - 1);
    } else {
      goToPage(currentPage);
    }
  }, { passive: true });

  pagesWrapper.addEventListener('touchcancel', function () {
    isDragging = false;
    pagesWrapper.classList.remove('dragging');
    goToPage(currentPage);
  }, { passive: true });

  // ===== 鼠标事件（PC端调试）=====
  var mouseDown = false, mouseStartX = 0, mouseCurrentX = 0, mouseStartTime = 0;

  pagesWrapper.addEventListener('mousedown', function (e) {
    mouseDown = true; mouseStartX = e.clientX; mouseCurrentX = 0; mouseStartTime = Date.now();
    pagesWrapper.classList.add('dragging');
    e.preventDefault();
  });

  document.addEventListener('mousemove', function (e) {
    if (!mouseDown) return;
    var diffX = e.clientX - mouseStartX;
    if (currentPage === 0 && diffX > 0) diffX = diffX * 0.3;
    else if (currentPage === totalPages - 1 && diffX < 0) diffX = diffX * 0.3;
    mouseCurrentX = diffX;
    var movePercent = (diffX / getScreenWidth()) * 50;
    var newOffset = -currentPage * 50 + movePercent;
    pagesWrapper.style.transform = 'translateX(' + newOffset + '%)';
  });

  document.addEventListener('mouseup', function () {
    if (!mouseDown) return;
    mouseDown = false;
    pagesWrapper.classList.remove('dragging');
    var elapsed = Date.now() - mouseStartTime;
    var velocity = Math.abs(mouseCurrentX) / elapsed;
    var threshold = getScreenWidth() * 0.2;
    if (mouseCurrentX < -threshold || (velocity > 0.5 && mouseCurrentX < -30)) goToPage(currentPage + 1);
    else if (mouseCurrentX > threshold || (velocity > 0.5 && mouseCurrentX > 30)) goToPage(currentPage - 1);
    else goToPage(currentPage);
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

  // ===== 文字编辑功能 =====
  var editables = document.querySelectorAll('[data-edit="text"]');
  editables.forEach(function (el) {
    var key = el.dataset.key;
    var sv = load('txt_' + key, null);
    if (sv !== null) el.textContent = sv;

    el.addEventListener('click', function (e) {
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

  widgetAvatar.addEventListener('click', function () { widgetAvatarInput.click(); });
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

    frame.addEventListener('click', function () { inputEl.click(); });
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

  bigframe.addEventListener('click', function () { bigframeInput.click(); });
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
  // 头像上传
  var storyAvatar = document.getElementById('story-avatar');
  var storyAvatarImg = document.getElementById('story-avatar-img');
  var storyAvatarInput = document.getElementById('story-avatar-input');

  var ssa = load('s_avatar', '');
  if (ssa) { storyAvatarImg.src = ssa; storyAvatarImg.classList.add('loaded'); storyAvatar.classList.add('has-img'); }

  storyAvatar.addEventListener('click', function () { storyAvatarInput.click(); });
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

  // 四宫格图片上传
  var storyFrames = document.querySelectorAll('.story-img-frame');
  storyFrames.forEach(function (frame) {
    var key = frame.dataset.key;
    var imgEl = frame.querySelector('.story-frame-img');
    var inputEl = frame.querySelector('.story-frame-input');

    var sf = load('s_' + key, '');
    if (sf) { imgEl.src = sf; imgEl.classList.add('loaded'); frame.classList.add('has-img'); }

    frame.addEventListener('click', function () { inputEl.click(); });
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

  // 删除按钮（仅清除文字和图片数据示例）
  var storyDelete = document.getElementById('story-delete');
  if (storyDelete) {
    storyDelete.addEventListener('click', function (e) {
      e.stopPropagation();
      if (confirm('确定清除 Story Mode 所有自定义数据？')) {
        var keys = ['story_title','story_sub','story_user','story_bio','story_tag','story_text','story_date','story_time','story_reroll','s_avatar','s_si1','s_si2','s_si3','s_si4'];
        keys.forEach(function (k) { try { localStorage.removeItem(k.startsWith('s_') || k.startsWith('txt_') ? k : 'txt_' + k); } catch(e){} });
        keys.forEach(function (k) { try { localStorage.removeItem('txt_' + k); } catch(e){} });
        location.reload();
      }
    });
  }

  // ===== 初始化 =====
  goToPage(0);
})();
