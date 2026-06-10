---
name: backend-dev-guard
description: 约束本仓库的后端工程开发规则。适用于 super-pro 中的 Node/Express 后端开发、API 设计、模块分层、controller/service/repository/entity/dto 变更、数据库/缓存/配置/日志/错误处理、shared-server 基础设施、可观测性、异常告警、优雅退出、开发环境测试入口、测试、重构以及后端代码评审。
---

# 后端开发守卫

用于本仓库所有后端任务。目标不只是“代码能跑”，而是同时保证结构清晰、权限正确、共享能力复用、日志安全、测试可验证。

## 何时使用

当任务涉及以下内容时触发本 skill：

- `general-server` / `agent-server` / `reimburse-server`
- Node / Express API
- controller / service / repository / dto / entity
- 数据库、Redis、配置、日志、运行时
- 后端代码评审
- 新接口、改接口、管理后台操作、上传下载、导入导出

## 开始前必须读取

1. 当前目标服务的现有实现
2. `references/backend-conventions.md`
3. 如果任务涉及接口、路由、CRUD、用户信息、管理操作、上传下载，额外读取 `references/permission-integration.md`

## 默认工作流

1. 先检查当前实现和已有 shared primitive，不要直接重写一套。
2. 判断改动属于业务逻辑、HTTP 契约、持久化、配置、运行时还是权限校验。
3. 优先复用 `packages/shared-server`，服务目录只保留本地适配。
4. 先补 DTO 和分层边界，再写实现。
5. 改行为就补最相关测试。
6. 最后运行最小但有效的验证命令。

## 分层规则

- 优先遵循 `router -> controller -> service -> repository -> entity`
- `req` / `res` 只留在 router / controller
- service 不依赖 Express
- repository 屏蔽 ORM / SQL 细节
- request / response / query / command / view-model 都要有明确 DTO

## Shared-Server 优先

修改后端基础设施前，先检查这些现有能力：

- `createHttpApp`
- `createResponseMiddleware`
- `createErrorMiddleware`
- `createRequestLoggerMiddleware`
- `createServiceRuntime`
- `createRequestContextMiddleware`
- `getRequestContext`
- `createExceptionEmailReporterFromEnv`
- `createDevExceptionTestRouter`
- `loadProfileEnv`
- `loadServerConfig`
- `getDatabaseConfig`
- `SharedRedisService`
- `SharedAxiosService`
- `BatchProcessor`
- `sanitizeLogValue`

## 权限校验硬规则

- 除非用户明确说明“不需要权限校验”，否则后端新增或修改接口时默认必须做权限校验。
- 只做 `jwtMiddleware` 不够，默认还需要显式权限码和 `requirePermission(...)` / `requireAnyPermission(...)` / `requireAllPermissions(...)`。
- 公开匿名接口必须是例外，并且在 router 编排里显式可见。
- 任何新接口、接口拆分合并、按钮对应的后端动作、用户信息读取、列表查询、详情展示、导出导入，都要先定义权限边界，再实现业务逻辑。
- 如果前端页面、菜单、按钮或用户显示依赖该接口，必须同步确认后端已有接口级强校验。

具体接法见 `references/permission-integration.md`。

## 运行时与安全

- `.env.*` 要先于 runtime / logger / reporter 初始化
- 健康检查、优雅退出、异常上报优先走 shared runtime
- 默认统一响应结构：`code` / `msg` / `data` / `timestamp`
- 默认中文错误消息
- 不泄露 stack、SQL 错误、SDK 内部细节
- 禁止记录密码、token、cookie、授权头、私钥和大 payload

## 测试与验证

- shared 改动：跑 shared 对应 build / test
- 服务行为改动：跑对应服务 build 和最相关单测/集成测试
- 涉及权限时，至少验证：
  - 未登录 `401`
  - 已登录无权限 `403`
  - 有权限成功

## 输出要求

最终说明里要交代：

- 复用了哪些 shared 能力
- 哪些权限边界被新增或调整
- 跑了哪些验证
- 哪些地方还没验证，以及风险是什么
