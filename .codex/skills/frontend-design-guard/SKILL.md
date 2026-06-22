---
name: frontend-design-guard
description: 约束本仓库前端开发流程。适用于 React、Vite、Next、Tailwind、shadcn 相关任务；当请求涉及页面开发、组件开发、UI 改版、样式或主题调整、布局修改、路由改造、表单开发、弹窗/抽屉/表格/菜单改造、接口联调、axios 请求封装、鉴权跳转、响应式或移动端适配、共享前端能力接入、前端重构、修复前端 bug、接入 shadcn 组件或评审前端实现时，应触发本 skill。
---

# 前端开发守卫

用于本仓库所有前端任务。目标是先对齐设计规范、主题来源、共享包边界和权限要求，再进行最小充分实现。

## 何时使用

当任务涉及以下内容时触发本 skill：

- 页面、组件、布局、样式、主题、交互
- 路由、表单、弹窗、抽屉、表格、菜单
- API 集成、axios 封装、鉴权跳转
- 响应式和移动端适配
- shared-ui / shared-types / shared-styles / shared-web 接入
- 前端重构和评审

## 开始前必须读取

1. 仓库根目录 `design.md`
2. 目标前端项目 `theme.css`
3. 目标项目现有页面、组件、API 目录
4. shared 包真实接入方式：
   - `shared-ui`
   - `shared-types`
   - `shared-styles`
   - `shared-web`
5. 如任务涉及 API、登录态或 401/403，读取 `references/api-rules.md`
6. 如任务涉及页面准入、菜单、按钮、用户显示、敏感数据展示或受保护 API，额外读取 `references/permission-integration.md`
7. 如任务涉及交互细则或收尾验证，再按需读取 `references/ui-rules.md`、`references/validation.md`

## 默认约束

- UI 优先复用 `shared-ui`
- 类型和 DTO 优先复用 `shared-types`
- 样式 token 和主题变量优先复用 `shared-styles`
- 请求能力、会话、跳转优先复用 `shared-web`
- 页面和纯视觉组件不直接调用裸 `fetch` / `axios`
- 默认简体中文文案
- 默认覆盖桌面、平板、移动端

## 新建前端项目 Dockerfile 规则

- 新建任何可部署前端项目时，必须同时在项目根目录生成 `Dockerfile`。
- Dockerfile 必须从 `assets/templates/Dockerfile.frontend.template` 复制，并替换所有 `__PLACEHOLDER__`。
- 前端 Dockerfile 只作为部署元数据，不单独部署前端容器；静态产物由生成的 nginx 网关镜像统一构建和托管。
- 必填标签必须完整：`super-pro.deploy="true"`、`super-pro.service`、`super-pro.kind="frontend"`、`super-pro.port="80"`、`super-pro.routes`。
- 只有一个前端项目可以设置 `super-pro.rootRedirect`；如果不是默认首页，删除该 label 或置空前先确认生成器行为。
- `super-pro.routes` 必须使用以 `/` 开头且以 `/` 结尾的路由，例如 `/zwpsite/`、`/login/`。

## 权限校验硬规则

- 除非用户明确说明“不需要权限校验”，否则前端涉及页面、菜单、按钮、用户显示要求时，默认必须接权限校验。
- 页面准入要先判断“能不能进”，操作区要再判断“能不能做”。
- 用户列表、用户详情、角色权限展示、项目权限展示、当前用户敏感信息展示，也属于权限敏感场景。
- 权限判断优先复用现有 context / hook / shared 工具，不要散落手写。
- 前端显隐只负责体验，若有对应后端接口，必须同步确认后端也有强校验。

具体接法见 `references/permission-integration.md`。

## 默认工作流

1. 先识别目标页面、模块和共享边界。
2. 先判断这次改动是否有权限影响。
3. 先复用现有模式和共享包，再考虑补共享能力。
4. 页面负责编排 UI、状态、加载、错误和用户意图。
5. API 请求统一落在 `src/api/modules/*`。
6. 完成后做最相关构建、测试和响应式检查。

## 阻断条件

以下情况要先停下来说明问题：

- 缺少 `design.md`
- 缺少目标项目主题来源，且无法确认回退方案
- 无法确认 shared 包导出和接入方式
- 用户要求与现有设计系统或共享边界直接冲突

## 输出要求

最终说明里要交代：

- 实际读取了哪些设计和主题来源
- 复用了哪些 shared 包
- 新建前端项目时，说明已生成项目级 `Dockerfile`，并列出 `super-pro.*` 部署标签
- 哪些页面/菜单/按钮/用户显示增加了权限约束
- 跑了哪些构建或测试
- 哪些地方还没验证，以及风险是什么
