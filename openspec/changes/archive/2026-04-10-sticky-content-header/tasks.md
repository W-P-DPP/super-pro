## 1. 统一头部高度

- [x] 1.1 更新 `frontend-template/src/components/AppLayout.tsx`，为侧边栏头部和内容区头部引入统一的高度约束。
- [x] 1.2 调整 `frontend-template/src/components/AppLayout.tsx` 的内容区结构，确保头部继续吸顶且与主体滚动区域分层。

## 2. 适配首页滚动与锚点

- [x] 2.1 更新 `frontend-template/src/pages/HomePage.tsx`，让首页内容在吸顶头部下方滚动时保持稳定间距。
- [x] 2.2 更新首页分组锚点偏移，避免点击侧边栏目录后被吸顶头部遮挡。

## 3. 验证

- [x] 3.1 补充或调整样式常量与全局变量，确保头部高度可复用且不与现有 token 冲突。
- [x] 3.2 运行前端测试或构建，确认布局修改可以正常编译。
