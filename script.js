'use strict';

/* ========================================
   仿 iPhone 主屏幕 — 仅 Dock（4 个 App）
   图标全部用内联 SVG 代码自动生成
   ======================================== */

/* ---- Dock 内 4 个 App（SVG 图标 + 名称） ---- */
const dockApps = [
    {
        name: '电话',
        glow: 'linear-gradient(135deg, rgba(52,199,89,0.88), rgba(48,173,80,0.72))',
        svg: `<svg viewBox="0 0 24 24" width="33" height="33" aria-label="电话">
                <path fill="#fff" d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
              </svg>`,
    },
    {
        name: '信息',
        glow: 'linear-gradient(135deg, rgba(90,200,250,0.85), rgba(0,122,255,0.72))',
        svg: `<svg viewBox="0 0 24 24" width="33" height="33" aria-label="信息">
                <path fill="#fff" d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
              </svg>`,
    },
    {
        name: '指南针',
        glow: 'linear-gradient(135deg, rgba(255,159,10,0.82), rgba(255,69,58,0.70))',
        svg: `<svg viewBox="0 0 24 24" width="33" height="33" aria-label="指南针">
                <circle cx="12" cy="12" r="9.5" fill="none" stroke="#fff" stroke-width="1.6"/>
                <path fill="#fff" d="M15.6 8.4L13 13l-4.6 2.6L11 11l4.6-2.6z"/>
              </svg>`,
    },
    {
        name: '音乐',
        glow: 'linear-gradient(135deg, rgba(255,45,85,0.85), rgba(175,82,222,0.72))',
        svg: `<svg viewBox="0 0 24 24" width="33" height="33" aria-label="音乐">
                <path fill="#fff" d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
              </svg>`,
    },
];

/* ---- DOM 引用 ---- */
const dockInner = document.getElementById('dockInner');

/* ---- 创建 Dock App（图标 + 名称） ---- */
function createDockApp(app) {
    const item = document.createElement('div');
    item.className = 'dock-app';

    // 图标容器
    const icon = document.createElement('div');
    icon.className = 'dock-app-icon';

    // 半透明彩色光晕底（保留毛玻璃透出底层纹理）
    const glow = document.createElement('div');
    glow.className = 'glow';
    glow.style.background = app.glow;

    icon.appendChild(glow);
    icon.insertAdjacentHTML('beforeend', app.svg);

    // App 名称
    const name = document.createElement('span');
    name.className = 'dock-app-name';
    name.textContent = app.name;

    item.appendChild(icon);
    item.appendChild(name);

    // 点击反馈（轻触缩放）
    item.addEventListener('click', () => {
        item.style.transform = 'scale(0.86)';
        setTimeout(() => { item.style.transform = ''; }, 130);
    });

    return item;
}

/* ---- 渲染 Dock ---- */
function renderDock() {
    dockApps.forEach((app) => dockInner.appendChild(createDockApp(app)));
}

/* ---- 阻止默认行为 ---- */
document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());

// 防止页面拖拽/缩放
document.body.addEventListener('touchmove', (e) => {
    if (e.touches.length > 1) e.preventDefault();
}, { passive: false });

/* ---- 初始化 ---- */
renderDock();
