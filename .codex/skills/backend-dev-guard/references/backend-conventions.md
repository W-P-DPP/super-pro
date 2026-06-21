# Backend Conventions Reference

在 `backend-dev-guard` 触发后，如果任务涉及后端结构、shared-server 基础设施、运行时、日志、安全、测试入口或权限路由编排，读取本文件。

如果任务涉及新增或修改接口、路由、上传下载、管理操作或用户敏感信息读取，还要同时读取 `references/permission-integration.md`。

## 模块结构

优先结构：

```text
src/<domain>/
  <domain>.router.ts
  <domain>.controller.ts
  <domain>.service.ts
  <domain>.repository.ts
  <domain>.dto.ts
  <domain>.entity.ts
```

旧模块可以保留现有目录，但触达的代码仍要遵守同样的层次边界。

## 分层职责

`router`

- 声明路由和路由级中间件
- 显式挂匿名入口
- 负责鉴权和权限中间件编排

`controller`

- 解析 HTTP 输入
- 做 DTO 级校验和归一化
- 调 service
- 返回统一响应结构

`service`

- 负责业务规则和编排
- 协调 repository、cache、第三方客户端和事务
- 不依赖 Express `req` / `res`

`repository`

- 负责持久化访问
- 屏蔽 ORM / SQL 细节
- 返回明确类型

## Shared Server 能力

优先复用：

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

`main.ts`、`app.ts`、`utils/Logger.ts`、`utils/Redis.ts` 应尽量只是把本地配置接到 shared primitive 上的薄适配层。

## 运行时

- 先加载 `.env.*`
- 再创建 runtime / reporter / logger
- 健康检查、优雅退出、异常上报优先走 shared runtime
- `/live`、`/ready`、`/metrics` 默认是内部探针，不是公开产品 API

## 日志与异常

- 统一走结构化日志
- 请求、响应、审计参数和上游错误先脱敏再记录
- 不记录密码、token、cookie、授权头、私钥和大 payload
- 不把 stack、SQL 错误、ORM 内部细节直接返回给前端

## API 契约与鉴权

统一响应结构：

```ts
type ResultVO<T> = {
  code: number
  msg: string
  data?: T
  timestamp: number
}
```

规则：

- `msg` 默认中文
- 新 API 默认启用 JWT
- 匿名接口必须在 router 中显式挂出
- 受保护接口除了 JWT，还应有显式权限中间件
- 新权限码应进入 `@super-pro/shared-types`，不要写死在业务文件里

## 最小验证命令

```bash
pnpm --filter @super-pro/shared-server build
pnpm --filter @super-pro/server build
pnpm --filter @super-pro/agent-server build
pnpm --filter @super-pro/reimburse-server build
```

改服务行为时，再补最相关的 Jest 单测或集成测试。
