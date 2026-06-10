# API Rules

当任务涉及接口联调、axios 请求封装、登录态、鉴权跳转、401/403 处理或前端数据契约时读取本文件。

如果任务同时涉及页面准入、菜单、按钮或用户显示权限，也要一起读取 `references/permission-integration.md`。

## 请求分层

- 页面和纯视觉组件不直接调用裸 `fetch` / `axios`
- 前端请求统一放在 `src/api/modules/*`
- 请求实例、拦截器、会话、URL 跳转等浏览器基础能力优先复用 `shared-web`
- 请求相关共享类型、DTO、实体和枚举优先复用 `shared-types`

## 响应包络

- 默认遵守后端统一响应结构：`code` / `msg` / `data` / `timestamp`
- 不要在前端发明另一套 `success` / `payload` / `errorMessage`
- 如果后端已有共享 DTO，前端直接复用，不重复定义

## 鉴权与跳转

- 受保护接口默认 `requiresAuth: true`
- 明确处理 `401` 和 `403`
- 登录跳转、redirect 参数拼接、开发环境跳转映射优先复用 `shared-web`
- 不在页面里散落 token、cookie、认证头拼接逻辑
- 登录态读写和会话刷新优先放在 API 层或 shared-web，不放在页面里

## 请求模块约束

- 请求模块只暴露业务语义方法，例如 `getUserDetail`、`createProject`
- 页面层不感知低层 axios 细节
- 如果仓库缺少通用能力，优先补到 `shared-web`，再让具体前端项目接入
