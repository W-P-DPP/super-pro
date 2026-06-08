# Backend Delivery Flow

当任务涉及服务端接口、路由、controller、service、repository、dto、entity、数据库、Redis、日志、运行时、权限、文件上传下载、导入导出、后端重构、后端删除或后端 bug 修复时，读取本文件。

## 开始前必须确认

1. 目标服务的现有实现和入口文件
2. 目标模块的 router、controller、service、repository、dto、entity 分层
3. 目标服务是否已接入 shared runtime、日志、异常和鉴权能力
4. 与本次改动相关的 shared 包：
   - `@super-pro/shared-server`
   - `@super-pro/shared-types`
   - `@super-pro/shared-constants`

## 默认分层

优先遵循：

```text
router -> controller -> service -> repository -> entity
```

规则：

- `req` / `res` 只留在 router / controller
- service 不依赖 Express
- repository 屏蔽 ORM / SQL 细节
- request / response / query / command / view-model 要有明确 DTO

## 实现顺序

1. 先确认本次是 HTTP 契约变更、业务逻辑变更、持久化变更、运行时变更还是权限变更。
2. 先复用 shared primitive，再补本地适配。
3. 先补 DTO、权限和路由编排，再写业务实现。
4. 行为改变时，同步补最相关测试。
5. 如果是新增标准 CRUD 模块，先看 `references/template-index.md`，优先从 `assets/templates/backend` 复制 DTO、service、controller、router 和 middleware 模板。

## Shared Server 优先

后端基础能力优先检查是否已有可复用实现，例如：

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

## 权限边界

除非用户明确说明不需要权限校验，否则新增或修改接口时默认做权限校验。

规则：

- 只做 JWT 不够，默认还需要显式权限中间件
- 公开匿名接口必须是例外，并且在 router 编排里显式可见
- 新权限码优先进入 `@super-pro/shared-types`
- 前端页面、菜单、按钮对应的后端动作要有一一对应的接口级保护

推荐顺序：

1. 定义权限边界
2. 补权限码常量和种子
3. 在 router 层挂鉴权和权限中间件
4. 再进入 controller / service 逻辑

## 运行时与安全

- `.env.*` 先于 runtime、logger、reporter 初始化
- 健康检查、优雅退出、异常上报优先走 shared runtime
- 默认统一响应结构：`code` / `msg` / `data` / `timestamp`
- 默认中文错误消息
- 不泄露 stack、SQL 错误、SDK 内部细节
- 不记录密码、token、cookie、授权头、私钥和大 payload

## 删除清单

删除后端能力时，同步检查并移除直接相关项：

- 路由注册
- controller / service / repository / dto / entity
- 权限码、种子数据、鉴权编排
- 测试、mock、脚本和调用入口
- 依赖该接口的上游或前端消费者

## 最小验证

- 跑目标服务最相关的 build
- 行为改动补最相关单测或集成测试
- 涉及权限时，至少验证 `401`、`403` 和成功路径
