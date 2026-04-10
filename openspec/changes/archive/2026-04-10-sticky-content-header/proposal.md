## Why

当前前端内容区虽然已经有独立顶部栏，但内容主体滚动后，搜索区和分组内容会整体上移，缺少持续可见的上下文入口。同时，内容区头部的高度与左侧边栏头部没有统一约束，导致桌面端两侧顶部基线不够整齐。

这次需要让内容区头部在主内容滚动过程中保持吸顶，并与侧边栏头部共享统一高度，保持结构化工作台的一致性与扫描效率。

## What Changes

- 为前端主内容区增加统一的头部高度约束，使内容区头部与侧边栏头部在桌面端保持一致节奏。
- 重构 `AppLayout` 的主内容壳层，让内容区头部作为独立吸顶层存在，并为下游页面暴露对应的滚动偏移基线。
- 调整 `HomePage` 内容结构，让搜索区与内容列表在吸顶头部下方顺畅滚动，锚点滚动不被吸顶头部遮挡。
- 保持现有目录加载、搜索、卡片渲染和主题切换逻辑不变，只处理布局与滚动行为。

## Capabilities

### New Capabilities

- `sticky-content-header`: 定义主内容区头部吸顶与统一高度的布局规范。

## Impact

- Affected code:
  - `frontend-template/src/components/AppLayout.tsx`
  - `frontend-template/src/pages/HomePage.tsx`
  - `frontend-template/src/index.css`
- Affected UI behavior:
  - 内容区头部吸顶
  - 内容区滚动偏移
  - 分组锚点滚动定位
- No API or dependency changes.
