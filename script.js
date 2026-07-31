(function () {
  'use strict';

  // ===== 核心滑动逻辑 =====
  var pagesWrapper = document.getElementById('pages-wrapper');
  var page1 = document.getElementById('page-1');
  var page2 = document.getElementById('page-2');
  var totalPages = 2;
  var currentPage = 0;

  // 触摸状态
  var startX = 0;
  var startY = 0;
  var currentX = 0;
  var isDragging = false;
  var isHorizontal = null; // null=未判断, true=水平, false=垂直
  var startTime = 0;

  // 获取屏幕宽度
  function getScreenWidth() {
    return window.innerWidth || document.documentElement.clientWidth;
  }

  // 切换到指定页面
  function goToPage(index) {
    if (index < 0) { index = 0; }
    if (index >= totalPages) { index = totalPages - 1; }
    currentPage = index;
    var offset = -currentPage * 50;
    pagesWrapper.style.transform = 'translateX(' + offset + '%)';
    updateDots();
  }

  // 更新页面指示点
  function updateDots() {
    var allDots = document.querySelectorAll('.page-dots');
    for (var i = 0; i < allDots.length; i++) {
      var dots = allDots[i].querySelectorAll('.dot');
      for (var j = 0; j < dots.length; j++) {
        if (j === currentPage) {
          dots[j].classList.add('active');
        } else {
          dots[j].classList.remove('active');
        }
      }
    }
  }

  // ===== 触摸事件处理 =====
  pagesWrapper.addEventListener('touchstart', function (e) {
    var touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    currentX = 0;
    isDragging = true;
    isHorizontal = null;
    startTime = Date.now();
    pagesWrapper.classList.add('dragging');
  }, { passive: true });

  pagesWrapper.addEventListener('touchmove', function (e) {
    if (!isDragging) { return; }

    var touch = e.touches[0];
    var diffX = touch.clientX - startX;
    var diffY = touch.clientY - startY;

    // 判断滑动方向（只判断一次）
    if (isHorizontal === null) {
      if (Math.abs(diffX) > 5 || Math.abs(diffY) > 5) {
        if (Math.abs(diffX) > Math.abs(diffY)) {
          isHorizontal = true;
        } else {
          isHorizontal = false;
        }
      }
    }

    // 非水平滑动不处理
    if (isHorizontal === false) {
      isDragging = false;
      pagesWrapper.classList.remove('dragging');
      return;
    }

    // 水平滑动 - 边界阻力
    if (currentPage === 0 && diffX > 0) {
      // 第一屏向右拉，施加阻力
      diffX = diffX * 0.3;
    } else if (currentPage === totalPages - 1 && diffX < 0) {
      // 最后一屏向左拉，施加阻力
      diffX = diffX * 0.3;
    }

    currentX = diffX;
    var baseOffset = -currentPage * 50;
    var movePercent = (diffX / getScreenWidth()) * 50;
    var newOffset = baseOffset + movePercent;
    pagesWrapper.style.transform = 'translateX(' + newOffset + '%)';
  }, { passive: true });

  pagesWrapper.addEventListener('touchend', function (e) {
    if (!isDragging) {
      pagesWrapper.classList.remove('dragging');
      return;
    }

    isDragging = false;
    pagesWrapper.classList.remove('dragging');

    if (isHorizontal === false) {
      goToPage(currentPage);
      return;
    }

    var elapsed = Date.now() - startTime;
    var velocity = Math.abs(currentX) / elapsed;
    var threshold = getScreenWidth() * 0.2;

    // 快速滑动 或 滑动距离超过阈值
    if (currentX < -threshold || (velocity > 0.5 && currentX < -30)) {
      // 向左滑 -> 下一页
      goToPage(currentPage + 1);
    } else if (currentX > threshold || (velocity > 0.5 && currentX > 30)) {
      // 向右滑 -> 上一页
      goToPage(currentPage - 1);
    } else {
      // 回弹
      goToPage(currentPage);
    }
  }, { passive: true });

  pagesWrapper.addEventListener('touchcancel', function (e) {
    isDragging = false;
    pagesWrapper.classList.remove('dragging');
    goToPage(currentPage);
  }, { passive: true });

  // ===== 鼠标事件（PC端调试用）=====
  var mouseDown = false;
  var mouseStartX = 0;
  var mouseCurrentX = 0;
  var mouseStartTime = 0;

  pagesWrapper.addEventListener('mousedown', function (e) {
    mouseDown = true;
    mouseStartX = e.clientX;
    mouseCurrentX = 0;
    mouseStartTime = Date.now();
    pagesWrapper.classList.add('dragging');
    e.preventDefault();
  });

  document.addEventListener('mousemove', function (e) {
    if (!mouseDown) { return; }
    var diffX = e.clientX - mouseStartX;

    if (currentPage === 0 && diffX > 0) {
      diffX = diffX * 0.3;
    } else if (currentPage === totalPages - 1 && diffX < 0) {
      diffX = diffX * 0.3;
    }

    mouseCurrentX = diffX;
    var baseOffset = -currentPage * 50;
    var movePercent = (diffX / getScreenWidth()) * 50;
    var newOffset = baseOffset + movePercent;
    pagesWrapper.style.transform = 'translateX(' + newOffset + '%)';
  });

  document.addEventListener('mouseup', function (e) {
    if (!mouseDown) { return; }
    mouseDown = false;
    pagesWrapper.classList.remove('dragging');

    var elapsed = Date.now() - mouseStartTime;
    var velocity = Math.abs(mouseCurrentX) / elapsed;
    var threshold = getScreenWidth() * 0.2;

    if (mouseCurrentX < -threshold || (velocity > 0.5 && mouseCurrentX < -30)) {
      goToPage(currentPage + 1);
    } else if (mouseCurrentX > threshold || (velocity > 0.5 && mouseCurrentX > 30)) {
      goToPage(currentPage - 1);
    } else {
      goToPage(currentPage);
    }
  });

  // ===== 阻止默认行为 =====
  document.addEventListener('gesturestart', function (e) { e.preventDefault(); }, { passive: false });
  document.addEventListener('gesturechange', function (e) { e.preventDefault(); }, { passive: false });
  document.addEventListener('gestureend', function (e) { e.preventDefault(); }, { passive: false });

  // 双击缩放禁止
  var lastTouchEnd = 0;
  document.addEventListener('touchend', function (e) {
    var now = Date.now();
    if (now - lastTouchEnd <= 300) {
      e.preventDefault();
    }
    lastTouchEnd = now;
  }, { passive: false });

  // ===== 防止页面弹跳（iOS橡皮筋）=====
  document.body.addEventListener('touchmove', function (e) {
    if (e.target.closest('.page-content')) {
      var el = e.target.closest('.page-content');
      var scrollTop = el.scrollTop;
      var scrollHeight = el.scrollHeight;
      var clientHeight = el.clientHeight;

      if (scrollTop <= 0 && e.touches[0].clientY > 0) {
        // 到顶部
      }
      if (scrollTop + clientHeight >= scrollHeight) {
        // 到底部
      }
    }
  }, { passive: true });

  // ===== 初始化 =====
  goToPage(0);
})();
