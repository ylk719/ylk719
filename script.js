/* 仿 iPhone 主屏幕 — 仅渲染 Dock 4 个 App */

(function() {
    'use strict';

    var ICON_STROKE = "#5a5a5a";

    /* ---- 生成 iOS 风格齿轮路径 ---- */
    function polar(cx, cy, r, angle) {
        return {
            x: +(cx + r * Math.cos(angle)).toFixed(2),
            y: +(cy + r * Math.sin(angle)).toFixed(2)
        };
    }

    function generateGearPath(cx, cy, teeth, outerR, rootR, tipRatio) {
        var pts = [];
        var step = (Math.PI * 2) / teeth;
        var halfTip = step * tipRatio / 2;
        var halfGap = step * 0.07;

        for (var i = 0; i < teeth; i++) {
            var c = i * step - Math.PI / 2;

            var rl = polar(cx, cy, rootR, c - halfTip - halfGap);
            var tl = polar(cx, cy, outerR, c - halfTip);
            var tr = polar(cx, cy, outerR, c + halfTip);
            var rr = polar(cx, cy, rootR, c + halfTip + halfGap);

            if (i === 0) pts.push("M " + rl.x + " " + rl.y);
            pts.push("L " + tl.x + " " + tl.y);
            pts.push("A " + outerR + " " + outerR + " 0 0 1 " + tr.x + " " + tr.y);
            pts.push("L " + rr.x + " " + rr.y);
            var nc = ((i + 1) % teeth) * step - Math.PI / 2;
            var nrl = polar(cx, cy, rootR, nc - halfTip - halfGap);
            pts.push("A " + rootR + " " + rootR + " 0 0 1 " + nrl.x + " " + nrl.y);
        }
        pts.push("Z");
        return pts.join(" ");
    }

    var gearPath = "";
    try {
        gearPath = generateGearPath(16, 16, 12, 13.5, 11, 0.35);
    } catch(e) {
        // 降级：简单圆环
        gearPath = "M 3 16 A 13 13 0 1 1 29 16 A 13 13 0 1 1 3 16 Z";
    }

    var dockApps = [
        {
            name: "世界书",
            svg: '<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="' + ICON_STROKE + '" stroke-linecap="round" stroke-linejoin="round" width="33" height="33">' +
                '<path d="M16 9 C12 7, 7 6, 4 6 L4 25 C7 25, 12 26, 16 28 Z" stroke-width="1.3"/>' +
                '<path d="M16 9 C20 7, 25 6, 28 6 L28 25 C25 25, 20 26, 16 28 Z" stroke-width="1.3"/>' +
                '<line x1="16" y1="9" x2="16" y2="28" stroke-width="1"/>' +
                '<line x1="7" y1="11" x2="13" y2="10.3" stroke-width="0.6"/>' +
                '<line x1="7" y1="14" x2="13" y2="13.3" stroke-width="0.6"/>' +
                '<line x1="7" y1="17" x2="13" y2="16.3" stroke-width="0.6"/>' +
                '<line x1="7" y1="20" x2="13" y2="19.3" stroke-width="0.6"/>' +
                '<line x1="7" y1="23" x2="13" y2="22.3" stroke-width="0.6"/>' +
                '<line x1="19" y1="10.3" x2="25" y2="11" stroke-width="0.6"/>' +
                '<line x1="19" y1="13.3" x2="25" y2="14" stroke-width="0.6"/>' +
                '<line x1="19" y1="16.3" x2="25" y2="17" stroke-width="0.6"/>' +
                '<line x1="19" y1="19.3" x2="25" y2="20" stroke-width="0.6"/>' +
                '<line x1="19" y1="22.3" x2="25" y2="23" stroke-width="0.6"/>' +
                '</svg>'
        },
        {
            name: "钱包",
            svg: '<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="' + ICON_STROKE + '" stroke-linecap="round" stroke-linejoin="round" width="33" height="33">' +
                '<path d="M5 12 C5 10, 7 9, 9 9 L23 9 C25 9, 27 10, 27 12 V23 C27 25, 25 26, 23 26 H9 C7 26, 5 25, 5 23 Z" stroke-width="1.3"/>' +
                '<line x1="5" y1="15" x2="27" y2="15" stroke-width="0.8"/>' +
                '<circle cx="22" cy="20.5" r="2" stroke-width="1.1"/>' +
                '<line x1="8" y1="20.5" x2="17" y2="20.5" stroke-width="0.6"/>' +
                '</svg>'
        },
        {
            name: "外观",
            svg: '<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="' + ICON_STROKE + '" stroke-linecap="round" stroke-linejoin="round" width="33" height="33">' +
                '<path d="M16 17 C12 13, 9 15, 9 19 C9 22, 12 24, 16 26 C20 24, 23 22, 23 19 C23 15, 20 13, 16 17 Z" stroke-width="1.3"/>' +
                '<ellipse cx="8" cy="13" rx="2.2" ry="3" stroke-width="1.1"/>' +
                '<ellipse cx="12.5" cy="8" rx="2.2" ry="3" stroke-width="1.1" transform="rotate(-15 12.5 8)"/>' +
                '<ellipse cx="19.5" cy="8" rx="2.2" ry="3" stroke-width="1.1" transform="rotate(15 19.5 8)"/>' +
                '<ellipse cx="24" cy="13" rx="2.2" ry="3" stroke-width="1.1"/>' +
                '</svg>'
        },
        {
            name: "设置",
            svg: '<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="' + ICON_STROKE + '" stroke-linecap="round" stroke-linejoin="round" width="33" height="33">' +
                '<path d="' + gearPath + '" stroke-width="1.2"/>' +
                '<circle cx="16" cy="16" r="4.5" stroke-width="1.1"/>' +
                '</svg>'
        }
    ];

    function renderDock() {
        var dockInner = document.getElementById('dockInner');
        if (!dockInner) {
            return;
        }

        var html = '';
        for (var i = 0; i < dockApps.length; i++) {
            var app = dockApps[i];
            html += '<div class="dock-app" data-name="' + app.name + '" role="button" tabindex="0" aria-label="' + app.name + '">';
            html += '<div class="dock-app-icon">' + app.svg + '</div>';
            html += '<span class="dock-app-name">' + app.name + '</span>';
            html += '</div>';
        }
        dockInner.innerHTML = html;

        var apps = dockInner.querySelectorAll('.dock-app');
        for (var j = 0; j < apps.length; j++) {
            (function(idx) {
                apps[idx].addEventListener('click', function() {
                    console.log('打开 App:', dockApps[idx].name);
                });
            })(j);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', renderDock);
    } else {
        renderDock();
    }
})();
