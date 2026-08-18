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
       事件绑定
       ======================================== */
    function bindEvents() {
        // 设置 App 图标 → 打开设置界面
        var dockApps = document.querySelectorAll('.dock-app');
        for (var i = 0; i < dockApps.length; i++) {
            (function (app) {
                app.addEventListener('click', function () {
                    var name = app.getAttribute('data-name') || '';
                    if (name === '设置') {
                        openSettings();
                    } else if (window.console && console.log) {
                        console.log('打开 App:', name);
                    }
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

    function init() {
        bindEvents();
        loadWallpaper();  // 页面加载即恢复已保存的壁纸
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();