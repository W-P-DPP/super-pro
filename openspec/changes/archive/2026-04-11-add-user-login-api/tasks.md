## 1. 数据模型与契约准备

- [x] 1.1 扩展 `general-server/src/user/user.entity.ts`，为 `sys_user` 增加密码哈希字段并保持继承 `BaseEntity`
- [x] 1.2 扩展 `general-server/src/user/user.dto.ts`，新增登录请求 DTO、登录响应 DTO 和必要的错误上下文类型
- [x] 1.3 调整测试种子与集成测试用户数据，补齐可用于登录的固定测试密码或对应哈希值

## 2. User 登录链路实现

- [x] 2.1 扩展 `general-server/src/user/user.repository.ts`，提供登录所需的按用户名查询与密码字段读取能力
- [x] 2.2 扩展 `general-server/src/user/user.service.ts`，实现用户名密码校验、停用状态拦截、密码哈希比对和 JWT 签发
- [x] 2.3 扩展 `general-server/src/user/user.controller.ts` 与 `general-server/src/user/user.router.ts`，新增 `POST /api/user/loginUser` 接口并保持中文响应

## 3. 鉴权放行与安全收口

- [x] 3.1 调整 `general-server/utils/middleware/jwtMiddleware.ts` 或 `/api` 挂载策略，仅对白名单 `POST /api/user/loginUser` 放行匿名访问
- [x] 3.2 确认用户查询与登录响应均不暴露密码哈希等敏感字段，避免跨层泄露

## 4. 测试与验证

- [x] 4.1 为 `general-server/__tests__/unit/user.service.test.ts` 补充登录成功、凭证错误、停用用户等单元测试
- [x] 4.2 为 `general-server/__tests__/integration/api.test.ts` 补充 `POST /api/user/loginUser` 成功和失败场景，以及 JWT 开启下登录接口免 token 的集成测试
- [x] 4.3 执行与登录改动相关的单元测试和集成测试，确认响应契约与鉴权行为符合 spec
