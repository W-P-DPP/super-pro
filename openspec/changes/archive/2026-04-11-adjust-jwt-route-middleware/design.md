## Context

当前后端把 `jwtMiddleware` 统一挂在 `app.ts` 的 `/api` 前缀上，再通过 `jwtMiddleware.ts` 内部维护白名单来放行 `POST /api/user/loginUser`。这种模式有两个直接问题：

- 鉴权边界不在路由接入层，而是散落在全局入口和中间件内部，新增匿名接口时必须继续修改白名单
- 仓库对业务 router 的接入点是 `general-server/src/index.ts`，但当前 JWT 的默认挂载位置不在那里，和后端 skill 希望的“在路由层明确中间件职责”不一致

此外，用户这次不仅要求调整运行时逻辑，还要求同步修改 `.codex/skills/backend-dev-guard/SKILL.md` 及其参考规范，把“新增接口默认需要 JWT，默认在 `src/index.ts` 添加 JWT”固化为仓库规则。因此这次变更同时覆盖运行时行为和开发规范。

## Goals / Non-Goals

**Goals:**

- 移除 `jwtMiddleware` 对白名单路径的依赖，使其只保留 token 校验职责
- 将 JWT 的默认使用方式调整为按业务路由或具体接口显式挂载，而不是在 `app.ts` 对 `/api` 全局统一启用
- 保持现有匿名登录接口仍然可用，但其匿名性必须通过显式路由设计表达，而不是依赖白名单
- 更新 `backend-dev-guard` skill 和 `backend-conventions.md`，新增“接口默认需要 JWT，默认在 `src/index.ts` 挂载”的约束
- 补充与新鉴权方式匹配的测试

**Non-Goals:**

- 不更换 JWT 技术栈，不引入新的认证协议或会话机制
- 不重构所有业务模块的职责边界，只收敛当前和 JWT 接入有关的区域
- 不新增权限系统、角色授权模型或接口级 RBAC

## Decisions

### 决策 1：`jwtMiddleware` 只负责 token 校验，不再承担白名单放行职责

实现后 `jwtMiddleware` 的职责应收敛为：

- 当 `JWT_ENABLED !== 'true'` 时直接放行
- 当启用 JWT 时，仅校验当前请求头中的 `Authorization: Bearer <token>`
- 缺失或无效 token 时返回统一中文错误

它不再内置任何“某路径可匿名”的知识。

这样做的原因：

- 中间件职责单一，避免安全策略隐藏在工具层内部
- 新增匿名接口时不需要继续膨胀白名单
- 更符合后端 skill 中“在路由层挂载中间件，不在底层做路径分支”的要求

备选方案：

- 保留全局 JWT 并继续扩展白名单：改动最小，但会继续扩大隐式鉴权例外，长期维护成本更高

### 决策 2：默认在 `src/index.ts` 挂载业务级 JWT，中间件应用点从 `app.ts` 下沉到路由接入层

`app.ts` 不再对 `/api` 全局挂 `jwtMiddleware`，只保留响应、日志、静态资源等通用中间件；JWT 的默认接入位置改为 `general-server/src/index.ts` 的业务 router 挂载点，例如：

- 整个业务域默认受保护时，在 `src/index.ts` 用 `router.use('/xxx', jwtMiddleware, xxxRouter)`
- 若业务域存在匿名接口和受保护接口混合，则该业务域作为明确例外，在业务 router 内通过声明顺序或逐路由中间件区分匿名接口和受保护接口

这样做的原因：

- 业务入口层更直观地表达“哪个业务域默认需要鉴权”
- 与用户要求“默认在 `src/index.ts` 添加 JWT”一致
- 让匿名接口成为显式例外，而不是全局默认后的隐式豁免

备选方案：

- 继续在 `app.ts` 统一挂载 JWT：无法满足按需使用中间件的目标

### 决策 3：混合鉴权业务域允许在单个业务 router 内显式区分匿名接口，但禁止再走白名单

仓库约束要求一个业务域默认只保留一个 router 实例，因此对于像 `user` 这样同时有匿名登录接口和受保护 CRUD 的模块，不拆出第二个业务 router，而是在同一个 `user.router.ts` 中显式表达：

- 先声明匿名接口，例如 `POST /loginUser`
- 再通过 `userRouter.use(jwtMiddleware)` 或逐路由挂载方式保护后续 CRUD 路由

这样做的原因：

- 继续遵守“一业务域一个 router”的硬约束
- 保持匿名接口是否放行在业务 router 中一眼可见
- 不需要再依赖 `jwtMiddleware` 中的白名单

备选方案：

- 将 `user` 拆成多个业务 router：会破坏当前仓库的 router 组织约定

### 决策 4：后端开发 skill 把“默认鉴权”收敛成显式规则，并要求匿名接口必须特别说明

`.codex/skills/backend-dev-guard/SKILL.md` 和 `references/backend-conventions.md` 需要同步新增规则：

- 新增后端接口如无特别说明，默认需要 JWT
- 默认在 `general-server/src/index.ts` 挂载业务 router 时接入 `jwtMiddleware`
- 若存在匿名接口，必须在需求、设计或实现说明中显式标注，并在 router 层清晰表达例外
- 禁止再通过 `jwtMiddleware` 内部白名单放行匿名接口

这样做的原因：

- 把本次架构调整沉淀成稳定仓库规则，避免后续新增接口回退到旧模式
- 让默认安全策略前置到开发阶段，而不是实现完成后补救

## Risks / Trade-offs

- [风险] 把 JWT 从 `app.ts` 下沉到路由层后，如果某个已有业务域漏挂中间件，可能导致接口意外公开
  Mitigation：实现阶段逐个核对 `src/index.ts` 里的业务挂载，并用集成测试验证受保护接口在缺失 token 时返回 401

- [风险] `user` 模块同时包含匿名和受保护接口，若在单个 router 中处理不当，可能造成登录被误拦截或 CRUD 被漏保护
  Mitigation：在 `user.router.ts` 中显式按顺序声明匿名接口与受保护接口，并补充对应集成测试

- [风险] skill 规则更新后，旧变更提案或旧实现习惯仍可能沿用“全局 JWT + 白名单”思路
  Mitigation：在 skill 和参考规范中明确禁止白名单方案，并在后续实现评审中按新规则收敛

## Migration Plan

1. 调整 `app.ts`，移除 `/api` 层的全局 JWT 挂载
2. 调整 `src/index.ts` 和必要的业务 router，把 JWT 改为显式路由接入
3. 精简 `jwtMiddleware.ts`，移除白名单逻辑，仅保留 token 校验职责
4. 更新 `backend-dev-guard` skill 与 `backend-conventions.md`
5. 补充并执行相关 unit test / integration test

回滚策略：

- 回滚 `app.ts`、`src/index.ts`、相关业务 router 与 `jwtMiddleware.ts`
- 回滚 skill 文档中的默认鉴权规则
- 恢复当前“全局 JWT + 白名单”模式

## Open Questions

- 当前 `operationLogMiddleware` 是否继续保留在 `/api` 全局层；从现状看它与鉴权边界无直接冲突，默认可继续保留
