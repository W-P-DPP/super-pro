## Why

当前后端虽然已经有 `general-server/public` 静态资源目录，但应用启动后并没有对外提供静态资源访问能力，导致这些文件只能存在于仓库中，不能被前端或外部请求直接使用。随着菜单图标等资源已经落到 `public` 目录下，后端需要补上统一的静态资源服务能力。

## What Changes

- 为后端应用新增 `public` 目录静态资源服务能力
- 约定 `general-server/public` 下的文件可通过 HTTP 直接访问，不走业务接口路由
- 保持现有 `/api` 业务接口前缀不变，并避免静态资源请求被 JWT 或业务中间件拦截
- 补充静态资源访问成功与不存在资源返回 404 的测试

## Capabilities

### New Capabilities
- `public-static-assets`: 支持后端直接托管 `general-server/public` 目录下的静态资源文件

### Modified Capabilities

## Impact

- 影响代码：`general-server/app.ts`、`general-server/__tests__/*`
- 影响访问路径：`public` 目录下的文件将通过后端 HTTP 服务直接访问，例如 `/icons/...`、`/1.txt`
- 影响中间件顺序：静态资源服务需要避开 `/api` 路由上的 JWT 和业务中间件
- 影响前端资源加载：前端可直接复用后端托管的静态资源地址
