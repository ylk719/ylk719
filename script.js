const appData = {
  choices: [
    {
      avatar:
        "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80",
      text: "「 少女糖霜绘本册 」",
      selected: true,
    },
    {
      avatar:
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80",
      text: "Girl's frosting picture book",
      selected: false,
    },
  ],
  pages: [
    [
      {
        name: "来鸟",
        icon: "https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=240&q=80",
      },
      {
        name: "咩哩咩哩",
        icon: "https://images.unsplash.com/photo-1519052537078-e6302a4968d4?auto=format&fit=crop&w=240&q=80",
      },
      {
        name: "饿了么",
        icon: "https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=240&q=80",
      },
      {
        name: "DeepSeek",
        icon: "https://images.unsplash.com/photo-1518791841217-8f162f1e1131?auto=format&fit=crop&w=240&q=80",
      },
      {
        name: "美颜相机",
        icon: "https://images.unsplash.com/photo-1525253086316-d0c936c814f8?auto=format&fit=crop&w=240&q=80",
      },
      {
        name: "美团",
        icon: "https://images.unsplash.com/photo-1495360010541-f48722b34f7d?auto=format&fit=crop&w=240&q=80",
      },
      {
        name: "QQ音乐",
        icon: "https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?auto=format&fit=crop&w=240&q=80",
      },
      {
        name: "QQ",
        icon: "https://images.unsplash.com/photo-1518717758536-85ae29035b6d?auto=format&fit=crop&w=240&q=80",
      },
    ],
    [
      {
        name: "Messages",
        icon: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=240&q=80",
      },
      {
        name: "Notes",
        icon: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=240&q=80",
      },
      {
        name: "Dream",
        icon: "https://images.unsplash.com/photo-1511044568932-338cba0ad803?auto=format&fit=crop&w=240&q=80",
      },
      {
        name: "Album",
        icon: "https://images.unsplash.com/photo-1518791841217-8f162f1e1131?auto=format&fit=crop&w=240&q=80",
      },
      {
        name: "Chat",
        icon: "https://images.unsplash.com/photo-1519052537078-e6302a4968d4?auto=format&fit=crop&w=240&q=80",
      },
      {
        name: "Camera",
        icon: "https://images.unsplash.com/photo-1525253086316-d0c936c814f8?auto=format&fit=crop&w=240&q=80",
      },
      {
        name: "Music",
        icon: "https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=240&q=80",
      },
      {
        name: "Memo",
        icon: "https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=240&q=80",
      },
    ],
  ],
  secondaryHero: {
    kicker: "AI Chat Space",
    title: "第二页可左右滑动",
    text: "这里保留手机主页的第二屏，用来放更多图标、聊天入口或小组件。",
  },
  widgets: [
    {
      title: "聊天入口",
      text: "这里可以改成 AI 助手卡片、未读消息、快捷会话或最近联系人。",
    },
    {
      title: "页面说明",
      text: "整个舞台固定为手机比例，分享到主屏幕后不会再按普通网页流式拉伸。",
    },
  ],
  photobook: {
    title: "PhotoBook",
    date: "今日 周日",
    favorite: false,
    photos: [
      "https://images.unsplash.com/photo-1511044568932-338cba0ad803?auto=format&fit=crop&w=460&q=80",
      "https://images.unsplash.com/photo-1518791841217-8f162f1e1131?auto=format&fit=crop&w=460&q=80",
      "https://images.unsplash.com/photo-1519052537078-e6302a4968d4?auto=format&fit=crop&w=460&q=80",
    ],
  },
  searchPlaceholder: "搜索",
  dockIcons: [
    {
      name: "设置",
      icon: "https://images.unsplash.com/photo-1525253086316-d0c936c814f8?auto=format&fit=crop&w=240&q=80",
    },
    {
      name: "微信",
      icon: "https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=240&q=80",
    },
    {
      name: "支付宝",
      icon: "https://images.unsplash.com/photo-1519052537078-e6302a4968d4?auto=format&fit=crop&w=240&q=80",
    },
    {
      name: "相机",
      icon: "https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=240&q=80",
    },
  ],
};

const choiceStack = document.getElementById("choiceStack");
const iconGridPrimary = document.getElementById("iconGridPrimary");
const iconGridSecondary = document.getElementById("iconGridSecondary");
const widgetRow = document.getElementById("widgetRow");
const photoStrip = document.getElementById("photoStrip");
const favoriteBtn = document.getElementById("favoriteBtn");
const photoTitle = document.getElementById("photoTitle");
const photoDate = document.getElementById("photoDate");
const dockBar = document.getElementById("dockBar");
const pageDots = document.getElementById("pageDots");
const pagesTrack = document.getElementById("pagesTrack");
const pagesViewport = document.getElementById("pagesViewport");
const secondaryKicker = document.getElementById("secondaryKicker");
const secondaryTitle = document.getElementById("secondaryTitle");
const secondaryText = document.getElementById("secondaryText");

let currentPage = 0;
let startX = 0;
let startY = 0;
let currentOffset = 0;
let isDragging = false;
let isHorizontalGesture = null;

const fileInput = document.createElement("input");
fileInput.type = "file";
fileInput.accept = "image/*";
fileInput.style.display = "none";
document.body.appendChild(fileInput);

let currentUploadCallback = null;
fileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file && currentUploadCallback) {
    const reader = new FileReader();
    reader.onload = (ev) => currentUploadCallback(ev.target.result);
    reader.readAsDataURL(file);
  }
  e.target.value = "";
});

function triggerUpload(callback) {
  currentUploadCallback = callback;
  fileInput.click();
}

function createImage(src, alt) {
  const img = document.createElement("img");
  img.src = src;
  img.alt = alt;
  img.loading = "lazy";
  return img;
}

function renderChoices() {
  choiceStack.innerHTML = "";

  appData.choices.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "choice-item";

    const avatar = document.createElement("button");
    avatar.className = "choice-avatar";
    avatar.type = "button";
    avatar.title = "点击更换头像";
    avatar.appendChild(createImage(item.avatar, `选项头像 ${index + 1}`));
    avatar.addEventListener("click", () => {
      triggerUpload((url) => {
        appData.choices[index].avatar = url;
        renderChoices();
      });
    });

    const bubble = document.createElement("div");
    bubble.className = "choice-bubble";

    const text = document.createElement("span");
    text.className = "choice-text";
    text.textContent = item.text;
    text.contentEditable = "true";
    text.spellcheck = false;
    text.addEventListener("blur", (e) => {
      appData.choices[index].text = e.target.textContent;
    });

    bubble.append(text);
    row.append(avatar, bubble);

    choiceStack.appendChild(row);
  });
}

function renderIcons(target, items) {
  target.innerHTML = "";

  items.forEach((item) => {
    const wrapper = document.createElement("article");
    wrapper.className = "app-item";

    const icon = document.createElement("div");
    icon.className = "app-icon";
    icon.appendChild(createImage(item.icon, item.name));

    const title = document.createElement("p");
    title.className = "app-name";
    title.textContent = item.name;

    wrapper.append(icon, title);
    target.appendChild(wrapper);
  });
}

function renderWidgets() {
  secondaryKicker.textContent = appData.secondaryHero.kicker;
  secondaryTitle.textContent = appData.secondaryHero.title;
  secondaryText.textContent = appData.secondaryHero.text;
  widgetRow.innerHTML = "";

  appData.widgets.forEach((item) => {
    const card = document.createElement("article");
    card.className = "mini-widget";

    const title = document.createElement("p");
    title.className = "mini-widget-title";
    title.textContent = item.title;

    const text = document.createElement("p");
    text.className = "mini-widget-text";
    text.textContent = item.text;

    card.append(title, text);
    widgetRow.appendChild(card);
  });
}

function renderPhotobook() {
  photoTitle.textContent = appData.photobook.title;
  photoTitle.contentEditable = "true";
  photoTitle.spellcheck = false;

  photoDate.textContent = appData.photobook.date;
  photoDate.contentEditable = "true";
  photoDate.spellcheck = false;

  photoStrip.innerHTML = "";

  appData.photobook.photos.forEach((src, index) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "photo-card";
    card.title = "点击上传新图片";
    card.appendChild(createImage(src, `相册图片 ${index + 1}`));
    card.addEventListener("click", () => {
      triggerUpload((url) => {
        appData.photobook.photos[index] = url;
        renderPhotobook();
      });
    });
    photoStrip.appendChild(card);
  });

  favoriteBtn.classList.toggle("is-active", appData.photobook.favorite);
  favoriteBtn.setAttribute("aria-pressed", String(appData.photobook.favorite));
}

function renderDock() {
  dockBar.innerHTML = "";

  appData.dockIcons.forEach((item, index) => {
    const wrapper = document.createElement("div");
    wrapper.className = "dock-item";

    const icon = document.createElement("div");
    icon.className = "dock-icon";
    icon.appendChild(createImage(item.icon, item.name));

    const name = document.createElement("p");
    name.className = "dock-name";
    name.textContent = item.name;
    name.contentEditable = "true";
    name.spellcheck = false;
    name.addEventListener("blur", (e) => {
      appData.dockIcons[index].name = e.target.textContent;
    });

    wrapper.append(icon, name);
    dockBar.appendChild(wrapper);
  });
}

function renderDots() {
  pageDots.innerHTML = "";

  appData.pages.forEach((_, index) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = `page-dot${index === currentPage ? " is-active" : ""}`;
    dot.setAttribute("aria-label", `切换到第 ${index + 1} 页`);
    dot.addEventListener("click", () => setPage(index));
    pageDots.appendChild(dot);
  });
}

function updateTrack(offsetPercent = 0) {
  const base = currentPage * -50;
  const next = base + offsetPercent;

  if (offsetPercent === 0) {
    pagesTrack.style.removeProperty("transform");
    document.documentElement.style.setProperty("--page-index", String(currentPage));
    return;
  }

  pagesTrack.style.transform = `translate3d(${next}%, 0, 0)`;
}

function setPage(index) {
  currentPage = Math.max(0, Math.min(index, appData.pages.length - 1));
  pagesTrack.classList.remove("is-dragging");
  pagesTrack.style.removeProperty("transform");
  document.documentElement.style.setProperty("--page-index", String(currentPage));
  renderDots();
}

function getEventPos(event) {
  if (event.type.includes("mouse")) {
    return { x: event.pageX, y: event.pageY };
  }
  return { x: event.touches[0].clientX, y: event.touches[0].clientY };
}

function onDragStart(event) {
  if (event.target.closest('[contenteditable="true"]')) {
    return;
  }
  const pos = getEventPos(event);
  startX = pos.x;
  startY = pos.y;
  currentOffset = 0;
  isDragging = true;
  isHorizontalGesture = null;
  pagesTrack.classList.add("is-dragging");
}

function onDragMove(event) {
  if (!isDragging) {
    return;
  }

  const pos = getEventPos(event);
  const deltaX = pos.x - startX;
  const deltaY = pos.y - startY;

  if (isHorizontalGesture === null) {
    if (Math.abs(deltaX) < 6 && Math.abs(deltaY) < 6) {
      return;
    }
    isHorizontalGesture = Math.abs(deltaX) > Math.abs(deltaY);
  }

  if (!isHorizontalGesture) {
    pagesTrack.classList.remove("is-dragging");
    pagesTrack.style.removeProperty("transform");
    isDragging = false;
    return;
  }

  if (event.type.includes("mouse")) {
    event.preventDefault();
  }

  const width = pagesViewport.clientWidth || 1;
  currentOffset = (deltaX / width) * 50;

  if ((currentPage === 0 && currentOffset > 0) || (currentPage === appData.pages.length - 1 && currentOffset < 0)) {
    currentOffset *= 0.35;
  }

  updateTrack(currentOffset);
}

function onDragEnd() {
  if (!isDragging) {
    isHorizontalGesture = null;
    return;
  }

  isDragging = false;
  pagesTrack.classList.remove("is-dragging");

  if (Math.abs(currentOffset) > 10) {
    setPage(currentOffset < 0 ? currentPage + 1 : currentPage - 1);
  } else {
    setPage(currentPage);
  }

  currentOffset = 0;
  isHorizontalGesture = null;
}

favoriteBtn.addEventListener("click", () => {
  appData.photobook.favorite = !appData.photobook.favorite;
  renderPhotobook();
});

photoTitle.addEventListener("blur", (e) => {
  appData.photobook.title = e.target.textContent;
});
photoDate.addEventListener("blur", (e) => {
  appData.photobook.date = e.target.textContent;
});

pagesViewport.addEventListener("touchstart", onDragStart, { passive: true });
pagesViewport.addEventListener("touchmove", onDragMove, { passive: false });
pagesViewport.addEventListener("touchend", onDragEnd);
pagesViewport.addEventListener("touchcancel", onDragEnd);

pagesViewport.addEventListener("mousedown", onDragStart);
window.addEventListener("mousemove", onDragMove, { passive: false });
window.addEventListener("mouseup", onDragEnd);

renderChoices();
renderIcons(iconGridPrimary, appData.pages[0]);
renderIcons(iconGridSecondary, appData.pages[1]);
renderWidgets();
renderPhotobook();
renderDock();
renderDots();
setPage(0);

window.mockupConfig = appData;
