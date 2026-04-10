## Why

当前内容区在吸顶头部下方仍保留明显的顶部外边距，导致搜索区与头部之间出现额外空隙，整体显得不够贴边。这个空隙主要来自页面根容器的顶部 `padding`，现在需要把内容区顶部直接贴齐到内容头部下方。

## What Changes

- 移除首页内容区根容器的顶部外边距，不再在吸顶头部下方额外留白。
- 保留内容区左右与底部间距，避免在去掉顶部空隙后破坏整体扫描节奏。
- 校正内容区首个模块与头部的衔接方式，确保视觉上直接承接吸顶头部。
- 保持现有搜索、目录跳转、卡片列表和主题切换行为不变，只调整布局间距。

## Capabilities

### New Capabilities
- `content-top-spacing`: 规范内容区在吸顶头部下方的顶部间距行为，确保页面可以按要求贴齐显示。

### Modified Capabilities

## Impact

- Affected code:
  - `frontend-template/src/pages/HomePage.tsx`
  - `frontend-template/src/components/AppLayout.tsx`
  - `frontend-template/src/index.css`
- Affected UI systems:
  - 首页内容区顶部间距
  - 吸顶头部与首屏内容衔接
  - 页面滚动与锚点可见区域
- No API or dependency changes.
