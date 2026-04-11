## Why

当前登录链路仍然在登录成功时返回完整用户信息，前端也没有把令牌持久化到本地，导致登录态恢复能力不足，并让登录接口返回了超出最小需求的数据。同时，登录密码仍以明文 JSON 提交，缺少额外的应用层加密约束，不满足本次对登录安全链路收紧的要求。

## What Changes

- **BREAKING** 调整后端登录接口响应，只返回 `token`、`tokenType` 和 `expiresIn`，不再返回用户信息。
- 调整前端登录成功后的鉴权处理，在本地持久化保存 token，并基于持久化 token 维护后续请求的认证状态。
- **BREAKING** 为登录链路增加密码加密传输能力：前端提交加密后的密码密文，后端先解密，再与现有密码哈希进行校验。
- 明确登录相关匿名接口边界，保持其通过显式路由设计匿名可访问，而不是回退到 JWT 白名单机制。

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `user-login-authentication`: 调整登录接口响应契约，并增加登录密码加密传输与服务端解密校验要求。
- `login-template-authentication`: 调整登录页登录成功后的本地 token 持久化行为，并改为提交加密后的登录密码。

## Impact

- 影响后端 `general-server` 的登录 DTO、登录服务逻辑、登录相关匿名路由设计，以及可能新增的登录公钥提供能力。
- 影响前端 `login-template` 的登录请求封装、token 本地缓存策略和登录页提交流程。
- 影响前后端登录接口契约、联调方式和相关测试用例。
