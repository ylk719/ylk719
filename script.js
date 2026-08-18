  // iOS-style press feedback on dock icons
  const items = document.querySelectorAll('.dock-item');

  function press(item)  { item.classList.add('pressed'); }
  function release(item){ item.classList.remove('pressed'); }

  items.forEach(item => {
    item.addEventListener('touchstart', () => press(item),   { passive: true });
    item.addEventListener('touchend',   () => release(item), { passive: true });
    item.addEventListener('touchcancel',() => release(item), { passive: true });
    item.addEventListener('mousedown',  () => press(item));
    item.addEventListener('mouseup',    () => release(item));
    item.addEventListener('mouseleave', () => release(item));
  });

  // Generate a matching home-screen icon at runtime (white + glass plate)
  try {
    const c = document.createElement('canvas');
    c.width = c.height = 180;
    const x = c.getContext('2d');
    x.fillStyle = '#FFFFFF';
    x.fillRect(0, 0, 180, 180);
    x.fillStyle = 'rgba(0,0,0,0.08)';
    roundRect(x, 24, 54, 132, 72, 24); x.fill();
    x.fillStyle = 'rgba(29,29,31,0.85)';
    for (let i = 0; i < 4; i++) {
      roundRect(x, 38 + i * 28, 68, 20, 20, 5);
      x.fill();
    }
    function roundRect(ctx, rx, ry, rw, rh, r) {
      ctx.beginPath();
      ctx.moveTo(rx + r, ry);
      ctx.arcTo(rx + rw, ry, rx + rw, ry + rh, r);
      ctx.arcTo(rx + rw, ry + rh, rx, ry + rh, r);
      ctx.arcTo(rx, ry + rh, rx, ry, r);
      ctx.arcTo(rx, ry, rx + rw, ry, r);
      ctx.closePath();
    }
    const link = document.createElement('link');
    link.rel = 'apple-touch-icon';
    link.href = c.toDataURL('image/png');
    document.head.appendChild(link);
  } catch (e) { /* non-visual, ignore */ }

  // ===== Settings app =====
  const settingsPage = document.getElementById('settingsPage');
  const appSettings = document.getElementById('app-settings');
  const settingsBack = document.getElementById('settingsBack');
  const apiBaseUrlInput = document.getElementById('apiBaseUrl');
  const apiKeyInput = document.getElementById('apiKey');
  const modelSelect = document.getElementById('modelSelect');
  const fetchModelsBtn = document.getElementById('fetchModelsBtn');
  const fetchSpinner = document.getElementById('fetchSpinner');
  const fetchBtnText = document.getElementById('fetchBtnText');
  const fetchError = document.getElementById('fetchError');
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');

  const LS_KEYS = { base: 'api_base_url', key: 'api_key', model: 'selected_model' };

  function openSettingsPage() {
    settingsPage.classList.add('open');
    settingsPage.setAttribute('aria-hidden', 'false');
  }
  function closeSettingsPage() {
    settingsPage.classList.remove('open');
    settingsPage.setAttribute('aria-hidden', 'true');
  }
  appSettings.addEventListener('click', openSettingsPage);
  settingsBack.addEventListener('click', closeSettingsPage);

  function showFetchError(msg) { fetchError.textContent = msg; fetchError.hidden = false; }
  function hideFetchError() { fetchError.hidden = true; }
  function setFetching(on) {
    fetchSpinner.hidden = !on;
    fetchModelsBtn.disabled = on;
    fetchBtnText.textContent = on ? '获取中…' : 'Fetch Models';
  }

  async function fetchModels() {
    hideFetchError();
    const base = apiBaseUrlInput.value.trim().replace(/\/+$/, '');
    const key = apiKeyInput.value.trim();
    if (!base) { showFetchError('请先填写 API Base URL'); return; }
    setFetching(true);
    try {
      const res = await fetch(base + '/models', {
        headers: { 'Authorization': 'Bearer ' + key }
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
      const list = (Array.isArray(json) ? json : Array.isArray(json.data) ? json.data : [])
        .map(function(m) { return m && m.id; })
        .filter(Boolean);
      if (!list.length) throw new Error('响应中没有模型');
      modelSelect.innerHTML = '';
      list.forEach(function(id) {
        const opt = document.createElement('option');
        opt.value = id;
        opt.textContent = id;
        modelSelect.appendChild(opt);
      });
      const saved = localStorage.getItem(LS_KEYS.model);
      if (saved && list.indexOf(saved) !== -1) modelSelect.value = saved;
      modelSelect.disabled = false;
    } catch (err) {
      showFetchError('获取失败：' + err.message);
    } finally {
      setFetching(false);
    }
  }
  fetchModelsBtn.addEventListener('click', fetchModels);

  function saveSettings() {
    localStorage.setItem(LS_KEYS.base, apiBaseUrlInput.value.trim().replace(/\/+$/, ''));
    localStorage.setItem(LS_KEYS.key, apiKeyInput.value.trim());
    localStorage.setItem(LS_KEYS.model, modelSelect.value || '');
    const prev = saveSettingsBtn.textContent;
    saveSettingsBtn.textContent = '已保存';
    setTimeout(function() { saveSettingsBtn.textContent = prev; }, 1200);
  }
  saveSettingsBtn.addEventListener('click', saveSettings);

  // Auto-fill saved values on load
  (function loadSettings() {
    const base = localStorage.getItem(LS_KEYS.base);
    const key = localStorage.getItem(LS_KEYS.key);
    const model = localStorage.getItem(LS_KEYS.model);
    if (base) apiBaseUrlInput.value = base;
    if (key) apiKeyInput.value = key;
    if (model) {
      modelSelect.innerHTML = '';
      const opt = document.createElement('option');
      opt.value = model;
      opt.textContent = model;
      modelSelect.appendChild(opt);
      modelSelect.value = model;
      modelSelect.disabled = false;
    }
  })();
