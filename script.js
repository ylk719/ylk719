'use strict';

/* ========================================
   仿 iPhone 主屏幕 — 交互逻辑
   ======================================== */

/* ---- App 数据 ---- */

// 第一页 App（4×4 网格）
const page1Apps = [
    { name: 'FaceTime', emoji: '📹', bg: 'linear-gradient(135deg, #4cd964, #34c759)' },
    { name: '日历',     emoji: '📅', bg: 'linear-gradient(135deg, #ffffff, #e0e0e0)' },
    { name: '照片',     emoji: '🌸', bg: 'linear-gradient(135deg, #ff2d55, #ff9500, #ffcc00, #34c759, #007aff, #5856d6)' },
    { name: '相机',     emoji: '📷', bg: 'linear-gradient(135deg, #555, #2a2a2a)' },
    { name: '邮件',     emoji: '✉️', bg: 'linear-gradient(135deg, #5ac8fa, #007aff)' },
    { name: '备忘录',   emoji: '📝', bg: 'linear-gradient(135deg, #ffcc00, #ff9500)' },
    { name: '提醒事项', emoji: '✅', bg: 'linear-gradient(135deg, #ffffff, #f0f0f0)' },
    { name: '时钟',     emoji: '🕐', bg: 'linear-gradient(135deg, #1a1a1a, #000000)' },
    { name: '地图',     emoji: '🗺️', bg: 'linear-gradient(135deg, #34c759, #007aff)' },
    { name: '天气',     emoji: '⛅', bg: 'linear-gradient(135deg, #5ac8fa, #007aff)' },
    { name: '股票',     emoji: '📈', bg: 'linear-gradient(135deg, #333, #1a1a1a)' },
    { name: '计算器',   emoji: '🧮', bg: 'linear-gradient(135deg, #2a2a2a, #1a1a1a)' },
    { name: '测距仪',   emoji: '📏', bg: 'linear-gradient(135deg, #555, #333)' },
    { name: '语音备忘录', emoji: '🎙️', bg: 'linear-gradient(135deg, #3a3a3a, #1a1a1a)' },
    { name: '文件',     emoji: '📁', bg: 'linear-gradient(135deg, #5ac8fa, #007aff)' },
    { name: '家庭',     emoji: '🏠', bg: 'linear-gradient(135deg, #ff9500, #ff2d55)' },
];

// 第二页 App
const page2Apps = [
    { name: 'App Store', emoji: '🛍️', bg: 'linear-gradient(135deg, #007aff, #0051d5)' },
    { name: '设置',       emoji: '⚙️', bg: 'linear-gradient(135deg, #c7c7cc, #8e8e93)' },
    { name: '健康',       emoji: '❤️', bg: 'linear-gradient(135deg, #ffffff, #ff3b30)' },
    { name: '钱包',       emoji: '👛', bg: 'linear-gradient(135deg, #2a2a2a, #1a1a1a)' },
    { name: '电视',       emoji: '📺', bg: 'linear-gradient(135deg, #1a1a1a, #000000)' },
    { name: '播客',       emoji: '🎧', bg: 'linear-gradient(135deg, #af52de, #5856d6)' },
    { name: '提示',       emoji: '💡', bg: 'linear-gradient(135deg, #ffcc00, #ff9500)' },
    { name: '翻译',       emoji: '🌐', bg: 'linear-gradient(135deg, #5ac8fa, #007aff)' },
    { name: '快捷指令',   emoji: '⚡', bg: 'linear-gradient(135deg, #007aff, #5856d6)' },
    { name: '查找',       emoji: '📍', bg: 'linear-gradient(135deg, #4cd964, #34c759)' },
    { name: '图书',       emoji: '📚', bg: 'linear-gradient(135deg, #ff9500, #ff6b00)' },
    { name: '视频',       emoji: '🎬', bg: 'linear-gradient(135deg, #2a2a2a, #1a1a1a)' },
    { name: '健身',       emoji: '🏃', bg: 'linear-gradient(135deg, #1a1a1a, #333)' },
    { name: '游戏中心',   emoji: '🎮', bg: 'linear-gradient(135deg, #5856d6, #af52de)' },
    { name: '新闻',       emoji: '📰', bg: 'linear-gradient(135deg, #ff3b30, #ff2d55)' },
    { name: '密码',       emoji: '🔑', bg: 'linear-gradient(135deg, #ffcc00, #ff9500)' },
];

// Dock 内 4 个 App（毛玻璃图标，无名称）
const dockApps = [
    { emoji: '📞' },
    { emoji: '💬' },
    { emoji: '🧭' },
    { emoji: '🎵' },
];

/* ---- DOM 引用 ---- */
const track       = document.getElementById('pagesTrack');
const container   = document.getElementById('pagesContainer');
const dockInner   = document.getElementById('dockInner');
const indicators  = document.querySelectorAll('.indicator');

/* ---- 渲染 App ---- */

function createAppItem(app) {
    const item = document.createElement('div');
    item.className = 'app-item';

    const icon = document.createElement('div');
    icon.className = 'app-icon';
    icon.style.setProperty('--icon-bg', app.bg);

    const emoji = document.createElement('span');
    emoji.className = 'app-emoji';
    emoji.textContent = app.emoji;

    icon.appendChild(emoji);

    const name = document.createElement('span');
    name.className = 'app-name';
    name.textContent = app.name;

    item.appendChild(icon);
    item.appendChild(name);
    return item;
}

function createDockApp(app) {
    const item = document.createElement('div');
    item.className = 'dock-app';

    const emoji = document.createElement('span');
    emoji.className = 'app-emoji';
    emoji.textContent = app.emoji;

    item.appendChild(emoji);
    return item;
}

function renderPage(gridId, apps) {
    const grid = document.getElementById(gridId);
    apps.forEach(app => grid.appendChild(createAppItem(app)));
}

function renderDock() {
    dockApps.forEach(app => dockInner.appendChild(createDockApp(app)));
}

/* ---- 图标入场动画 ---- */
let pageAnimated = [false, false];

function animatePageIcons(pageIndex) {
    if (pageAnimated[pageIndex]) return;
    pageAnimated[pageIndex] = true;

    const grid = document.getElementById('grid' + pageIndex);
    const items = grid.querySelectorAll('.app-item');
    items.forEach((item, i) => {
        item.style.animation = `iconAppear 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 0.035}s forwards`;
    });
}

/* ---- 页面切换 ---- */
let currentPage = 0;
const totalPages = 2;

function goToPage(page) {
    currentPage = Math.max(0, Math.min(totalPages - 1, page));
    track.style.transform = `translateX(-${currentPage * 50}%)`;
    updateIndicators();
    animatePageIcons(currentPage);
}

function updateIndicators() {
    indicators.forEach((dot, i) => {
        dot.classList.toggle('active', i === currentPage);
    });
}

/* ---- 触摸滑动 ---- */
let startX = 0;
let startY = 0;
let currentX = 0;
let isDragging = false;
let isHorizontalSwipe = false;
let swipeDirectionDetermined = false;

function onStart(x, y) {
    isDragging = true;
    isHorizontalSwipe = false;
    swipeDirectionDetermined = false;
    startX = x;
    startY = y;
    currentX = x;
    track.classList.add('no-transition');
}

function onMove(x, y) {
    if (!isDragging) return;
    currentX = x;

    const deltaX = x - startX;
    const deltaY = y - startY;

    // 判断滑动方向（仅首次移动时）
    if (!swipeDirectionDetermined) {
        if (Math.abs(deltaX) > 8 || Math.abs(deltaY) > 8) {
            isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY);
            swipeDirectionDetermined = true;
        }
    }

    if (!isHorizontalSwipe) return;

    const containerWidth = container.offsetWidth;
    let percent = (deltaX / containerWidth) * 100;
    const baseTranslate = -currentPage * 50;

    // 边缘回弹效果
    if ((currentPage === 0 && deltaX > 0) ||
        (currentPage === totalPages - 1 && deltaX < 0)) {
        percent *= 0.32;
    }

    track.style.transform = `translateX(calc(${baseTranslate}% + ${percent}%))`;
}

function onEnd() {
    if (!isDragging) return;
    isDragging = false;
    track.classList.remove('no-transition');

    if (!isHorizontalSwipe) {
        goToPage(currentPage);
        return;
    }

    const delta = currentX - startX;
    const threshold = container.offsetWidth * 0.16;

    if (delta < -threshold && currentPage < totalPages - 1) {
        goToPage(currentPage + 1);
    } else if (delta > threshold && currentPage > 0) {
        goToPage(currentPage - 1);
    } else {
        goToPage(currentPage);
    }
}

// Touch 事件
container.addEventListener('touchstart', (e) => {
    onStart(e.touches[0].clientX, e.touches[0].clientY);
}, { passive: true });

container.addEventListener('touchmove', (e) => {
    onMove(e.touches[0].clientX, e.touches[0].clientY);
}, { passive: true });

container.addEventListener('touchend', onEnd);
container.addEventListener('touchcancel', onEnd);

// Mouse 事件（桌面测试用）
container.addEventListener('mousedown', (e) => {
    onStart(e.clientX, e.clientY);
    e.preventDefault();
});

document.addEventListener('mousemove', (e) => {
    if (isDragging) onMove(e.clientX, e.clientY);
});

document.addEventListener('mouseup', () => {
    if (isDragging) onEnd();
});

// 键盘
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' && currentPage > 0) goToPage(currentPage - 1);
    if (e.key === 'ArrowRight' && currentPage < totalPages - 1) goToPage(currentPage + 1);
});

/* ---- 指示器点击 ---- */
indicators.forEach((dot, i) => {
    dot.style.pointerEvents = 'auto';
    dot.style.cursor = 'pointer';
    dot.addEventListener('click', () => goToPage(i));
});

/* ---- 阻止默认行为 ---- */
document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());

// 防止页面拖拽/缩放
document.body.addEventListener('touchmove', (e) => {
    if (e.touches.length > 1) e.preventDefault();
}, { passive: false });

/* ---- 初始化 ---- */
renderPage('grid0', page1Apps);
renderPage('grid1', page2Apps);
renderDock();
animatePageIcons(0);
