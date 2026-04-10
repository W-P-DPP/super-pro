## 1. 图标适配层重构

- [x] 1.1 重构 `frontend-template/src/data/tool-directory.ts`，移除 `/site-icons/*` 文件名映射逻辑
- [x] 1.2 新增统一的后端图标路径规范化与兜底规则，确保只做最小必要处理

## 2. 页面渲染接入

- [x] 2.1 调整 `frontend-template/src/components/AppLayout.tsx`，让目录区菜单图标直接消费后端 `icon` 字段解析结果
- [x] 2.2 调整 `frontend-template/src/pages/HomePage.tsx`，让分组图标和内容区卡片图标统一消费后端 `icon` 字段解析结果

## 3. 验证与清理

- [x] 3.1 补充或更新前端测试，覆盖后端图标地址、相对路径规范化和空值兜底场景
- [x] 3.2 运行前端测试或构建，确认目录区与内容区卡片图标均可正常展示
