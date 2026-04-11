## 1. 数据模型与契约扩展

- [x] 1.1 扩展 `general-server/src/user/user.entity.ts`，为 `sys_user` 新增 `role` 字段并设置兼容默认值 `guest`
- [x] 1.2 扩展 `general-server/src/user/user.dto.ts`，为用户响应、创建请求、更新请求补齐 `role` 枚举类型定义
- [x] 1.3 扩展 `general-server/src/user/user.repository.ts` 的创建和更新输入类型，使仓储层可读写 `role`

## 2. User CRUD 业务链路调整

- [x] 2.1 在 `general-server/src/user/user.service.ts` 中新增角色枚举规范化与校验逻辑，非法值返回中文业务错误
- [x] 2.2 调整 `createUser` 流程，使未传 `role` 时默认写入 `guest`，显式传值时仅接受 `admin` 或 `guest`
- [x] 2.3 调整 `updateUser`、`getUserList`、`getUserDetail` 的响应映射，确保 CRUD 返回统一包含 `role`

## 3. 接口与兼容性收口

- [x] 3.1 确认 `general-server/src/user/user.controller.ts` 与现有 CRUD 路由继续复用原接口路径，仅更新请求解析和响应断言
- [x] 3.2 检查 `UserResponseDto` 复用点，确保新增 `role` 不会导致敏感字段泄露或破坏现有响应结构约束

## 4. 测试与验证

- [x] 4.1 更新 `general-server/__tests__/unit/user.service.test.ts`，覆盖角色默认值、合法角色写入和非法角色拦截
- [x] 4.2 更新 `general-server/__tests__/integration/api.test.ts` 或相关集成测试，覆盖用户 CRUD 返回 `role` 字段的场景
- [x] 4.3 执行与 `user` 模块相关的单元测试和集成测试，确认角色字段改动符合 spec
