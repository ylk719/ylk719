// 动态 vh 修复移动端 100vh 问题
(function () {
  var setVH = function () {
    var vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', vh + 'px');
  };
  setVH();
  window.addEventListener('resize', setVH);
  window.addEventListener('orientationchange', function () { setTimeout(setVH, 100); });
})();

// ===== 页面导航 =====
var pagesWrapper = document.getElementById('pages-wrapper');
var pages = document.querySelectorAll('.page');
var dots = document.querySelectorAll('#page-dots .dot');
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

// ===== 手势滑动（Touch）=====
var STATE = { IDLE: 0, SWIPING: 1 };
var state = STATE.IDLE;
var startX = 0, startY = 0;
var moveX = 0;
var startT = 0;
var isHorizontal = null;

pagesWrapper.addEventListener('touchstart', function (e) {
  var t = e.touches[0];
  startX = t.clientX;
  startY = t.clientY;
  startT = Date.now();
  moveX = 0;
  isHorizontal = null;
  state = STATE.SWIPING;
  pagesWrapper.classList.add('dragging');
}, { passive: true });

pagesWrapper.addEventListener('touchmove', function (e) {
  if (state !== STATE.SWIPING) return;
  var t = e.touches[0];
  var dx = t.clientX - startX;
  var dy = t.clientY - startY;

  if (isHorizontal === null) {
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
      isHorizontal = Math.abs(dx) > Math.abs(dy);
      if (!isHorizontal) {
        state = STATE.IDLE;
        pagesWrapper.classList.remove('dragging');
        return;
      }
    }
  }
  if (!isHorizontal) return;

  e.preventDefault && e.preventDefault();
  moveX = dx;
  if (currentPage === 0 && dx > 0) dx = dx * 0.3;
  else if (currentPage === totalPages - 1 && dx < 0) dx = dx * 0.3;
  var pct = (dx / getScreenWidth()) * 50;
  pagesWrapper.style.transform = 'translateX(' + (-currentPage * 50 + pct) + '%)';
}, { passive: false });

pagesWrapper.addEventListener('touchend', function () {
  if (state !== STATE.SWIPING) return;
  state = STATE.IDLE;
  pagesWrapper.classList.remove('dragging');

  if (!isHorizontal) { goToPage(currentPage); return; }
  var elapsed = Date.now() - startT;
  var velocity = Math.abs(moveX) / Math.max(1, elapsed);
  var threshold = getScreenWidth() * 0.2;

  if (moveX < -threshold || (velocity > 0.5 && moveX < -30)) {
    goToPage(currentPage + 1);
  } else if (moveX > threshold || (velocity > 0.5 && moveX > 30)) {
    goToPage(currentPage - 1);
  } else {
    goToPage(currentPage);
  }
}, { passive: true });

pagesWrapper.addEventListener('touchcancel', function () {
  state = STATE.IDLE;
  pagesWrapper.classList.remove('dragging');
  goToPage(currentPage);
});

// ===== 鼠标拖拽（PC端）=====
var mouseDown = false;

pagesWrapper.addEventListener('mousedown', function (e) {
  mouseDown = true;
  startX = e.clientX;
  startY = e.clientY;
  startT = Date.now();
  moveX = 0;
  isHorizontal = null;
  state = STATE.SWIPING;
  pagesWrapper.classList.add('dragging');
});

document.addEventListener('mousemove', function (e) {
  if (!mouseDown || state !== STATE.SWIPING) return;
  var dx = e.clientX - startX;
  var dy = e.clientY - startY;

  if (isHorizontal === null) {
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
      isHorizontal = Math.abs(dx) > Math.abs(dy);
      if (!isHorizontal) {
        state = STATE.IDLE;
        mouseDown = false;
        pagesWrapper.classList.remove('dragging');
        goToPage(currentPage);
        return;
      }
    }
  }
  if (!isHorizontal) return;

  moveX = dx;
  if (currentPage === 0 && dx > 0) dx = dx * 0.3;
  else if (currentPage === totalPages - 1 && dx < 0) dx = dx * 0.3;
  var pct = (dx / getScreenWidth()) * 50;
  pagesWrapper.style.transform = 'translateX(' + (-currentPage * 50 + pct) + '%)';
});

document.addEventListener('mouseup', function () {
  if (!mouseDown) return;
  mouseDown = false;
  if (state !== STATE.SWIPING) return;
  state = STATE.IDLE;
  pagesWrapper.classList.remove('dragging');

  if (!isHorizontal) { goToPage(currentPage); return; }
  var elapsed = Date.now() - startT;
  var velocity = Math.abs(moveX) / Math.max(1, elapsed);
  var threshold = getScreenWidth() * 0.2;

  if (moveX < -threshold || (velocity > 0.5 && moveX < -30)) {
    goToPage(currentPage + 1);
  } else if (moveX > threshold || (velocity > 0.5 && moveX > 30)) {
    goToPage(currentPage - 1);
  } else {
    goToPage(currentPage);
  }
});

// ===== 阻止手势缩放与双击缩放 =====
document.addEventListener('gesturestart', function (e) { e.preventDefault(); }, { passive: false });
document.addEventListener('gesturechange', function (e) { e.preventDefault(); }, { passive: false });
document.addEventListener('gestureend', function (e) { e.preventDefault(); }, { passive: false });

var lastTouchEnd = 0;
document.addEventListener('touchend', function (e) {
  var now = Date.now();
  if (now - lastTouchEnd <= 300) e.preventDefault();
  lastTouchEnd = now;
}, { passive: false });

// 初始化
goToPage(0);
