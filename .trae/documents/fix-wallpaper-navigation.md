# 修复壁纸设置后无法返回和壁纸不显示的问题

## 问题分析

### 根本原因
**index.html 被覆盖成了 settings.html 的内容**，导致：

1. **无法返回** — 点击「设为壁纸」后 `location.href = 'index.html'` 跳转到的不是手机桌面，而是另一个设置页面。用户在"设置页"里点返回又回到 wallpaper.html，形成循环。
2. **壁纸不显示** — 真正的桌面主屏代码（`#desktop`、`#wallpaper-layer`、app 图标、dock、读取 localStorage 壁纸的脚本）全部丢失。

### 当前状态
- `index.html` = settings.html 的内容（错误）
- `wallpaper.html` = 壁纸设置页（正常）
- `style.css` = 包含 `#wallpaper-layer` 样式（正常）
- Git 中的原始 index.html 包含正确的桌面主屏代码

## 修复计划

### 步骤 1：恢复 index.html 为原始桌面主屏
- 从 git 最新提交中恢复 index.html 的原始内容
- 该内容已包含 `#wallpaper-layer` 元素和读取 localStorage 的脚本

### 步骤 2：验证 wallpaper.html 的逻辑
- 「设为壁纸」按钮保存到 localStorage 后跳转 `index.html` ✓
- wallpaper.html 的返回按钮链接到 `settings.html` ✓
- settings.html 的返回按钮链接到 `index.html` ✓

### 步骤 3：验证导航链路
确保以下路径通畅：
- 桌面(index.html) → 设置(settings.html) → 壁纸(wallpaper.html)
- 壁纸 → 设为壁纸 → 桌面(index.html)
- 壁纸 → 返回 → 设置 → 返回 → 桌面

## 涉及文件
- `/workspace/index.html` — 需要恢复为原始桌面主屏

## 验证方式
- 打开 index.html 确认显示手机桌面（app 图标、dock、搜索栏等）
- 通过桌面进入设置 → 壁纸 → 选择壁纸 → 设为壁纸 → 确认返回桌面且壁纸显示
- 从壁纸页面点返回 → 设置页面 → 再点返回 → 桌面，确认导航正常
