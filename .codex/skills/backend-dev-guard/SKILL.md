---
name: backend-dev-guard
description: 约束本仓库的后端工程开发规则。适用于 super-pro 中的 Node/Express 后端开发、API 设计、模块分层、controller/service/repository/entity/dto 变更、数据库/缓存/配置/日志/错误处理、shared-server 基础设施、测试、重构以及后端代码评审。开始设计或修改前，必须先检查现有实现，再按本 skill 的分层架构、共享基础设施、类型化配置、安全日志和验证要求执行。
---

# 后端开发守卫

## 目标

这个 skill 用于本仓库中的后端工作。目标不只是让代码“能跑”，而是确保系统在内部结构、一致性、可观测性、安全性、可测试性和可扩展性上都保持稳定。

本仓库将 `packages/shared-server` 视为可复用后端基础设施的统一归属地。业务服务应该是围绕共享基础设施的薄适配层，而不是每个服务都复制自己的 app factory、logger、Redis 客户端、Axios 客户端、配置加载器、响应中间件或批处理工具。

当任务涉及模块边界、API 契约、持久化、配置、日志、缓存、HTTP 客户端、鉴权、测试或架构评审时，先读取 `references/backend-conventions.md`。

## 必要流程

1. 在设计或修改前，先检查当前实现。
2. 识别任务类别：业务模块、API 契约、持久化、缓存、配置、日志、外部客户端、应用基础设施、鉴权、测试或重构。
3. 除非用户明确要求改变行为，否则保持现有对外行为兼容。
4. 优先修正当前改动区域的问题，而不是复制已有的薄弱模式。
5. 在写实现前，先定义清楚分层边界和 DTO。
6. 为变更行为补充或更新对应测试。
7. 先运行最小且有意义的验证，再在涉及基础设施时运行更完整的构建/测试检查。
8. 最终说明中要明确指出：哪些内容被收敛/复用、哪些行为保持兼容、实际运行了哪些验证。

## 架构规则

- 后端业务模块采用 `router -> controller -> service -> repository -> entity` 分层。
- HTTP 对象如 `req`、`res` 只允许停留在 router/controller 层。
- ORM、SQL、Redis、文件系统持久化以及第三方 SDK 细节不要进入 controller。
- repository 方法必须明确、强类型，不要在层之间传递松散的字典对象。
- 使用 DTO 文件定义 request、response、command、query 和 view-model 结构。
- 不要为了“看起来分层”而创建没有职责的空文件，每一层都必须有明确责任。
- 当某个通用能力应该属于 `packages/shared-server` 时，不要把它做成业务服务内的新全局工具。

## 共享基础设施优先

在新增或修改后端基础设施前，先检查 `packages/shared-server` 中是否已有可复用能力：

- `createHttpApp`、`createResponseMiddleware`、`createErrorMiddleware`、`createRequestLoggerMiddleware`
- `createWinstonLogger`
- `loadServerConfig`、`getDatabaseConfig`、`loadProfileEnv`
- `SharedRedisService`、`buildRedisUrl`
- `SharedAxiosService`、`formatAxiosLogPayload`
- `BatchProcessor`
- `sanitizeLogValue`

规则：

- 新的可复用基础设施必须优先进入 `packages/shared-server`。
- 应用侧文件应该只是薄适配层，用来注入本地配置、router、鉴权中间件或 logger 实例。
- 不要在每个服务里重复 Express 初始化、logger 初始化、Redis 初始化、Axios 拦截器、响应包络逻辑、错误中间件或配置加载。
- 如果缺少共享原语，就先在 `packages/shared-server` 中补上并写测试，再回接到具体服务。
- 共享原语必须保持业务无关，不能依赖具体应用导入。

## 配置规则

- 通过 `loadServerConfig` 加载类型化配置，通过 `getDatabaseConfig` 解析数据库配置。
- 不要在业务或基础设施代码中直接 `require('../config.json')`。
- 缺失 `config.json` 时，测试环境或非生产工具链不应直接崩溃，而应回退到安全默认值。
- 环境变量可以覆盖部署期配置，尤其是 secrets、数据库地址和 Redis 地址。
- 绝不要提交真实 secrets、token、数据库密码、私钥或生产环境凭据。
- 生产环境的数据库 schema 变更必须可审计、基于 migration；不要在生产环境依赖 TypeORM `synchronize: true`。

## 日志与可观测性规则

- 日志中不得暴露密码、token、cookie、授权头、私钥或完整大体积载荷。
- 记录请求体、响应体、错误响应数据或审计参数前，先使用 `sanitizeLogValue`。
- 大体积日志内容必须截断。
- 请求日志应通过 `createRequestLoggerMiddleware` 生成。
- Winston 初始化应通过 `createWinstonLogger` 完成。
- 返回给客户端的错误信息必须是中文、稳定，并且不能泄露原始堆栈、数据库错误或 SDK 内部细节。
- 在运行时请求路径中避免使用 `console.log`，统一使用共享 logger。

## 性能规则

- 保持请求热路径简短。
- 如果某些审计数据可以批处理，就不要在中间件中同步逐条写入。
- 对操作日志等非关键副作用，优先使用 `BatchProcessor`。
- 避免全表扫描、无界列表接口和超大未分页响应。
- 避免记录完整响应体或超大请求载荷。
- 外部客户端必须配置明确的超时。

## API 与鉴权规则

- 新增后端 API 默认启用 JWT 保护，除非需求明确要求匿名访问。
- 匿名接口必须在 router/controller 设计上显式可见，不能藏在全局白名单里。
- 在服务入口处保持明确的路由前缀，例如 `/site-menu`、`/user`、`/agent`。
- 除非任务明确包含路由迁移，否则保持现有路由命名约定。
- 响应包络必须稳定：`code`、`msg`、`data`、`timestamp`。
- 返回给调用方的成功与失败消息默认使用简体中文。

## 测试规则

- 共享基础设施变更需要在 `packages/shared-server` 中补单元测试。
- service 行为变更需要补单元测试。
- repository 或 API 行为变更，在可行时补集成测试。
- 配置、日志、Redis、Axios 和批处理辅助工具必须覆盖默认值、脱敏、截断和错误路径。
- 涉及基础设施变更后，运行：
  - `pnpm --filter @super-pro/shared-server build`
  - `pnpm --filter @super-pro/shared-server test`
  - 对应服务的构建命令，例如 `pnpm --filter @super-pro/server build`

## 评审清单

- 没有复制本应属于 `packages/shared-server` 的基础设施。
- 没有在 app 配置适配层之外直接访问 `config.json`。
- 日志中没有敏感信息。
- 没有把底层原始错误直接暴露给客户端。
- controller 中没有承载业务逻辑或持久化逻辑。
- 没有跨层传递无类型载荷。
- 没有在生产环境依赖不安全的数据库自动同步。
- 测试覆盖了新的共享原语和被修改的行为。
