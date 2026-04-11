## Why

当前 `general-server` 的 `user` 模块虽然已经提供用户 CRUD，但 `sys_user` 缺少正式的角色字段，导致系统无法在用户模型和接口契约中稳定表达“管理员 / 访客”这一基础身份信息。现在需要把角色作为受控枚举纳入 `user` 领域模型，并同步约束 CRUD 接口输入输出，避免前后端各自维护临时字段或使用不受控字符串。

## What Changes

- 为 `user` 数据模型新增 `role` 字段，并使用受控枚举表示用户角色，仅允许 `admin` 和 `guest`
- 扩展 `user` 模块的实体、DTO、仓储、服务、控制器和路由契约，使创建、更新、列表查询、详情查询都能正确读写和返回角色字段
- 为角色字段补充统一校验和中文错误响应，禁止写入未定义枚举值
- 调整与 `user` CRUD 相关的单元测试和集成测试，覆盖角色字段的成功路径与非法输入场景

## Capabilities

### New Capabilities
- `user-management`: 提供 `user` 模块的用户 CRUD 契约与角色枚举能力，包含角色字段建模、校验和接口返回约束

### Modified Capabilities

## Impact

- 影响代码：`general-server/src/user/*` 及相关测试文件
- 影响数据结构：`sys_user` 需要新增 `role` 字段，并为现有数据定义兼容默认值
- 影响接口：`/api/user/getUser`、`/api/user/getUser/:id`、`/api/user/createUser`、`/api/user/updateUser/:id` 的请求或响应契约将包含 `role`
- 影响校验：用户创建和更新时需要校验角色枚举值，避免无效角色进入数据层
