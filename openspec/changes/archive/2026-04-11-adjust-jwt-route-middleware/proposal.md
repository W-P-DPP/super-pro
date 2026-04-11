## Why

当前 `general-server` 通过 `app.ts` 在 `/api` 层统一挂载 `jwtMiddleware`，再依赖 `jwtMiddleware.ts` 内部白名单放行登录接口。这种设计让鉴权边界分散在全局入口和中间件内部，新增匿名接口时必须继续扩展白名单，既不直观，也和仓库希望在路由接入层明确控制中间件的方式不一致。现在需要把 JWT 从“全局默认启用 + 白名单例外”调整为“按路由显式挂载”，并同步更新后端开发 skill，明确新增接口默认需要 JWT，且默认在 `src/index.ts` 接入。

## What Changes

- 调整后端运行时鉴权策略：移除 `jwtMiddleware` 的白名单职责，不再在 `app.ts` 对 `/api` 全局统一挂载 JWT，而是改为按业务路由或具体接口显式使用 JWT 中间件
- 约束现有匿名接口和受保护接口的表达方式，要求通过路由接入层或业务 router 显式区分，而不是继续依赖中间件内部路径白名单
- 更新 `backend-dev-guard` skill 与相关参考规范，新增“后端新增接口默认需要 JWT，默认在 `src/index.ts` 挂载 JWT；若有匿名接口必须显式说明”的约束
- 补充与 JWT 接入方式调整匹配的单元测试和集成测试，覆盖受保护接口鉴权、匿名接口放行及白名单移除后的行为

## Capabilities

### New Capabilities
- `route-level-jwt-enforcement`: 规范后端 API 的 JWT 使用方式，要求通过路由接入层或显式路由声明控制鉴权，不再依赖中间件白名单
- `backend-dev-auth-defaults`: 规范仓库后端开发约束，要求新增接口默认启用 JWT，并默认在 `src/index.ts` 接入

### Modified Capabilities

## Impact

- 影响代码：`general-server/app.ts`、`general-server/src/index.ts`、`general-server/utils/middleware/jwtMiddleware.ts` 以及可能包含匿名接口的业务 router
- 影响开发规范：`.codex/skills/backend-dev-guard/SKILL.md` 及其 `references/backend-conventions.md`
- 影响测试：JWT 鉴权相关 unit test 和 integration test 需要同步更新
- 影响接口接入方式：后续新增后端接口如无特别说明，应默认按受保护接口处理
