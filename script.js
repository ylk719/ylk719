'use strict';

/* ========================================
   仿 iPhone 主屏幕 — 仅 Dock（4 个 App）
   图标全部用内联 SVG 代码自动生成
   ======================================== */

/* ---- Dock 内 4 个 App（SVG 图标 + 名称） ----
   图标外层 = 透明毛玻璃（CSS backdrop-filter）
   图标中心图案 = 实心不透明彩色 SVG
*/
const dockApps = [
    {
        // 世界书 — 实心书本图案
        name: '世界书',
        svg: `<svg viewBox="0 0 24 24" width="33" height="33" aria-label="世界书">
                <path fill="#0d9488" d="M12 5.5C10.8 4.6 9 4 7 4S3.2 4.6 2 5.5v13C3.2 17.6 5 17 7 17s3.8.6 5 1.5c1.2-.9 3-1.5 5-1.5s3.8.6 5 1.5v-13C20.8 4.6 19 4 17 4s-3.8.6-5 1.5z"/>
                <path fill="none" stroke="#5eead4" stroke-width="0.7" d="M12 5.5v13"/>
                <path fill="none" stroke="#5eead4" stroke-width="0.6" d="M7 8.2c1.4 0 2.8.3 4 .9M7 11.2c1.4 0 2.8.3 4 .9M13 9.1c1.2-.6 2.6-.9 4-.9M13 12.1c1.2-.6 2.6-.9 4-.9"/>
              </svg>`,
    },
    {
        // 钱包 — 实心钱包图案
        name: '钱包',
        svg: `<svg viewBox="0 0 24 24" width="33" height="33" aria-label="钱包">
                <path fill="#ea580c" d="M21 7H5c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2z"/>
                <path fill="#fbbf24" d="M16 11.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/>
                <path fill="#ea580c" d="M5 5h11c.55 0 1 .45 1 1v1H5c-.55 0-1-.45-1-1s.45-1 1-1z"/>
              </svg>`,
    },
    {
        // 外观 — 实心调色板图案
        name: '外观',
        svg: `<svg viewBox="0 0 24 24" width="33" height="33" aria-label="外观">
                <path fill="#7c3aed" d="M12 3a9 9 0 0 0 0 18c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.3-.5-.8-.5-1.2 0-1.1.9-2 2-2h1.5c2.5 0 4.5-2 4.5-4.5C21 5.5 17 3 12 3z"/>
                <circle cx="7" cy="11" r="1.4" fill="#5856d6"/>
                <circle cx="9.5" cy="7.5" r="1.4" fill="#ff2d55"/>
                <circle cx="14.5" cy="7.5" r="1.4" fill="#34c759"/>
                <circle cx="17" cy="11" r="1.4" fill="#ff9500"/>
              </svg>`,
    },
    {
        // 设置 — 实心齿轮图案
        name: '设置',
        svg: `<svg viewBox="0 0 24 24" width="33" height="33" aria-label="设置">
                <path fill="#3f3f46" fill-rule="evenodd" d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.61-.22l-2.39.96a7.03 7.03 0 0 0-1.62-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.59.24-1.13.55-1.62.94l-2.39-.96a.5.5 0 0 0-.61.22L2.65 8.84a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94 0 .31.02.63.06.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.13.22.39.31.61.22l2.39-.96c.49.39 1.03.7 1.62.94l.36 2.54c.05.24.26.42.5.42h3.84c.24 0 .45-.18.5-.42l.36-2.54c.59-.24 1.13-.55 1.62-.94l2.39.96c.22.09.48 0 .61-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z"/>
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
