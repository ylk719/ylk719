/* ========================================
   仿 iPhone 主屏幕 —— 交互增强
   图标与样式已写死在 HTML / CSS 中，此脚本仅做增强，
   即使本文件加载失败，Dock 的 4 个 App 也照常显示。
   ======================================== */

(function () {
    'use strict';

    function init() {
        var apps = document.querySelectorAll('.dock-app');

        for (var i = 0; i < apps.length; i++) {
            bindApp(apps[i]);
        }
    }

    function bindApp(appEl) {
        var name = appEl.getAttribute('data-name') || '';
        var icon = appEl.querySelector('.dock-app-icon');

        // 点击反馈
        appEl.addEventListener('click', function () {
            if (window.console && console.log) {
                console.log('打开 App:', name);
            }
        });

        // 液态玻璃高光跟随（触摸/鼠标）：增强玻璃反光真实感
        if (icon && window.matchMedia('(pointer: fine)').matches) {
            icon.addEventListener('mousemove', function (e) {
                var rect = icon.getBoundingClientRect();
                var x = e.clientX - rect.left;
                var y = e.clientY - rect.top;
                icon.style.setProperty('--sheen-x', x + 'px');
                icon.style.setProperty('--sheen-y', y + 'px');
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();