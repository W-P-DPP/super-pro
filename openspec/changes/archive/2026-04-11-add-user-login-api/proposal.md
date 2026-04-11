## Why

当前 `general-server` 的 `user` 模块只提供用户 CRUD，尚未提供基于用户凭证的登录入口，导致现有 JWT 能力只能在测试或内部代码中直接生成 token，无法通过标准业务接口完成认证。现在需要补齐 `user` 域的登录接口，为后续前端登录、受保护接口访问和认证链路落地提供统一入口。

## What Changes

- 在 `user` 业务模块内新增登录接口，路径遵循现有动作式命名约定，提供 `POST /api/user/loginUser`
- 为登录流程补充专用 DTO、Service 校验逻辑和 Repository 查询能力，保持 `entity/controller/dto/repository/router/service` 六层职责清晰
- 复用现有 JWT 生成能力，在登录成功后返回用户基础信息与 token，并保持中文响应文案
- 为登录失败场景补充受控错误返回，包括参数错误、凭证错误、用户状态不可登录等情况
- 补充 `user` 登录相关单元测试与集成测试，覆盖成功和失败路径

## Capabilities

### New Capabilities
- `user-login-authentication`: 提供 `user` 模块的登录认证接口、凭证校验与 token 签发能力

### Modified Capabilities

## Impact

- 影响代码：`general-server/src/user/*`、`general-server/utils/middleware/jwtMiddleware.ts`、`general-server/app.ts`、相关测试文件
- 影响接口：新增 `POST /api/user/loginUser`
- 影响认证链路：调用方可通过业务接口获取 JWT，而不再只依赖内部 `generateToken`
- 影响测试：需要新增 `user` 登录的 unit test 和 integration test
