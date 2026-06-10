# 后端权限接入指南

当任务涉及新接口、改接口、管理后台操作、文件上传下载、用户信息读取、列表查询、详情展示、导出导入，或任何会被前端消费的后端能力时，默认读取本文件。除非用户明确要求“不做权限校验”，否则权限接入是必做项。

## 当前项目的后端权限校验链路

当前仓库已经有一套可复用的权限校验主链路：

1. `packages/shared-server/src/authorization.ts`
   - 提供 JWT payload 到 `AuthenticatedIdentity` 的解析
   - 提供 `hasPermission` / `ensurePermission`
   - 支持 `*.*.*` 和分段通配符
2. `general-server/src/index.ts`
   - 在模块入口决定哪些路由先走 `jwtMiddleware`
   - 公开路由必须显式放在鉴权前面
3. `general-server/src/authorization/authorization.middleware.ts`
   - `loadAuthenticatedPrincipal` 把 JWT 身份转换成带角色和权限码的 principal
   - `requirePermission` / `requireAnyPermission` / `requireAllPermissions` 做接口级强校验
4. `general-server/src/authorization/authorization.router.ts`
   - 已经是“JWT + principal + 权限码”的标准示例
5. `general-server/src/siteMenu/siteMenu.router.ts`
   - 展示了“公开接口在前、受保护接口在后”的混合路由结构
6. `packages/shared-types/src/auth.ts`
   - 维护统一权限码常量
7. `general-server/src/authorization/authorization.permissions.ts`
   - 维护种子权限、种子角色和默认分配

## 默认规则

- 新接口默认不是“只要登录就能调”，而是“登录 + 显式权限码”
- 公开匿名接口必须是例外，并且在 router 里显式可见
- 前端菜单显隐不能替代后端接口强校验
- 如果一个前端按钮会触发接口，后端必须有一一对应的权限保护
- 如果本次任务触达已有接口但该接口尚未做权限校验，默认要一并补齐

## 新接口接入步骤

1. 先判断接口是否公开
2. 为接口定义权限语义
   - `appCode`
   - `resourceType`
   - `resourceCode`
   - `action`
3. 在 `@super-pro/shared-types` 增加稳定权限码常量
4. 在种子权限里补齐 `SEEDED_PERMISSIONS`
5. 如有默认角色映射，补齐 `SEEDED_ROLE_PERMISSION_CODES` 或相关角色种子
6. 在 router 层挂载
   - `jwtMiddleware`
   - `loadAuthenticatedPrincipal`
   - `requirePermission(...)` / `requireAnyPermission(...)` / `requireAllPermissions(...)`
7. 再进入 controller / service 业务逻辑

## 路由编排要求

推荐顺序：

```ts
router.get('/public-entry', publicHandler)

router.use(jwtMiddleware)
router.use(loadAuthenticatedPrincipal)

router.get(
  '/items',
  requirePermission(PERMISSION_CODES.itemsRead, '当前用户没有查看列表的接口权限'),
  getItems,
)
```

规则：

- 权限中间件只放在 router 层，不散落到 controller / service
- controller 不负责自己从 JWT 解析权限
- 不要把匿名白名单藏进业务逻辑
- 不要只做 `jwtMiddleware` 而省略 `requirePermission(...)`

## 权限码设计要求

- 如果目标模块已经有对应常量体系，沿用现有命名
- 如果是管理后台菜单、按钮、接口，优先复用 `ADMIN_CONSOLE_PERMISSION_CODES` 风格
- 如果是新领域，至少保证可读、稳定，并能和前端页面/按钮/接口一一映射

## 与前端联动时必须检查的点

如果任务会影响前端页面、菜单、按钮或用户显示：

- 后端是否返回了前端所需的权限快照或项目权限数据
- 后端接口是否真的做了 `403` 强校验
- 前端使用的权限码常量是否已在 shared-types 中统一
- 是否需要补种子权限，避免本地开发时页面全不可用

## 测试要求

涉及权限接入的后端改动，至少验证：

- 未登录请求返回 `401`
- 已登录但无权限返回 `403`
- 有权限请求成功

优先方式：

- 路由集成测试覆盖 401 / 403 / 200
- service 单测只覆盖业务异常，不替代路由鉴权测试

## 代码评审清单

- 这个接口是否被错误地当成公开接口
- 是否只上了 JWT，没上权限码
- 权限码是否进入 shared-types，而不是写死字符串
- router 是否显式挂了 `loadAuthenticatedPrincipal`
- 是否区分了 `401` 和 `403`
- 是否补了最小权限测试
- 是否同步检查了前端消费方
