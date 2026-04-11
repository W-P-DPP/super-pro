## Why

当前 `siteMenu` 的数据库实体、DTO 契约、种子数据和 CRUD 接口都没有 `strict` 字段，导致菜单无法持久化这类布尔型配置，也无法通过现有接口查询、创建或更新该字段。现在需要把 `strict` 作为 `siteMenu` 的正式数据字段纳入后端分层模型，避免后续前后端各自维护临时字段。

## What Changes

- 为 `siteMenu` 数据模型新增 `strict` 布尔字段，并同步到实体、DTO、仓储读写和接口响应
- 调整 `siteMenu` 查询、创建、更新接口，使 `strict` 能被完整返回、创建和修改
- 调整 `siteMenu.json` 种子结构和菜单文件导入校验逻辑，使导入链路支持 `strict`
- 为 `siteMenu` 模块补充与 `strict` 字段相关的单元测试和集成测试，覆盖成功与失败路径
- 保持现有 `siteMenu` 六层结构、动作式路由和中文响应约定不变

## Capabilities

### New Capabilities
- `site-menu-strict-field`: 提供 `siteMenu` 模块的 `strict` 布尔字段建模、CRUD 契约扩展和导入兼容能力

### Modified Capabilities

## Impact

- 影响代码：`general-server/src/siteMenu/*`、`general-server/siteMenu.json`、相关测试文件
- 影响数据结构：`sys_site_menu` 需要新增 `strict` 布尔字段
- 影响接口：`/api/site-menu/getMenu`、`/api/site-menu/getMenu/:id`、`/api/site-menu/createMenu`、`/api/site-menu/updateMenu/:id`、`/api/site-menu/uploadMenuFile`
- 影响测试：需要补充 `siteMenu` service 单测和 API 集成测试中的 `strict` 字段断言
