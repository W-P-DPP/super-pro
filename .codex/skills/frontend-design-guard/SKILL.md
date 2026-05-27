---
name: frontend-design-guard
description: 约束本仓库前端开发流程。适用于 React、Vite、Next、Tailwind、shadcn 相关任务；当请求涉及页面开发、组件开发、UI 改版、样式或主题调整、布局修改、路由改造、表单开发、弹窗/抽屉/表格/菜单改造、接口联调、axios 请求封装、鉴权跳转、响应式或移动端适配、共享前端能力接入、前端重构、修复前端 bug、接入 shadcn 组件或评审前端实现时，应触发本 skill。开始实现前必须读取 design.md、目标项目 theme.css，并确认 shared-ui、shared-types、shared-styles、shared-web 的复用方式；默认使用简体中文文案并覆盖移动端与响应式。
---

# 前端开发守卫

## 工作流目标

用统一流程完成本仓库前端任务，并确保实现前先对齐设计规范、主题来源和共享包边界，再动手改代码。

如果任务不是前端工作，不要使用这个 skill。

## 工作流

### 1. 识别任务

确认请求是否属于前端工作，例如：

- 页面、组件、布局、样式、主题、交互修改
- 路由、表单、弹窗、抽屉、菜单、表格改造
- API 集成、axios 请求封装、鉴权跳转
- 响应式或移动端适配
- shadcn 组件接入
- 前端重构或前端实现评审

### 2. 读取输入

按顺序读取以下内容：

1. 仓库根目录 `design.md`
2. 目标前端项目 `theme.css`
3. 目标项目现有页面、组件、API 目录
4. 以下共享包的真实接入方式：
   - `<shared-ui>`
   - `<shared-types>`
   - `<shared-styles>`
   - `<shared-web>`

如果目标项目没有 `theme.css`，再读取 `references/theme-fallback.md`。

如果任务涉及以下内容，再按需读取对应 reference：

- 表单、浮层、菜单、表格、导航、移动端交互：`references/ui-rules.md`
- API 集成、axios 模板、鉴权跳转、401/403、响应包络：`references/api-rules.md`
- 完成前检查、构建、测试、双主题、响应式验收：`references/validation.md`

### 3. 形成约束

在写代码前，先明确本次任务的执行边界：

- UI 优先复用 `<shared-ui>`
- 类型、DTO、实体优先复用 `<shared-types>`
- 样式、token、主题变量优先复用 `<shared-styles>`
- 请求模板、鉴权会话、URL 跳转等浏览器能力优先复用 `<shared-web>`
- 页面和纯视觉组件不直接调用 `fetch` 或裸 `axios`
- 默认简体中文文案
- 默认同时覆盖桌面端、平板和移动端
- 默认保持现有 shadcn 体系和既有视觉语言

### 4. 实现代码

按最小充分改动实施：

1. 先复用共享包和现有模式
2. 缺少通用能力时，优先补到共享包
3. 页面只负责编排 UI、路由状态、加载/错误/空状态和用户意图
4. API 请求统一落在 `src/api/modules/*`
5. 不复制基础 UI、共享类型或公共样式

### 5. 验证结果

完成后至少验证：

- 结果符合 `design.md`
- 结果符合目标项目主题源
- UI、类型、样式、API 能力已优先复用共享包
- 页面在移动端无明显横向溢出、遮挡或不可点击区域
- 已运行目标前端项目构建
- 如涉及共享包，同时运行对应共享包构建或测试

如果有未验证项，必须明确说明原因和风险。

## 阻断条件

出现以下情况时停止实现并说明原因：

- 缺少 `design.md`
- 缺少目标项目主题源，且没有兜底主题参考
- 无法确认共享包的 package name、导出或接入方式
- 用户要求与仓库设计规范或共享包边界直接冲突

## 输出要求

最终输出应说明：

- 实际读取了哪些设计和主题来源
- 本次复用了哪些共享包
- 运行了哪些构建或测试命令
- 哪些项未验证以及原因

## 推荐拆分

主 `SKILL.md` 只保留工作流本身。

细则拆到 `references/`：

- `references/ui-rules.md`
  - 表单、浮层、菜单、表格、移动端交互细则
- `references/api-rules.md`
  - API 模块分层、鉴权跳转、401/403、响应包络约束
- `references/validation.md`
  - 构建、测试、双主题、响应式检查清单
- `references/theme-fallback.md`
  - 无 `theme.css` 时的兜底主题说明

## 精简原则

- 主文件只保留触发、输入、约束、实现、验证、阻断、输出
- 长清单、组件细则、浮层细则、示例命令放到 `references/`
- 默认假设模型已经懂 React、Vite、Tailwind、shadcn，只补仓库特有规则
