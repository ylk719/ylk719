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
  topIcons: [
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
    "https://images.unsplash.com/photo-1525253086316-d0c936c814f8?auto=format&fit=crop&w=240&q=80",
    "https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=240&q=80",
    "https://images.unsplash.com/photo-1519052537078-e6302a4968d4?auto=format&fit=crop&w=240&q=80",
    "https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=240&q=80",
  ],
};

const choiceStack = document.getElementById("choiceStack");
const iconGrid = document.getElementById("iconGrid");
const photoStrip = document.getElementById("photoStrip");
const favoriteBtn = document.getElementById("favoriteBtn");
const photoTitle = document.getElementById("photoTitle");
const photoDate = document.getElementById("photoDate");
const searchText = document.getElementById("searchText");
const dockBar = document.getElementById("dockBar");

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
    const row = document.createElement("button");
    row.className = `choice-item${item.selected ? " is-selected" : ""}`;
    row.type = "button";
    row.setAttribute("aria-pressed", String(item.selected));

    const avatar = document.createElement("span");
    avatar.className = "choice-avatar";
    avatar.appendChild(createImage(item.avatar, `选项头像 ${index + 1}`));

    const bubble = document.createElement("span");
    bubble.className = "choice-bubble";

    const text = document.createElement("span");
    text.className = "choice-text";
    text.textContent = item.text;

    const checkmark = document.createElement("span");
    checkmark.className = "checkmark";
    checkmark.setAttribute("aria-hidden", "true");

    bubble.append(text, checkmark);
    row.append(avatar, bubble);

    row.addEventListener("click", () => {
      appData.choices = appData.choices.map((choice, choiceIndex) => ({
        ...choice,
        selected: choiceIndex === index,
      }));
      renderChoices();
    });

    choiceStack.appendChild(row);
  });
}

function renderTopIcons() {
  iconGrid.innerHTML = "";

  appData.topIcons.forEach((item) => {
    const wrapper = document.createElement("article");
    wrapper.className = "app-item";

    const icon = document.createElement("div");
    icon.className = "app-icon";
    icon.appendChild(createImage(item.icon, item.name));

    const title = document.createElement("p");
    title.className = "app-name";
    title.textContent = item.name;

    wrapper.append(icon, title);
    iconGrid.appendChild(wrapper);
  });
}

function renderPhotobook() {
  photoTitle.textContent = appData.photobook.title;
  photoDate.textContent = appData.photobook.date;
  photoStrip.innerHTML = "";

  appData.photobook.photos.forEach((src, index) => {
    const card = document.createElement("div");
    card.className = "photo-card";
    card.appendChild(createImage(src, `相册图片 ${index + 1}`));
    photoStrip.appendChild(card);
  });

  favoriteBtn.classList.toggle("is-active", appData.photobook.favorite);
  favoriteBtn.setAttribute("aria-pressed", String(appData.photobook.favorite));
}

function renderDock() {
  dockBar.innerHTML = "";
  appData.dockIcons.forEach((src, index) => {
    const item = document.createElement("div");
    item.className = "dock-item";
    item.appendChild(createImage(src, `Dock 图标 ${index + 1}`));
    dockBar.appendChild(item);
  });
}

favoriteBtn.addEventListener("click", () => {
  appData.photobook.favorite = !appData.photobook.favorite;
  renderPhotobook();
});

searchText.textContent = appData.searchPlaceholder;

renderChoices();
renderTopIcons();
renderPhotobook();
renderDock();

window.mockupConfig = appData;
