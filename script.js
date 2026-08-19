/* ========================================
   仿 iPhone 主屏幕 —— 交互 + 设置 API 配置
   图标与样式已写死在 HTML / CSS 中，此脚本仅做交互与逻辑。
   ======================================== */

(function () {
    'use strict';

    /* ---- 常量 ---- */
    var STORAGE_KEY = 'api_config';
    var SECRET_KEY = 'lscreen-2024-key';

    /* ========================================
       本地加密（XOR 混淆 + Base64）
       说明：纯前端无法做到真正安全，此处为轻量混淆，
       使密钥不以明文直接存储在 localStorage 中。
       ======================================== */
    function xorBuf(key, str) {
        var out = '';
        for (var i = 0; i < str.length; i++) {
            out += String.fromCharCode(str.charCodeAt(i) ^ key.charCodeAt(i % key.length));
        }
        return out;
    }

    function encrypt(plain) {
        try {
            var ascii = encodeURIComponent(plain);
            var xored = xorBuf(SECRET_KEY, ascii);
            return btoa(xored);
        } catch (e) {
            return '';
        }
    }

    function decrypt(encoded) {
        try {
            var xored = atob(encoded);
            var ascii = xorBuf(SECRET_KEY, xored);
            return decodeURIComponent(ascii);
        } catch (e) {
            return '';
        }
    }

    /* ---- DOM 引用 ---- */
    function $(id) { return document.getElementById(id); }

    var settingsScreen = $('settingsScreen');
    var closeSettingsBtn = $('closeSettings');
    var openApiSettingsBtn = $('openApiSettings');
    var backToMainBtn = $('backToMain');

    var urlInput = $('apiUrl');
    var keyInput = $('apiKey');
    var secretToggle = $('secretToggle');
    var fetchModelsBtn = $('fetchModels');
    var fetchHint = $('fetchHint');
    var modelSection = $('modelSection');
    var modelList = $('modelList');
    var modelSelector = $('modelSelector');
    var modelSelectorValue = $('modelSelectorValue');
    var saveConfigBtn = $('saveConfig');
    var saveHint = $('saveHint');

    var openWallpaperSettingsBtn = $('openWallpaperSettings');
    var backToMainFromWallpaperBtn = $('backToMainFromWallpaper');
    var wallpaperInput = $('wallpaperInput');
    var selectWallpaperBtn = $('selectWallpaperBtn');
    var saveWallpaperBtn = $('saveWallpaperBtn');
    var wallpaperPreview = $('wallpaperPreview');
    var previewImage = $('previewImage');
    var wallpaperPlaceholder = $('wallpaperPlaceholder');
    var wallpaperHint = $('wallpaperHint');

    var WALLPAPER_KEY = 'wallpaper';
    var currentWallpaper = null;   // 已应用到主屏幕的壁纸
    var pendingWallpaper = null;   // 本次新选择、尚未保存的壁纸

    /* ---- 内容自定义（直接点击编辑，无需设置页） ---- */
    var CONTENT_KEY = 'content-config';

    var selectedModel = null;

    /* ========================================
       工具函数
       ======================================== */

    /* ---- IndexedDB 封装（用于壁纸等大文件，容量远大于 localStorage） ---- */
    var DB_NAME = 'lockscreen-db';
    var DB_VERSION = 1;
    var DB_STORE = 'settings';

    function idbOpen() {
        return new Promise(function (resolve, reject) {
            if (!window.indexedDB) { reject(new Error('no-indexeddb')); return; }
            var req = indexedDB.open(DB_NAME, DB_VERSION);
            req.onupgradeneeded = function (e) {
                var db = e.target.result;
                if (!db.objectStoreNames.contains(DB_STORE)) {
                    db.createObjectStore(DB_STORE);
                }
            };
            req.onsuccess = function (e) { resolve(e.target.result); };
            req.onerror = function (e) { reject(e.target.error || new Error('open-failed')); };
        });
    }

    function idbGet(key) {
        return idbOpen().then(function (db) {
            return new Promise(function (resolve, reject) {
                try {
                    var tx = db.transaction(DB_STORE, 'readonly');
                    var rq = tx.objectStore(DB_STORE).get(key);
                    rq.onsuccess = function () { resolve(rq.result); };
                    rq.onerror = function () { reject(rq.error || new Error('read-failed')); };
                    tx.oncomplete = function () { db.close(); };
                    tx.onerror = function () { db.close(); };
                } catch (e) {
                    db.close();
                    reject(e);
                }
            });
        });
    }

    function idbSet(key, value) {
        return idbOpen().then(function (db) {
            return new Promise(function (resolve, reject) {
                try {
                    var tx = db.transaction(DB_STORE, 'readwrite');
                    tx.objectStore(DB_STORE).put(value, key);
                    tx.oncomplete = function () { db.close(); resolve(); };
                    tx.onerror = function () { db.close(); reject(tx.error || new Error('write-failed')); };
                } catch (e) {
                    db.close();
                    reject(e);
                }
            });
        });
    }

    function showHint(el, msg, type) {
        if (!el) return;
        el.textContent = msg || '';
        el.className = 'hint';
        if (type === 'success') el.className = 'hint success';
        else if (type === 'error') el.className = 'hint error';
    }

    function normalizeBase(url) {
        return url.replace(/\/+$/, '');
    }

    function httpErrorText(status) {
        switch (status) {
            case 400: return '请求错误（400 Bad Request），请检查 API 网址格式';
            case 401: return '密钥无效（401 Unauthorized），请检查 API Key 是否正确';
            case 403: return '无权限（403 Forbidden），该密钥无法访问模型列表';
            case 404: return '地址错误（404 Not Found），未找到模型接口，请检查 API 网址';
            case 429: return '请求过于频繁（429），请稍后再试';
            case 500: return '服务器错误（500），请稍后再试';
            default: return '请求失败（HTTP ' + status + '）';
        }
    }

    /* 兼容多种模型列表响应格式 */
    function extractModels(json) {
        var arr = null;
        if (json && json.data && Object.prototype.toString.call(json.data) === '[object Array]') {
            arr = json.data;                 // OpenAI: { data: [{ id: "gpt-4o" }] }
        } else if (json && Object.prototype.toString.call(json) === '[object Array]') {
            arr = json;
        } else if (json && json.models && Object.prototype.toString.call(json.models) === '[object Array]') {
            arr = json.models;
        }
        if (!arr) return null;

        var out = [];
        for (var i = 0; i < arr.length; i++) {
            var m = arr[i];
            var name = null;
            if (typeof m === 'string') name = m;
            else if (m && m.id) name = m.id;
            else if (m && m.name) name = m.name;
            else if (m && m.model) name = m.model;
            if (name) out.push(String(name));
        }
        return out;
    }

    /* ========================================
       设置界面开关
       ======================================== */
    function openSettings() {
        settingsScreen.classList.add('open');
        settingsScreen.setAttribute('aria-hidden', 'false');
        loadConfig();
    }

    function closeSettings() {
        settingsScreen.classList.remove('open');
        settingsScreen.classList.remove('api-visible');
        settingsScreen.classList.remove('wallpaper-visible');
        settingsScreen.classList.remove('lockwallpaper-visible');
        settingsScreen.classList.remove('lockpasscode-visible');
        settingsScreen.setAttribute('aria-hidden', 'true');
    }

    /* ========================================
       模型拉取与选择
       ======================================== */
    /* 设置选择框展示的模型名 */
    function setSelectorValue(name, isPlaceholder) {
        if (!modelSelectorValue) return;
        modelSelectorValue.textContent = name;
        if (isPlaceholder) {
            modelSelectorValue.classList.add('placeholder');
        } else {
            modelSelectorValue.classList.remove('placeholder');
        }
    }

    function renderModels(models) {
        modelList.innerHTML = '';
        selectedModel = null;

        // 拉取后列表默认收起，等用户点小三角再展开
        if (modelList) modelList.classList.add('collapsed');
        if (modelSelector) modelSelector.classList.remove('selected', 'open');
        setSelectorValue('请选择模型', true);

        for (var i = 0; i < models.length; i++) {
            (function (name) {
                var item = document.createElement('button');
                item.type = 'button';
                item.className = 'model-item';
                item.textContent = name;
                item.addEventListener('click', function () {
                    selectModel(name, item);
                });
                modelList.appendChild(item);
            })(models[i]);
        }
        modelSection.hidden = false;
    }

    function selectModel(name, el) {
        selectedModel = name;

        // 选择框里显示选中的模型名
        setSelectorValue(name, false);
        if (modelSelector) {
            modelSelector.classList.add('selected');
            modelSelector.classList.remove('open');
        }

        // 高亮列表项
        var items = modelList.querySelectorAll('.model-item');
        for (var i = 0; i < items.length; i++) {
            items[i].classList.remove('selected');
        }
        el.classList.add('selected');

        // 选中后收起列表
        if (modelList) modelList.classList.add('collapsed');
    }

    function fetchModels() {
        var base = urlInput.value.trim();
        var key = keyInput.value.trim();

        if (!base) { showHint(fetchHint, '请先填写 API 网址', 'error'); return; }
        if (!/^https?:\/\//i.test(base)) { showHint(fetchHint, 'API 网址需以 http:// 或 https:// 开头', 'error'); return; }
        if (!key) { showHint(fetchHint, '请先填写 API 密钥', 'error'); return; }

        fetchModelsBtn.disabled = true;
        fetchModelsBtn.textContent = '正在拉取…';
        showHint(fetchHint, '', '');

        var endpoint = normalizeBase(base) + '/models';

        fetch(endpoint, {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + key,
                'Content-Type': 'application/json'
            }
        }).then(function (res) {
            if (!res.ok) {
                throw new Error(httpErrorText(res.status));
            }
            return res.json();
        }).then(function (json) {
            var models = extractModels(json);
            if (!models || models.length === 0) {
                throw new Error('未在响应中找到模型列表');
            }
            renderModels(models);
            showHint(fetchHint, '拉取成功，共 ' + models.length + ' 个模型，请选择一个', 'success');
        }).catch(function (err) {
            var raw = (err && err.message) ? err.message : String(err);
            var msg;
            if (err instanceof TypeError && raw.indexOf('fetch') !== -1) {
                msg = '网络异常或跨域限制（CORS）。浏览器直接请求 API 通常受跨域限制，请确认该 API 允许浏览器访问，或改用支持 CORS 的代理。';
            } else {
                msg = raw;
            }
            showHint(fetchHint, msg, 'error');
        }).then(function () {
            fetchModelsBtn.disabled = false;
            fetchModelsBtn.textContent = '拉取模型';
        });
    }

    /* ========================================
       保存 / 加载
       ======================================== */
    function saveConfig() {
        var url = urlInput.value.trim();
        var key = keyInput.value.trim();

        if (!url) { showHint(saveHint, '请填写 API 网址', 'error'); return; }
        if (!key) { showHint(saveHint, '请填写 API 密钥', 'error'); return; }
        if (!selectedModel) { showHint(saveHint, '请先拉取并选择一个模型', 'error'); return; }

        try {
            var cfg = {
                url: url,
                key: encrypt(key),
                model: selectedModel
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
            // 保存成功后，收起拉取出来的模型列表
            if (modelList) modelList.classList.add('collapsed');
            showHint(saveHint, '保存成功，配置已生效', 'success');
        } catch (e) {
            showHint(saveHint, '保存失败：' + (e && e.message ? e.message : '本地存储不可用'), 'error');
        }
    }

    function loadConfig() {
        var raw;
        try {
            raw = localStorage.getItem(STORAGE_KEY);
        } catch (e) {
            raw = null;
        }
        if (!raw) return;

        var cfg;
        try {
            cfg = JSON.parse(raw);
        } catch (e) {
            return;
        }

        if (cfg.url) urlInput.value = cfg.url;
        if (cfg.key) {
            var key = decrypt(cfg.key);
            if (key) keyInput.value = key;
        }
        if (cfg.model) {
            selectedModel = cfg.model;
            modelList.innerHTML = '';
            modelSection.hidden = false;

            // 选择框显示已保存的模型
            setSelectorValue(cfg.model, false);
            if (modelSelector) modelSelector.classList.add('selected');
            // 列表保持收起（想重新选择需再次拉取模型）
            if (modelList) modelList.classList.add('collapsed');

            showHint(fetchHint, '已加载上次保存的配置', 'success');
        }
    }

    /* 供聊天应用调用：返回当前已配置的 API 信息 */
    window.getApiConfig = function () {
        var raw;
        try {
            raw = localStorage.getItem(STORAGE_KEY);
        } catch (e) {
            return null;
        }
        if (!raw) return null;

        var cfg;
        try {
            cfg = JSON.parse(raw);
        } catch (e) {
            return null;
        }

        var key = cfg.key ? decrypt(cfg.key) : '';
        return {
            url: cfg.url || '',
            key: key,
            model: cfg.model || '',
            configured: !!(cfg.url && key && cfg.model)
        };
    };

    /* ========================================
       壁纸设置
       ======================================== */
    function setWallpaperHint(msg, type) {
        showHint(wallpaperHint, msg, type);
    }

    /* 将壁纸应用到主屏幕背景（cover 自动裁剪/缩放适配） */
    function applyWallpaperToHome(src) {
        var w = document.querySelector('.wallpaper');
        if (!w) return;
        if (src) {
            w.style.backgroundImage = 'url("' + src + '")';
            w.style.backgroundSize = 'cover';
            w.style.backgroundPosition = 'center center';
            w.style.backgroundRepeat = 'no-repeat';
        } else {
            w.style.backgroundImage = '';
            w.style.backgroundSize = '';
            w.style.backgroundPosition = '';
            w.style.backgroundRepeat = '';
        }
    }

    function showWallpaperPreview(src) {
        if (src) {
            previewImage.src = src;
            previewImage.style.display = 'block';
            wallpaperPlaceholder.style.display = 'none';
        } else {
            previewImage.removeAttribute('src');
            previewImage.style.display = 'none';
            wallpaperPlaceholder.style.display = 'flex';
        }
    }

    function loadWallpaper() {
        currentWallpaper = null;
        pendingWallpaper = null;
        saveWallpaperBtn.disabled = true;
        setWallpaperHint('', '');

        idbGet(WALLPAPER_KEY).then(function (saved) {
            currentWallpaper = saved || null;
            if (saved) {
                showWallpaperPreview(saved);
                applyWallpaperToHome(saved);
            } else {
                showWallpaperPreview(null);
                applyWallpaperToHome(null);
            }
        }).catch(function () {
            // IndexedDB 不可用：回退读取 localStorage 旧数据
            var saved = null;
            try { saved = localStorage.getItem(WALLPAPER_KEY); } catch (e) {}
            currentWallpaper = saved;
            if (saved) {
                showWallpaperPreview(saved);
                applyWallpaperToHome(saved);
            } else {
                showWallpaperPreview(null);
                applyWallpaperToHome(null);
            }
        });
    }

    /* 压缩 / 降采样图片，避免 base64 过大导致 localStorage 溢出 */
    function processImage(file, callback) {
        var reader = new FileReader();
        reader.onload = function (e) {
            var dataUrl = e.target.result;
            var img = new Image();
            img.onload = function () {
                try {
                    var maxDim = 1440;
                    var w = img.naturalWidth || img.width || 1;
                    var h = img.naturalHeight || img.height || 1;
                    var scale = Math.min(1, maxDim / Math.max(w, h));
                    var cw = Math.max(1, Math.round(w * scale));
                    var ch = Math.max(1, Math.round(h * scale));
                    var canvas = document.createElement('canvas');
                    canvas.width = cw;
                    canvas.height = ch;
                    var ctx = canvas.getContext('2d');
                    ctx.fillStyle = '#fce4ec';
                    ctx.fillRect(0, 0, cw, ch);
                    ctx.drawImage(img, 0, 0, cw, ch);
                    var out = canvas.toDataURL('image/jpeg', 0.85);
                    // 若压缩后更大（如小图标 PNG），退回原始数据
                    callback(out.length < dataUrl.length ? out : dataUrl, null);
                } catch (err) {
                    callback(dataUrl, null);
                }
            };
            img.onerror = function () {
                callback(null, '图片加载失败，请更换一张图片');
            };
            img.src = dataUrl;
        };
        reader.onerror = function () {
            callback(null, '图片读取失败，请重试');
        };
        reader.readAsDataURL(file);
    }

    function handleWallpaperSelect(e) {
        var file = e.target.files && e.target.files[0];
        e.target.value = '';  // 允许再次选择同一文件

        if (!file) {
            // 取消选择：保持原有壁纸不变
            return;
        }
        if (!/^image\//.test(file.type)) {
            setWallpaperHint('请选择图片文件（JPG / PNG / WEBP 等）', 'error');
            return;
        }
        if (file.size > 20 * 1024 * 1024) {
            setWallpaperHint('图片超过 20MB，请选择较小的图片', 'error');
            return;
        }

        setWallpaperHint('正在处理图片…', '');
        processImage(file, function (dataUrl, err) {
            if (err) {
                setWallpaperHint(err, 'error');
                return;
            }
            pendingWallpaper = dataUrl;
            showWallpaperPreview(dataUrl);
            saveWallpaperBtn.disabled = false;
            setWallpaperHint('已预览，点击「应用壁纸」保存生效', '');
        });
    }

    function saveWallpaper() {
        if (!pendingWallpaper) {
            setWallpaperHint('请先选择一张壁纸', 'error');
            return;
        }
        saveWallpaperBtn.disabled = true;
        setWallpaperHint('正在保存…', '');

        idbSet(WALLPAPER_KEY, pendingWallpaper).then(function () {
            currentWallpaper = pendingWallpaper;
            pendingWallpaper = null;
            applyWallpaperToHome(currentWallpaper);
            setWallpaperHint('壁纸已应用，正在返回…', 'success');
            setTimeout(function () {
                settingsScreen.classList.remove('wallpaper-visible');
                setWallpaperHint('', '');
            }, 1200);
        }).catch(function () {
            // IndexedDB 失败：回退 localStorage，成功则不报错
            try {
                localStorage.setItem(WALLPAPER_KEY, pendingWallpaper);
                currentWallpaper = pendingWallpaper;
                pendingWallpaper = null;
                applyWallpaperToHome(currentWallpaper);
                setWallpaperHint('壁纸已应用，正在返回…', 'success');
                setTimeout(function () {
                    settingsScreen.classList.remove('wallpaper-visible');
                    setWallpaperHint('', '');
                }, 1200);
            } catch (e) {
                saveWallpaperBtn.disabled = false;
                setWallpaperHint('保存失败：本地存储空间不足，请尝试更小的图片', 'error');
            }
        });
    }

    /* ========================================
       桌面分页滑动切换
       ======================================== */
    var pagesTrack = $('pagesTrack');
    var pageDots = document.querySelectorAll('.page-indicator .dot');
    var currentPage = 0;
    var PAGE_COUNT = 2;

    function updatePageIndicator() {
        for (var i = 0; i < pageDots.length; i++) {
            pageDots[i].classList.toggle('active', i === currentPage);
        }
    }

    function goToPage(index) {
        if (index < 0) index = 0;
        if (index > PAGE_COUNT - 1) index = PAGE_COUNT - 1;
        currentPage = index;
        if (pagesTrack) {
            pagesTrack.style.transition = '';
            pagesTrack.style.transform = 'translateX(' + (-index * 100 / PAGE_COUNT) + '%)';
        }
        updatePageIndicator();
    }

    var swipeStartX = 0;
    var swipeStartY = 0;
    var swipeActive = false;
    var swipeDragged = false;
    var swipeBaseX = 0;
    var swipePointerId = null;

    function onSwipeStart(e) {
        if (!pagesTrack) return;
        // 编辑模式下翻页交给编辑引擎（边缘跨页），此处不处理手势
        if (isEditActive()) return;
        // 设置界面打开时、或从 Dock / 设置层上按下时，不触发翻页
        if (settingsScreen && settingsScreen.classList.contains('open')) return;
        if (e.target && e.target.closest && (e.target.closest('.dock') || e.target.closest('.settings-screen'))) return;
        // 可编辑元素（点图片弹相册 / 点文字就地改）不参与翻页手势
        if (e.target && e.target.closest && e.target.closest('[data-editable]')) return;
        // 鼠标仅左键触发；触控 / 笔直接进入
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        swipeStartX = e.clientX;
        swipeStartY = e.clientY;
        swipeActive = true;
        swipeDragged = false;
        swipePointerId = e.pointerId;
        swipeBaseX = -currentPage * window.innerWidth;
        pagesTrack.style.transition = 'none';
        // 锁定指针，确保抬手 / 取消事件始终回到本元素，避免“卡在半屏”
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
    }

    function onSwipeMove(e) {
        if (!swipeActive || !pagesTrack) return;
        if (e.pointerId !== swipePointerId) return;
        var dx = e.clientX - swipeStartX;
        var dy = e.clientY - swipeStartY;
        if (!swipeDragged && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
            swipeDragged = true;
        }
        if (!swipeDragged) return;
        if (e.cancelable) e.preventDefault();
        var offset = swipeBaseX + dx;
        if ((currentPage === 0 && dx > 0) || (currentPage === PAGE_COUNT - 1 && dx < 0)) {
            offset = swipeBaseX + dx * 0.35;
        }
        pagesTrack.style.transform = 'translateX(' + offset + 'px)';
    }

    function finishSwipe(e) {
        if (!swipeActive || !pagesTrack) return;
        // 仅当确实存在且 id 不匹配时才视为其它指针，避免残留
        if (swipePointerId !== null && e && e.pointerId != null && e.pointerId !== swipePointerId) return;
        var dx = (e && typeof e.clientX === 'number') ? (e.clientX - swipeStartX) : 0;
        swipeActive = false;
        swipePointerId = null;
        if (!swipeDragged) {
            // 未产生拖动：统一回到整页位置，杜绝残留位移
            goToPage(currentPage);
            return;
        }
        var threshold = Math.min(90, window.innerWidth * 0.22);
        var target = currentPage;
        if (dx <= -threshold && currentPage < PAGE_COUNT - 1) target++;
        else if (dx >= threshold && currentPage > 0) target--;
        goToPage(target);
    }

    function onSwipeEnd(e) {
        finishSwipe(e);
    }

    function onSwipeLost() {
        // 指针捕获意外丢失（被系统手势接管等）：立即回收到整页
        finishSwipe(null);
    }

    /* 桌面触控板/鼠标滚轮的横向滑动切页 */
    var wheelAccum = 0;
    var wheelTimer = null;

    function onSwipeWheel(e) {
        if (!pagesTrack) return;
        if (Math.abs(e.deltaX) < 4) return;
        if (e.cancelable) e.preventDefault();
        wheelAccum += e.deltaX;
        if (wheelTimer) clearTimeout(wheelTimer);
        wheelTimer = setTimeout(function () {
            if (Math.abs(wheelAccum) > 60) {
                if (wheelAccum > 0 && currentPage < PAGE_COUNT - 1) goToPage(currentPage + 1);
                else if (wheelAccum < 0 && currentPage > 0) goToPage(currentPage - 1);
            }
            wheelAccum = 0;
        }, 120);
    }

    function initPageSwipe() {
        if (!pagesTrack) return;
        var home = document.querySelector('.home-screen');
        if (!home) return;
        // Pointer Events 同时覆盖鼠标（桌面）与手指（手机），一套逻辑两端通用
        home.addEventListener('pointerdown', onSwipeStart);
        home.addEventListener('pointermove', onSwipeMove);
        home.addEventListener('pointerup', onSwipeEnd);
        home.addEventListener('pointercancel', onSwipeEnd);
        home.addEventListener('lostpointercapture', onSwipeLost);
        // 桌面触控板横向滑动、水平滚轮切页
        home.addEventListener('wheel', onSwipeWheel, { passive: false });
        updatePageIndicator();
    }

    /* ========================================
       波点相框组件：尺寸与右侧 4 个应用网格等高对齐
       ======================================== */
    function syncColorfulWidget() {
        var w = document.querySelector('.colorful-widget');
        var grid = document.querySelector('.apps-grid');
        if (!w || !grid) return;
        var h = grid.offsetHeight;
        if (!h) return;
        // 宽度由 CSS（约屏幕 40%）控制，这里只同步高度，与右侧 2×2 网格顶底对齐
        w.style.height = h + 'px';
    }

    /* ========================================
       内容自定义：头像 / 图片 / 文字可自行替换
       ======================================== */
    var contentConfig = {};   // key -> 字符串（dataUrl 或文字值）

    /* 字段定义：可直接点击编辑的元素（key + DOM 集合选择器 + 区分 map） */
    function getContentFields() {
        return [
            /* 第一页 · 头像 / 图片 */
            { key: 'profilePhoto', sel: '.profile-photo-img', image: true, round: false },
            { key: 'profileAvatar', sel: '.profile-avatar', image: true, round: true },
            { key: 'cwAvatar1', sel: '.colorful-widget .cw-avatar', image: true, nth: 0, round: true },
            { key: 'cwAvatar2', sel: '.colorful-widget .cw-avatar', image: true, nth: 1, round: true },
            /* 第一页 · 文字 */
            { key: 'profileName', sel: '.profile-name', text: true },
            { key: 'profileHandle', sel: '.profile-handle', text: true },
            { key: 'profileBio', sel: '.profile-bio', text: true },
            { key: 'profileLoc', sel: '.profile-loc', text: true },
            { key: 'cwText1', sel: '.colorful-widget .cw-cap-text', text: true, nth: 0 },
            { key: 'cwText2', sel: '.colorful-widget .cw-cap-text', text: true, nth: 1 },
            { key: 'cwFoot', sel: '.colorful-widget .cw-foot', text: true },
            /* 第一页 · 装饰区（耳机+星星+符号，作为一个整体编辑） */
            { key: 'cwDeco', sel: '.colorful-widget .cw-deco', text: true, html: true },
            /* 第二页 · 照片 */
            { key: 'twAvatar', sel: '.tw-body .tw-avatar', image: true },
            { key: 'twPiano', sel: '.tw-body .tw-piano', image: true },
            /* 第二页 · 文字 */
            { key: 'twText', sel: '.tw-body .tw-text', text: true },
            { key: 'twMeta', sel: '.tw-body .tw-meta', text: true },
            { key: 'twFoot', sel: '.page2-content .tw-foot', text: true },
            /* 第二页 · Tab 标签 */
            { key: 'twTab1', sel: '.tw-tabs .tw-tab', text: true, nth: 0 },
            { key: 'twTab2', sel: '.tw-tabs .tw-tab', text: true, nth: 1 },
            { key: 'twTab3', sel: '.tw-tabs .tw-tab', text: true, nth: 2 },
            /* 第二页 · 气泡 */
            { key: 'bubble1', sel: '.chat-self .cb-text', text: true },
            { key: 'bubble2', sel: '.chat-other .cb-text', text: true }
        ];
    }

    function resolveNode(f) {
        if (f.nth !== undefined) return queryNth(f.sel, f.nth);
        return document.querySelector(f.sel);
    }
    function queryNth(sel, n) {
        return document.querySelectorAll(sel)[n];
    }

    /* —— 直接把编辑能力挂到桌面元素：点图片弹相册，点文字就地编辑 —— */
    var contentFileInput = null;      // 共享隐藏 file input
    var contentImageTarget = null;    // 当前点击的图片元素

    function ensureContentFileInput() {
        if (contentFileInput) return;
        contentFileInput = document.createElement('input');
        contentFileInput.type = 'file';
        contentFileInput.accept = 'image/*';
        contentFileInput.style.display = 'none';
        contentFileInput.addEventListener('change', function (ev) {
            var file = ev.target.files && ev.target.files[0];
            ev.target.value = '';
            if (!file || !contentImageTarget) return;
            if (!/^image\//.test(file.type)) return;
            if (file.size > 20 * 1024 * 1024) return;
            var el = contentImageTarget;
            contentImageTarget = null;
            processImage(file, function (dataUrl, err) {
                if (err || !dataUrl) return;
                // 写入 DOM
                el.src = dataUrl;
                // 写入 config 并持久化
                var fields = getContentFields();
                for (var i = 0; i < fields.length; i++) {
                    var f = fields[i];
                    if (!f.image) continue;
                    var n = (f.nth !== undefined) ? resolveNode(f) : null;
                    if ((f.nth !== undefined && n === el) || (f.nth === undefined && document.querySelector(f.sel) === el)) {
                        contentConfig[f.key] = dataUrl;
                        persistContentConfig();
                        break;
                    }
                }
                flashEdited(el);
            });
        });
        document.body.appendChild(contentFileInput);
    }

    function openImagePickerFor(el) {
        ensureContentFileInput();
        contentImageTarget = el;
        contentFileInput.click();
    }

    /* 提交正在编辑的元素（如有） */
    function commitActiveEdit() {
        var editing = document.querySelector('[contenteditable="true"]');
        if (editing && editing.dataset && editing.dataset.editing === '1') {
            // 模拟 blur 以触发其 commit
            editing.blur();
        }
    }

    function beginTextEdit(el) {
        if (el.dataset && el.dataset.editing === '1') return;
        // 先提交其他正在编辑的元素
        commitActiveEdit();
        el.dataset.editing = '1';
        var fieldKey = getFieldKeyOf(el);
        var isHtml = fieldKey === 'twText' || fieldKey === 'cwDeco'; // 卡片文字和装饰区保留 HTML 结构

        // 用 contenteditable 实现就地编辑
        el.setAttribute('contenteditable', 'true');
        el.classList.add('edit-inline');
        el.focus({ preventScroll: true });

        function commit() {
            if (el.dataset.editing !== '1') return;
            el.dataset.editing = '0';
            var val = isHtml ? (el.innerHTML || '') : (el.textContent || '').trim();
            el.removeAttribute('contenteditable');
            el.classList.remove('edit-inline');
            applyContentToField(getFieldKeyOf(el), val);
            persistContentConfig();
            flashEdited(el);
        }

        function onKey(ev) {
            if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); commit(); }
            if (ev.key === 'Escape') { ev.preventDefault(); commit(); }
        }

        // 选中全部文字方便覆盖输入
        var rng = document.createRange();
        rng.selectNodeContents(el);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(rng);

        // 延迟绑定 blur，避免 focus() 后立即触发 blur → commit()
        setTimeout(function () {
            el.addEventListener('blur', function handler() { commit(); el.removeEventListener('blur', handler); });
            el.addEventListener('keydown', function handler(ev) {
                onKey(ev);
                if (ev.key === 'Escape' || (ev.key === 'Enter' && !ev.shiftKey)) el.removeEventListener('keydown', handler);
            });
        }, 50);
    }

    function getFieldKeyOf(el) {
        var fields = getContentFields();
        for (var i = 0; i < fields.length; i++) {
            var f = fields[i];
            if (f.image) {
                if (f.nth !== undefined) { if (queryNth(f.sel, f.nth) === el) return f.key; }
                else if (document.querySelector(f.sel) === el) return f.key;
            } else {
                if (f.nth !== undefined) { if (queryNth(f.sel, f.nth) === el) return f.key; }
                else if (document.querySelector(f.sel) === el) return f.key;
            }
        }
        return null;
    }

    function findFieldByTarget(t) {
        var fields = getContentFields();
        for (var i = 0; i < fields.length; i++) {
            var f = fields[i];
            if (f.image) {
                var el = (f.nth !== undefined) ? queryNth(f.sel, f.nth) : document.querySelector(f.sel);
                if (el && (el === t || el.contains(t))) return f;
            } else {
                var el2 = (f.nth !== undefined) ? queryNth(f.sel, f.nth) : document.querySelector(f.sel);
                if (el2 && (el2 === t || el2.contains(t))) return f;
            }
        }
        return null;
    }

    function flashEdited(el) {
        el.classList.remove('edit-flash');
        void el.offsetWidth; // 触发重排以重启动画
        el.classList.add('edit-flash');
    }

    function initContentEdits() {
        if (window.__contentEditsBound) return;
        window.__contentEditsBound = true;

        // 标记所有可编辑元素
        var fields = getContentFields();
        for (var i = 0; i < fields.length; i++) {
            var f = fields[i];
            var node = (f.nth !== undefined) ? queryNth(f.sel, f.nth) : document.querySelector(f.sel);
            if (node) node.setAttribute('data-editable', f.image ? 'image' : 'text');
        }

        // document 级别 pointerdown 捕获阶段委托
        document.addEventListener('pointerdown', function (ev) {
            var t = ev.target;
            if (!t || !t.closest) return;

            // 1) 点击目标本身就是可编辑元素或在可编辑元素内部
            var editable = t.closest('[data-editable]');

            // 2) 仅当点击目标直接包含可编辑子元素时才匹配
            //    （如 .cw-capsule 直接包含 .cw-cap-text）
            //    排除 .wallpaper / .home-screen / .page 等大容器，避免点壁纸误触
            if (!editable && t.children) {
                for (var c = 0; c < t.children.length; c++) {
                    if (t.children[c].hasAttribute && t.children[c].hasAttribute('data-editable')) {
                        editable = t.children[c];
                        break;
                    }
                }
            }

            if (!editable) return;

            var field = getFieldKeyOf(editable);
            if (!field) {
                // 退化：用 findFieldByTarget 尝试
                var ff = findFieldByTarget(t);
                if (!ff) return;
                field = ff.key;
                editable = (ff.nth !== undefined) ? queryNth(ff.sel, ff.nth) : document.querySelector(ff.sel);
                if (!editable) return;
            }

            // 文字正在编辑中时，不拦截（允许用户选中文本/定位光标）
            if (editable.dataset.editing === '1') return;

            ev.preventDefault();
            ev.stopPropagation();

            if (editable.getAttribute('data-editable') === 'image') {
                commitActiveEdit();
                openImagePickerFor(editable);
            } else {
                beginTextEdit(editable);
            }
        }, true); // 捕获阶段：在 onSwipeStart（冒泡阶段）之前执行
    }

    /* 加载已保存配置并应用 */
    function loadContentConfig() {
        idbGet(CONTENT_KEY).then(function (cfg) {
            contentConfig = cfg || {};
            applyAllContent();
        }).catch(function () {
            contentConfig = {};
        });
    }

    function applyAllContent() {
        var fields = getContentFields();
        for (var i = 0; i < fields.length; i++) {
            var v = contentConfig[fields[i].key];
            if (v != null) applyContentToField(fields[i].key, v);
        }
    }

    function persistContentConfig() {
        idbSet(CONTENT_KEY, contentConfig).catch(function () {});
    }

    function initContentSettings() {
        initContentEdits();
    }

    /* ========================================
       事件绑定
       ======================================== */
    /* 应用到指定字段 */
    function applyContentToField(key, value) {
        switch (key) {
            case 'profilePhoto': setEl('.profile-photo-img', value, true); break;
            case 'profileAvatar': setEl('.profile-avatar', value, true); break;
            case 'cwAvatar1': setNthEl('.colorful-widget .cw-avatar', 0, value, true); break;
            case 'cwAvatar2': setNthEl('.colorful-widget .cw-avatar', 1, value, true); break;
            case 'profileName': setEl('.profile-name', value, false); break;
            case 'profileHandle': setEl('.profile-handle', value, false); break;
            case 'profileBio': setEl('.profile-bio', value, false); break;
            case 'profileLoc': setEl('.profile-loc', value, false); break;
            case 'cwText1': setNthEl('.colorful-widget .cw-cap-text', 0, value, false); break;
            case 'cwText2': setNthEl('.colorful-widget .cw-cap-text', 1, value, false); break;
            case 'cwFoot': setEl('.colorful-widget .cw-foot', value, false); break;
            case 'cwDeco': { var d = document.querySelector('.colorful-widget .cw-deco'); if (d) d.innerHTML = value; } break;
            case 'twAvatar': setEl('.tw-body .tw-avatar', value, true); break;
            case 'twPiano': setEl('.tw-body .tw-piano', value, true); break;
            case 'twText': { var e = document.querySelector('.tw-body .tw-text'); if (e) e.innerHTML = value; } break;
            case 'twMeta': setEl('.tw-body .tw-meta', value, false); break;
            case 'twFoot': setEl('.page2-content .tw-foot', value, false); break;
            case 'twTab1': setNthEl('.tw-tabs .tw-tab', 0, value, false); break;
            case 'twTab2': setNthEl('.tw-tabs .tw-tab', 1, value, false); break;
            case 'twTab3': setNthEl('.tw-tabs .tw-tab', 2, value, false); break;
            case 'bubble1': setEl('.chat-self .cb-text', value, false); break;
            case 'bubble2': setEl('.chat-other .cb-text', value, false); break;
        }
    }

    function setEl(sel, value, isImg) {
        var el = document.querySelector(sel);
        if (!el) return;
        if (isImg) { el.src = value; } else { el.textContent = value; }
    }

    function setNthEl(sel, n, value, isImg) {
        var els = document.querySelectorAll(sel);
        var el = els[n];
        if (!el) return;
        if (isImg) { el.src = value; } else { el.textContent = value; }
    }

    /* ========================================
       事件绑定
       ======================================== */
    function bindEvents() {
        // 设置 App 图标 → 打开设置界面
        var dockApps = document.querySelectorAll('.dock-app');
        for (var i = 0; i < dockApps.length; i++) {
            (function (app) {
                var lastFire = 0;
                function fire() {
                    var now = Date.now();
                    if (now - lastFire < 300) return;
                    lastFire = now;
                    var name = app.getAttribute('data-name') || '';
                    if (name === '设置') {
                        openSettings();
                    } else if (window.console && console.log) {
                        console.log('打开 App:', name);
                    }
                }
                app.addEventListener('click', fire);
                // iOS 全屏 WebView 兜底：click 可能不触发时，用 touchend 补一次
                app.addEventListener('touchend', function (e) {
                    e.preventDefault();
                    fire();
                });
            })(dockApps[i]);
        }

        // 设置界面导航
        if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', closeSettings);
        if (openApiSettingsBtn) {
            openApiSettingsBtn.addEventListener('click', function () {
                settingsScreen.classList.add('api-visible');
            });
        }
        if (backToMainBtn) {
            backToMainBtn.addEventListener('click', function () {
                settingsScreen.classList.remove('api-visible');
            });
        }

        // 密钥显示 / 隐藏
        if (secretToggle) {
            secretToggle.addEventListener('click', function () {
                var showing = keyInput.type === 'password';
                keyInput.type = showing ? 'text' : 'password';
                secretToggle.textContent = showing ? '隐藏' : '显示';
            });
        }

        // 拉取模型 / 保存
        if (fetchModelsBtn) fetchModelsBtn.addEventListener('click', fetchModels);
        if (saveConfigBtn) saveConfigBtn.addEventListener('click', saveConfig);

        // 选择框（含小三角）点击：展开 / 收起模型列表
        if (modelSelector) {
            modelSelector.addEventListener('click', function () {
                var isCollapsed = modelList.classList.contains('collapsed');
                if (isCollapsed) {
                    modelList.classList.remove('collapsed');
                    modelSelector.classList.add('open');
                } else {
                    modelList.classList.add('collapsed');
                    modelSelector.classList.remove('open');
                }
            });
        }

        // 壁纸设置导航
        if (openWallpaperSettingsBtn) {
            openWallpaperSettingsBtn.addEventListener('click', function () {
                loadWallpaper();
                settingsScreen.classList.add('wallpaper-visible');
            });
        }
        if (backToMainFromWallpaperBtn) {
            backToMainFromWallpaperBtn.addEventListener('click', function () {
                settingsScreen.classList.remove('wallpaper-visible');
                pendingWallpaper = null;  // 未保存直接返回，保持原壁纸不变
                setWallpaperHint('', '');
            });
        }

        // 选择图片 / 应用壁纸
        if (selectWallpaperBtn) {
            selectWallpaperBtn.addEventListener('click', function () {
                if (wallpaperInput) wallpaperInput.click();
            });
        }
        if (wallpaperInput) {
            wallpaperInput.addEventListener('change', handleWallpaperSelect);
        }
        if (saveWallpaperBtn) {
            saveWallpaperBtn.addEventListener('click', saveWallpaper);
        }
    }

    /* ========================================
       桌面编辑模式（长按抖动拖拽、自动挤位、跨页）
       ======================================== */
    var EDIT = {
        active: false,
        source: null,        // 当前拖拽的源元素
        ghost: null,         // 跟随手指的幽灵
        pointerId: null,
        lastTarget: null,    // 上一个落点，用于自动挤位
        pageCols: 4,         // 编辑网格列数
        LONG_PRESS_MS: 500,
        pressTimer: null,
        pressEl: null,
        pressX: 0, pressY: 0,
        startX: 0, startY: 0,
        edgeCooldown: 0,
        moved: false,
        dropTimer: null,
        _flat: false,
        _appGrid: null,
        _pressEvt: null
    };

    function isEditActive() { return EDIT.active; }

    /* ---- 展平第一页网格：编辑期间把 app 直接从 apps-grid 提到 note-apps-row 下 ---- */
    function flattenPageOne() {
        if (EDIT._flat) return;
        var row = document.querySelector('.note-apps-row');
        var grid = document.querySelector('.apps-grid');
        if (!row) return;
        EDIT._appGrid = grid;
        if (grid) {
            // 逐一手动移动 app-cell 到 row（保持顺序），避免把 grid 容器一并移动
            var cells = Array.prototype.slice.call(grid.children);
            for (var i = 0; i < cells.length; i++) {
                if (cells[i].classList && cells[i].classList.contains('app-cell')) {
                    row.appendChild(cells[i]);
                }
            }
        }
        row.setAttribute('data-edit-flat', '1');
        EDIT._flat = true;
    }

    /* 退出时还原：把 app 移回 apps-grid */
    function unflattenPageOne() {
        if (!EDIT._flat) return;
        EDIT._flat = false;
        var row = document.querySelector('.note-apps-row');
        var grid = EDIT._appGrid || document.querySelector('.apps-grid');
        if (row && grid) {
            var apps = Array.prototype.slice.call(row.children).filter(function (c) {
                return c.classList && c.classList.contains('app-cell');
            });
            for (var i = 0; i < apps.length; i++) {
                grid.appendChild(apps[i]);
            }
        }
        if (row) row.removeAttribute('data-edit-flat');
        EDIT._appGrid = null;
    }

    function getContainerForPage(p) {
        return p < 1 ? document.querySelector('.note-apps-row') : document.querySelector('.page2-apps');
    }

    /* 该容器内参与排序的网格子项序号（不含源），返回落点 index */
    function insertionIndex(container, x, y) {
        var kids = [];
        for (var i = 0; i < container.children.length; i++) {
            var c = container.children[i];
            if (c === EDIT.source) continue;
            kids.push(c);
        }
        for (var k = 0; k < kids.length; k++) {
            var r = kids[k].getBoundingClientRect();
            if (!r.width && !r.height) continue;
            var before = (y < r.top + r.height / 2) || (y >= r.top && y < r.bottom && x < r.left + r.width / 2);
            var rowBlocked = y >= r.top - 4 && y <= r.bottom + 4 && x < r.right;
            if (before && (rowBlocked || y < r.top + r.height / 2)) {
                return k;
            }
        }
        return kids.length;
    }

    /* 把源按落点序号重排到容器中（自动挤位） */
    function reorderTo(container, x, y) {
        if (!container) return;
        var idx = insertionIndex(container, x, y);
        var kids = [];
        for (var i = 0; i < container.children.length; i++) {
            var c = container.children[i];
            if (c !== EDIT.source) kids.push(c);
        }
        var ref = idx < kids.length ? kids[idx] : null;
        if (ref && EDIT.source.nextSibling !== ref) {
            container.insertBefore(EDIT.source, ref);
        } else if (!ref && EDIT.source !== container.lastChild) {
            container.appendChild(EDIT.source);
        }
    }

    /* ---- 长按识别 ---- */
    function onPressStart(e) {
        if (settingsScreen && settingsScreen.classList.contains('open')) return;
        if (e.target && e.target.closest && e.target.closest('.dock')) return;
        // 可编辑元素不触发长按进入编辑模式
        if (e.target && e.target.closest && e.target.closest('[data-editable]')) return;
        var target = e.target && e.target.closest ? e.target.closest('.app-cell, .colorful-widget') : null;
        if (!target) return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        clearPressTimer();
        EDIT.pressEl = target;
        EDIT.pressX = e.clientX;
        EDIT.pressY = e.clientY;
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
        EDIT._pressEvt = { clientX: e.clientX, clientY: e.clientY, pointerId: e.pointerId };
        EDIT.pressTimer = setTimeout(function () {
            EDIT.pressTimer = null;
            if (!EDIT.pressEl) return;
            enterEditMode(EDIT.pressEl, EDIT._pressEvt);
            EDIT._pressEvt = null;
        }, EDIT.LONG_PRESS_MS);
    }

    function onPressMove(e) {
        if (EDIT.active) { onEditDragMove(e); return; }
        if (!EDIT.pressEl) return;
        var dx = Math.abs(e.clientX - EDIT.pressX);
        var dy = Math.abs(e.clientY - EDIT.pressY);
        if (dx + dy > 8) { clearPressTimer(); EDIT.pressEl = null; }
    }

    function onPressEndOrCancel(e) {
        if (EDIT.active) { onEditDragEnd(e); return; }
        clearPressTimer();
        if (EDIT.active && e.target && !(e.target.closest && (e.target.closest('.app-cell,.colorful-widget,.edit-done-btn')))) {
            exitEditMode();
        }
        EDIT.pressEl = null;
        EDIT._pressEvt = null;
    }

    function clearPressTimer() {
        if (EDIT.pressTimer) { clearTimeout(EDIT.pressTimer); EDIT.pressTimer = null; }
    }

    /* ---- 进入编辑模式 ---- */
    function enterEditMode(source, e) {
        if (EDIT.active) return;
        EDIT.active = true;
        if (e && e.stopPropagation) e.stopPropagation();
        document.documentElement.classList.add('edit-mode-active');
        var doneBtn = $('editDoneBtn');
        if (doneBtn) doneBtn.hidden = false;
        flattenPageOne();
        goToPage(currentPage);
        try { document.body.style.overscrollBehavior = 'none'; } catch (err) {}
        beginDrag(source, e);
    }

    /* ---- 开始拖拽 ---- */
    function beginDrag(source, e) {
        EDIT.source = source;
        EDIT.lastTarget = null;
        EDIT.pointerId = e ? e.pointerId : null;
        // 幽灵：克隆源外观（跟随手指，松手时判定位放回）
        var ghost = source.cloneNode(true);
        ghost.className = 'edit-ghost';
        document.body.appendChild(ghost);
        EDIT.ghost = ghost;
        source.classList.add('edit-source');
        positionGhost(e ? e.clientX : 0, e ? e.clientY : 0);
    }

    function positionGhost(x, y) {
        if (!EDIT.ghost) return;
        EDIT.ghost.style.left = x + 'px';
        EDIT.ghost.style.top = y + 'px';
    }

    /* ---- 拖拽移动：自动挤位 + 跨页 ---- */
    function onEditDragMove(e) {
        if (!EDIT.active || !EDIT.source) return;
        if (e.pointerId != null && EDIT.pointerId != null && e.pointerId !== EDIT.pointerId) return;
        positionGhost(e.clientX, e.clientY);
        handleEdgeAutopage(e.clientX);
        // 手指所在容器
        var container = currentPage < 1 ? document.querySelector('.note-apps-row') : document.querySelector('.page2-apps');
        // 若源已因跨页进入另一容器，则用源所在容器
        if (container && !container.contains(EDIT.source)) {
            var srcGrid = EDIT.source.parentNode;
            container = (srcGrid && (srcGrid.classList.contains('note-apps-row') || srcGrid.classList.contains('page2-apps')))
                ? srcGrid : container;
        }
        /* 用元素命中的落点进行精确挤位 */
        var el = document.elementFromPoint(e.clientX, e.clientY);
        var hit = el && el.closest ? el.closest('.app-cell, .colorful-widget') : null;
        if (hit && hit !== EDIT.source && hit.parentNode) {
            var par = hit.parentNode;
            if (par && par.contains(EDIT.source)) {
                var before = e.clientY < hit.getBoundingClientRect().top + hit.getBoundingClientRect().height / 2;
                if (before) { if (hit.previousSibling !== EDIT.source) par.insertBefore(EDIT.source, hit); }
                else { if (hit.nextSibling !== EDIT.source) par.insertBefore(EDIT.source, hit.nextSibling); }
                return;
            }
        }
        if (container) reorderTo(container, e.clientX, e.clientY);
    }

    /* ---- 边缘跨页（拖拽到屏幕左右边缘自动切页） ---- */
    function handleEdgeAutopage(x) {
        var now = Date.now();
        var nearRight = x > window.innerWidth - 44;
        var nearLeft = x < 44;
        var canNext = currentPage < PAGE_COUNT - 1;
        var canPrev = currentPage > 0;
        if (((nearRight && canNext) || (nearLeft && canPrev)) && (now - EDIT.edgeCooldown > 500)) {
            EDIT.edgeCooldown = now;
            var targetPage = (nearRight && canNext) ? currentPage + 1 : currentPage - 1;
            var dest = getContainerForPage(targetPage);
            // 跨页：源物理移入目标容器，随网格重排
            if (dest && EDIT.source && EDIT.source.parentNode !== dest) {
                dest.appendChild(EDIT.source);
            }
            goToPage(targetPage);
            // 切页后落点仅在目标页重新计算一次
            EDIT.lastTarget = null;
            EDIT.edgeCooldown = now;
        }
    }

    /* ---- 松手 / 结束拖拽 ---- */
    function onEditDragEnd(e) {
        if (!EDIT.active) return;
        if (EDIT.ghost) { EDIT.ghost.remove(); EDIT.ghost = null; }
        if (EDIT.source) {
            EDIT.source.classList.remove('edit-source');
            EDIT.source = null;
        }
        EDIT.lastTarget = null;
        EDIT.pointerId = null;
    }

    /* ---- 退出编辑模式 ---- */
    function exitEditMode() {
        if (!EDIT.active) return;
        EDIT.active = false;
        document.documentElement.classList.remove('edit-mode-active');
        var doneBtn = $('editDoneBtn');
        if (doneBtn) doneBtn.hidden = true;
        if (EDIT.ghost) { EDIT.ghost.remove(); EDIT.ghost = null; }
        if (EDIT.source) { EDIT.source.classList.remove('edit-source'); EDIT.source = null; }
        clearPressTimer();
        EDIT.lastTarget = null;
        // 还原第一页网格结构
        unflattenPageOne();
        // 恢复 Dense 布局并回到整页位置
        syncColorfulWidget();
        goToPage(currentPage);
    }

    /* ---- 初始化编辑模式 ----
       注意：与翻页手势共用 home 的 pointer 事件，但编辑模式开启时翻页被短路 */
    function initEditMode() {
        var home = document.querySelector('.home-screen');
        if (!home) return;
        home.addEventListener('pointerdown', onPressStart);
        home.addEventListener('pointermove', onPressMove);
        home.addEventListener('pointerup', onPressEndOrCancel);
        home.addEventListener('pointercancel', onPressEndOrCancel);
        home.addEventListener('lostpointercapture', onPressEndOrCancel);
        var doneBtn = $('editDoneBtn');
        if (doneBtn) doneBtn.addEventListener('click', exitEditMode);
        // 编辑模式下禁止滚轮翻页
        home.addEventListener('wheel', function (e) {
            if (EDIT.active && e.cancelable) e.preventDefault();
        }, { passive: false });
    }

    /* ========================================
       锁屏功能 —— 时钟、滑动解锁、密码校验、壁纸
       ======================================== */
    var LOCK_WALLPAPER_KEY = 'lock-wallpaper';
    var LOCK_PASSCODE_KEY = 'lock-passcode';
    var lockScreen = $('lockScreen');
    var lockScreenBg = $('lockScreenBg');
    var lockClock = $('lockClock');
    var lockDate = $('lockDate');
    var passcodeScreen = $('passcodeScreen');
    var passcodeBg = $('passcodeBg');
    var passcodeHint = $('passcodeHint');
    var passcodeDots = $('passcodeDots');
    var passcodeKeypad = $('passcodeKeypad');
    var passcodeDelete = $('passcodeDelete');

    var passcodeInput = '';
    var lockClockTimer = null;
    var lockUnlocked = false;  // 会话内是否已解锁

    /* ---- 时钟更新 ---- */
    function pad2(n) {
        n = String(n);
        return n.length < 2 ? '0' + n : n;
    }
    function updateLockClock() {
        var now = new Date();
        var h = pad2(now.getHours());
        var m = pad2(now.getMinutes());
        if (lockClock) lockClock.textContent = h + ':' + m;
        if (lockDate) {
            var days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
            var dayName = days[now.getDay()];
            var month = now.getMonth() + 1;
            var date = now.getDate();
            lockDate.textContent = dayName + '  ' + month + '月' + date + '日';
        }
    }

    /* ---- 密码点数更新 ---- */
    function updatePasscodeDots(container, count) {
        var dots = container.querySelectorAll('.passcode-dot');
        for (var i = 0; i < dots.length; i++) {
            if (i < count) dots[i].classList.add('filled');
            else dots[i].classList.remove('filled');
        }
    }

    /* ---- 获取已存密码（解密后明文，无密码返回 null） ---- */
    function getStoredPasscode() {
        try {
            var raw = localStorage.getItem(LOCK_PASSCODE_KEY);
            if (!raw) return null;
            return decrypt(raw);
        } catch (e) { return null; }
    }

    /* ---- 保存密码（加密存储） ---- */
    function setStoredPasscode(code) {
        if (!code) { localStorage.removeItem(LOCK_PASSCODE_KEY); return; }
        localStorage.setItem(LOCK_PASSCODE_KEY, encrypt(code));
    }

    /* ---- 锁屏壁纸加载 ---- */
    function loadLockWallpaper() {
        return idbGet(LOCK_WALLPAPER_KEY).then(function (saved) {
            if (saved) {
                applyLockWallpaper(saved);
            } else {
                // 兜底 localStorage
                try {
                    var fallback = localStorage.getItem(LOCK_WALLPAPER_KEY);
                    if (fallback) applyLockWallpaper(fallback);
                } catch (e) {}
            }
        }).catch(function () {});
    }

    function applyLockWallpaper(src) {
        if (!src) return;
        var html = '<img src="' + src + '" alt="锁屏壁纸">';
        if (lockScreenBg) lockScreenBg.innerHTML = html;
        if (passcodeBg) passcodeBg.innerHTML = html;
    }

    /* ---- 显示锁屏 ---- */
    function showLockScreen() {
        if (lockScreen) {
            lockScreen.classList.remove('hidden');
            lockScreen.style.transform = '';
            lockScreen.style.opacity = '';
        }
        if (passcodeScreen) {
            passcodeScreen.classList.remove('visible');
            passcodeScreen.classList.remove('hidden');
        }
        passcodeInput = '';
        updatePasscodeDots(passcodeDots, 0);
        if (passcodeHint) passcodeHint.textContent = '请输入密码';
        if (!lockClockTimer) {
            updateLockClock();
            lockClockTimer = setInterval(updateLockClock, 1000);
        }
    }

    /* ---- 隐藏锁屏（解锁成功） ---- */
    function hideLockScreen() {
        lockUnlocked = true;
        if (passcodeScreen) passcodeScreen.classList.add('hidden');
        if (lockScreen) lockScreen.classList.add('hidden');
        if (lockClockTimer) { clearInterval(lockClockTimer); lockClockTimer = null; }
    }

    /* ---- 执行解锁（判断是否有密码） ---- */
    function doUnlock() {
        lockScreen.style.transform = '';
        lockScreen.style.opacity = '';
        lockScreen.classList.add('hidden');
        var stored = getStoredPasscode();
        if (stored === null) {
            // 没有设置密码 → 直接进入桌面
            hideLockScreen();
        } else {
            // 有密码 → 显示密码输入界面
            passcodeScreen.classList.add('visible');
            passcodeInput = '';
            updatePasscodeDots(passcodeDots, 0);
            if (passcodeHint) passcodeHint.textContent = '请输入密码';
        }
    }

    /* ---- 滑动解锁 → 进入密码界面 ---- */
    function initLockSwipe() {
        if (!lockScreen) return;
        var startY = 0;
        var dragging = false;

        /* --- Pointer 事件（鼠标 + 触摸统一） --- */
        lockScreen.addEventListener('pointerdown', function (e) {
            dragging = true;
            startY = e.clientY;
            try { lockScreen.setPointerCapture(e.pointerId); } catch (_) {}
        });

        lockScreen.addEventListener('pointermove', function (e) {
            if (!dragging) return;
            var dy = e.clientY - startY;
            if (dy < 0) {
                lockScreen.style.transform = 'translateY(' + dy + 'px)';
                lockScreen.style.opacity = String(Math.max(0.2, 1 + dy / 400));
            }
        });

        lockScreen.addEventListener('pointerup', function (e) {
            if (!dragging) return;
            dragging = false;
            var dy = e.clientY - startY;
            try { lockScreen.releasePointerCapture(e.pointerId); } catch (_) {}
            if (dy < -120) {
                doUnlock();
            } else {
                lockScreen.style.transform = '';
                lockScreen.style.opacity = '';
            }
        });

        lockScreen.addEventListener('pointercancel', function () {
            dragging = false;
            lockScreen.style.transform = '';
            lockScreen.style.opacity = '';
        });

        /* --- Touch 事件（移动端主要使用） --- */
        lockScreen.addEventListener('touchstart', function (e) {
            if (e.touches.length === 0) return;
            dragging = true;
            startY = e.touches[0].clientY;
        }, { passive: false });

        lockScreen.addEventListener('touchmove', function (e) {
            if (!dragging || e.touches.length === 0) return;
            e.preventDefault();
            var dy = e.touches[0].clientY - startY;
            if (dy < 0) {
                lockScreen.style.transform = 'translateY(' + dy + 'px)';
                lockScreen.style.opacity = String(Math.max(0.2, 1 + dy / 400));
            }
        }, { passive: false });

        lockScreen.addEventListener('touchend', function (e) {
            if (!dragging) return;
            dragging = false;
            var dy = (e.changedTouches.length > 0 ? e.changedTouches[0].clientY : startY) - startY;
            if (dy < -80) {
                doUnlock();
            } else {
                lockScreen.style.transform = '';
                lockScreen.style.opacity = '';
            }
        }, { passive: false });

        /* --- 点击底部滑块也可解锁（桌面端 / 自动化测试友好） --- */
        var slider = $('lockSlider');
        if (slider) {
            slider.addEventListener('click', function (e) {
                if (dragging) return;  // 滑动过程中不触发
                doUnlock();
            });
        }
    }

    /* ---- 密码键盘交互 ---- */
    function initPasscodeKeypad() {
        if (!passcodeKeypad) return;
        passcodeKeypad.addEventListener('click', function (e) {
            var key = e.target.closest('.passcode-key');
            if (!key) return;
            var num = key.getAttribute('data-num');
            if (num !== null) {
                handlePasscodeInput(num);
            } else if (key === passcodeDelete || key.classList.contains('passcode-key-delete')) {
                handlePasscodeDelete();
            }
        });
    }

    /* ---- 密码输入处理 ---- */
    function handlePasscodeInput(num) {
        if (passcodeInput.length >= 4) return;
        passcodeInput += num;
        updatePasscodeDots(passcodeDots, passcodeInput.length);
        if (passcodeInput.length === 4) {
            // 自动校验
            setTimeout(checkPasscode, 200);
        }
    }

    function handlePasscodeDelete() {
        if (passcodeInput.length === 0) return;
        passcodeInput = passcodeInput.slice(0, -1);
        updatePasscodeDots(passcodeDots, passcodeInput.length);
    }

    function checkPasscode() {
        var stored = getStoredPasscode();
        if (stored === null) {
            // 没有设置密码，直接解锁
            hideLockScreen();
            return;
        }
        if (passcodeInput === stored) {
            // 密码正确
            passcodeDots.classList.remove('shake');
            hideLockScreen();
        } else {
            // 密码错误 → 抖动 → 清空
            passcodeDots.classList.add('shake');
            if (passcodeHint) passcodeHint.textContent = '密码错误，请重试';
            setTimeout(function () {
                passcodeDots.classList.remove('shake');
                passcodeInput = '';
                updatePasscodeDots(passcodeDots, 0);
                if (passcodeHint) passcodeHint.textContent = '请输入密码';
            }, 600);
        }
    }

    /* ========================================
       锁屏壁纸设置页
       ======================================== */
    var openLockWallpaperBtn = $('openLockWallpaperSettings');
    var backFromLockWallpaperBtn = $('backToMainFromLockWallpaper');
    var lockWallpaperInput = $('lockWallpaperInput');
    var selectLockWallpaperBtn = $('selectLockWallpaperBtn');
    var saveLockWallpaperBtn = $('saveLockWallpaperBtn');
    var lockPreviewImage = $('lockPreviewImage');
    var lockWallpaperPlaceholder = $('lockWallpaperPlaceholder');
    var lockWallpaperHint = $('lockWallpaperHint');
    var pendingLockWallpaper = null;

    function setLockWallpaperHint(msg, type) {
        if (!lockWallpaperHint) return;
        lockWallpaperHint.textContent = msg;
        lockWallpaperHint.style.color = type === 'error' ? '#c44' : type === 'ok' ? '#4a8' : '';
    }

    function showLockWallpaperPreview(src) {
        if (lockPreviewImage) {
            lockPreviewImage.src = src;
            lockPreviewImage.style.display = 'block';
        }
        if (lockWallpaperPlaceholder) lockWallpaperPlaceholder.style.display = 'none';
    }

    function handleLockWallpaperSelect(e) {
        var file = e.target.files && e.target.files[0];
        e.target.value = '';
        if (!file) return;
        if (!/^image\//.test(file.type)) {
            setLockWallpaperHint('请选择图片文件', 'error');
            return;
        }
        if (file.size > 20 * 1024 * 1024) {
            setLockWallpaperHint('图片不能超过 20MB', 'error');
            return;
        }
        processImage(file, function (dataUrl, err) {
            if (err || !dataUrl) {
                setLockWallpaperHint('图片处理失败', 'error');
                return;
            }
            pendingLockWallpaper = dataUrl;
            showLockWallpaperPreview(dataUrl);
            if (saveLockWallpaperBtn) saveLockWallpaperBtn.disabled = false;
            setLockWallpaperHint('', '');
        });
    }

    function saveLockWallpaper() {
        if (!pendingLockWallpaper) return;
        var toSave = pendingLockWallpaper;
        setLockWallpaperHint('保存中…', '');
        idbSet(LOCK_WALLPAPER_KEY, toSave).then(function () {
            applyLockWallpaper(toSave);
            setLockWallpaperHint('锁屏壁纸已保存', 'ok');
            pendingLockWallpaper = null;
            if (saveLockWallpaperBtn) saveLockWallpaperBtn.disabled = true;
            // 兜底 localStorage
            try { localStorage.setItem(LOCK_WALLPAPER_KEY, toSave); } catch (e) {}
        }).catch(function () {
            setLockWallpaperHint('保存失败，请重试', 'error');
        });
    }

    function loadLockWallpaperPreview() {
        return idbGet(LOCK_WALLPAPER_KEY).then(function (saved) {
            if (saved) {
                showLockWallpaperPreview(saved);
                if (saveLockWallpaperBtn) saveLockWallpaperBtn.disabled = true;
            } else {
                try {
                    var fallback = localStorage.getItem(LOCK_WALLPAPER_KEY);
                    if (fallback) {
                        showLockWallpaperPreview(fallback);
                        if (saveLockWallpaperBtn) saveLockWallpaperBtn.disabled = true;
                    }
                } catch (e) {}
            }
        }).catch(function () {});
    }

    /* ========================================
       锁屏密码设置页
       ======================================== */
    var openLockPasscodeBtn = $('openLockPasscodeSettings');
    var backFromLockPasscodeBtn = $('backToMainFromLockPasscode');
    var passcodeSettingsDots = $('passcodeSettingsDots');
    var passcodeSettingsKeypad = $('passcodeSettingsKeypad');
    var passcodeSettingsDelete = $('passcodeSettingsDelete');
    var passcodeSettingsHint = $('passcodeSettingsHint');
    var passcodeSettingsMsg = $('passcodeSettingsMsg');
    var closePasscodeBtn = $('closePasscodeBtn');

    /* 密码设置状态机：
       mode: 'set_new' | 'confirm' | 'verify_old' | 'change_new' | 'change_confirm' | 'close_verify'
       stepInput: 当前步骤已输入的数字
       firstInput: 第一步输入的密码（用于确认对比）
    */
    var pcState = {
        mode: 'set_new',
        stepInput: '',
        firstInput: '',
        hasPassword: false
    };

    function setPcMsg(msg, type) {
        if (!passcodeSettingsMsg) return;
        passcodeSettingsMsg.textContent = msg;
        passcodeSettingsMsg.style.color = type === 'error' ? '#c44' : type === 'ok' ? '#4a8' : '';
    }

    function resetPcState() {
        pcState.hasPassword = getStoredPasscode() !== null;
        if (pcState.hasPassword) {
            pcState.mode = 'verify_old';
            pcState.stepInput = '';
            pcState.firstInput = '';
            if (passcodeSettingsHint) passcodeSettingsHint.textContent = '请输入旧密码';
            if (closePasscodeBtn) closePasscodeBtn.style.display = 'none';
        } else {
            pcState.mode = 'set_new';
            pcState.stepInput = '';
            pcState.firstInput = '';
            if (passcodeSettingsHint) passcodeSettingsHint.textContent = '设置 4 位数字锁屏密码';
            if (closePasscodeBtn) closePasscodeBtn.style.display = 'none';
        }
        updatePasscodeDots(passcodeSettingsDots, 0);
        setPcMsg('', '');
    }

    function initPasscodeSettingsKeypad() {
        if (!passcodeSettingsKeypad) return;
        passcodeSettingsKeypad.addEventListener('click', function (e) {
            var key = e.target.closest('.passcode-key');
            if (!key) return;
            var num = key.getAttribute('data-num');
            if (num !== null) {
                handlePcSettingsInput(num);
            } else if (key === passcodeSettingsDelete || key.classList.contains('passcode-key-delete')) {
                handlePcSettingsDelete();
            }
        });
    }

    function handlePcSettingsInput(num) {
        if (pcState.stepInput.length >= 4) return;
        pcState.stepInput += num;
        updatePasscodeDots(passcodeSettingsDots, pcState.stepInput.length);
        if (pcState.stepInput.length === 4) {
            setTimeout(handlePcStepComplete, 200);
        }
    }

    function handlePcSettingsDelete() {
        if (pcState.stepInput.length === 0) return;
        pcState.stepInput = pcState.stepInput.slice(0, -1);
        updatePasscodeDots(passcodeSettingsDots, pcState.stepInput.length);
    }

    function handlePcStepComplete() {
        var stored = getStoredPasscode();
        switch (pcState.mode) {
            case 'set_new':
                /* 只输入一次，直接保存 */
                setStoredPasscode(pcState.stepInput);
                setPcMsg('密码已设置', 'ok');
                pcState.mode = 'verify_old';
                pcState.hasPassword = true;
                pcState.stepInput = '';
                pcState.firstInput = '';
                updatePasscodeDots(passcodeSettingsDots, 0);
                if (passcodeSettingsHint) passcodeSettingsHint.textContent = '请输入密码';
                if (closePasscodeBtn) closePasscodeBtn.style.display = '';
                break;

            case 'verify_old':
                if (pcState.stepInput === stored) {
                    pcState.stepInput = '';
                    pcState.mode = 'change_new';
                    updatePasscodeDots(passcodeSettingsDots, 0);
                    if (passcodeSettingsHint) passcodeSettingsHint.textContent = '请输入新密码';
                } else {
                    passcodeSettingsDots.classList.add('shake');
                    setPcMsg('旧密码错误', 'error');
                    setTimeout(function () {
                        passcodeSettingsDots.classList.remove('shake');
                        pcState.stepInput = '';
                        updatePasscodeDots(passcodeSettingsDots, 0);
                    }, 600);
                }
                break;

            case 'change_new':
                /* 只输入一次，直接保存 */
                setStoredPasscode(pcState.stepInput);
                setPcMsg('密码已修改', 'ok');
                pcState.mode = 'verify_old';
                pcState.stepInput = '';
                pcState.firstInput = '';
                updatePasscodeDots(passcodeSettingsDots, 0);
                if (passcodeSettingsHint) passcodeSettingsHint.textContent = '请输入密码';
                if (closePasscodeBtn) closePasscodeBtn.style.display = '';
                break;

            case 'close_verify':
                if (pcState.stepInput === stored) {
                    setStoredPasscode('');
                    setPcMsg('密码已关闭', 'ok');
                    pcState.hasPassword = false;
                    pcState.mode = 'set_new';
                    pcState.stepInput = '';
                    pcState.firstInput = '';
                    updatePasscodeDots(passcodeSettingsDots, 0);
                    if (passcodeSettingsHint) passcodeSettingsHint.textContent = '设置 4 位数字锁屏密码';
                    if (closePasscodeBtn) closePasscodeBtn.style.display = 'none';
                } else {
                    passcodeSettingsDots.classList.add('shake');
                    setPcMsg('密码错误', 'error');
                    setTimeout(function () {
                        passcodeSettingsDots.classList.remove('shake');
                        pcState.mode = 'verify_old';
                        pcState.stepInput = '';
                        updatePasscodeDots(passcodeSettingsDots, 0);
                        if (passcodeSettingsHint) passcodeSettingsHint.textContent = '请输入密码';
                        if (closePasscodeBtn) closePasscodeBtn.style.display = '';
                    }, 600);
                }
                break;
        }
    }

    /* ---- 锁屏初始化 ---- */
    function initLockScreen() {
        // 加载锁屏壁纸
        loadLockWallpaper();

        // 滑动解锁
        initLockSwipe();

        // 密码键盘
        initPasscodeKeypad();

        // 回到前台 / 页面重新可见时立即刷新时间（防止手机休眠导致时间卡住）
        var refreshClock = function () {
            if (document.visibilityState === undefined || document.visibilityState === 'visible') {
                updateLockClock();
            }
        };
        document.addEventListener('visibilitychange', refreshClock);
        if (window.addEventListener) {
            window.addEventListener('pageshow', refreshClock);
            window.addEventListener('focus', refreshClock);
        }

        // 锁屏壁纸设置页导航
        if (openLockWallpaperBtn) {
            openLockWallpaperBtn.addEventListener('click', function () {
                loadLockWallpaperPreview();
                settingsScreen.classList.add('lockwallpaper-visible');
            });
        }
        if (backFromLockWallpaperBtn) {
            backFromLockWallpaperBtn.addEventListener('click', function () {
                settingsScreen.classList.remove('lockwallpaper-visible');
                pendingLockWallpaper = null;
                setLockWallpaperHint('', '');
                if (saveLockWallpaperBtn) saveLockWallpaperBtn.disabled = true;
            });
        }
        if (selectLockWallpaperBtn) {
            selectLockWallpaperBtn.addEventListener('click', function () {
                if (lockWallpaperInput) lockWallpaperInput.click();
            });
        }
        if (lockWallpaperInput) {
            lockWallpaperInput.addEventListener('change', handleLockWallpaperSelect);
        }
        if (saveLockWallpaperBtn) {
            saveLockWallpaperBtn.addEventListener('click', saveLockWallpaper);
        }

        // 锁屏密码设置页导航
        if (openLockPasscodeBtn) {
            openLockPasscodeBtn.addEventListener('click', function () {
                resetPcState();
                settingsScreen.classList.add('lockpasscode-visible');
            });
        }
        if (backFromLockPasscodeBtn) {
            backFromLockPasscodeBtn.addEventListener('click', function () {
                settingsScreen.classList.remove('lockpasscode-visible');
                setPcMsg('', '');
            });
        }
        if (passcodeSettingsKeypad) {
            initPasscodeSettingsKeypad();
        }
        if (closePasscodeBtn) {
            closePasscodeBtn.addEventListener('click', function () {
                pcState.mode = 'close_verify';
                pcState.stepInput = '';
                updatePasscodeDots(passcodeSettingsDots, 0);
                if (passcodeSettingsHint) passcodeSettingsHint.textContent = '请输入密码以关闭';
                setPcMsg('', '');
            });
        }

        // 启动时显示锁屏（每次打开都先锁屏）
        showLockScreen();
    }

    function init() {
        try { bindEvents(); } catch (e) { console.error('bindEvents:', e); }
        try { initPageSwipe(); } catch (e) { console.error('initPageSwipe:', e); }
        try { initEditMode(); } catch (e) { console.error('initEditMode:', e); }
        try { initContentSettings(); } catch (e) { console.error('initContentSettings:', e); }
        try { initLockScreen(); } catch (e) { console.error('initLockScreen:', e); }
        try { loadWallpaper(); } catch (e) { console.error('loadWallpaper:', e); }
        try { loadContentConfig(); } catch (e) { console.error('loadContentConfig:', e); }
        try { syncColorfulWidget(); } catch (e) { console.error('syncColorfulWidget:', e); }
        window.addEventListener('resize', syncColorfulWidget);
        window.addEventListener('orientationchange', syncColorfulWidget);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    /* ---- 暴露关键函数到全局（调试 / 自动化测试） ---- */
    window._lockScreen = {
        showLockScreen: showLockScreen,
        doUnlock: doUnlock,
        hideLockScreen: hideLockScreen,
        getStoredPasscode: getStoredPasscode,
        setStoredPasscode: setStoredPasscode,
        lockUnlocked: function () { return lockUnlocked; }
    };
})();