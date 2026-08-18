// 最简交互：图标按压缩放反馈 + 阻止误触（双击缩放 / 捏合 / 长按菜单）

const dockApps = document.querySelectorAll('.dock-app');

dockApps.forEach((app) => {
  const icon = app.querySelector('.icon');

  const press = () => icon.classList.add('pressed');
  const release = () => icon.classList.remove('pressed');

  app.addEventListener('touchstart', press, { passive: true });
  app.addEventListener('touchend', release);
  app.addEventListener('touchcancel', release);
  app.addEventListener('mousedown', press);
  ['mouseup', 'mouseleave'].forEach((evt) => app.addEventListener(evt, release));
});

// 阻止 iOS Safari 双击缩放
let lastTouchEnd = 0;
document.addEventListener(
  'touchend',
  (event) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) event.preventDefault();
    lastTouchEnd = now;
  },
  false
);

// 阻止捏合缩放与长按弹出菜单，保持纯净的桌面体验
document.addEventListener('gesturestart', (event) => event.preventDefault());
document.addEventListener('contextmenu', (event) => event.preventDefault());
