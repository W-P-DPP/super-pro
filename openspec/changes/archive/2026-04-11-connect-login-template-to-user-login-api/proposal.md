## Why

当前 `login-template` 仍使用本地 mock 登录/注册逻辑，无法复用 `general-server` 已提供的真实登录接口，也无法产出可落地的 token 持久化与鉴权接入链路。现在需要把登录模板从演示态升级为可对接后端的真实登录入口，为后续受保护页面访问和统一认证打通前置能力。

## What Changes

- 将 `login-template` 的登录流程从本地 `mockLogin` 切换为调用 `POST /api/user/loginUser`
- 在前端新增统一的认证请求层、接口响应解析、错误提示与加载状态处理
- 在登录成功后落地 token、过期信息和当前用户基础资料，并支持“记住当前设备”的持久化策略
- 调整当前登录页交互，使其与现有后端能力对齐；注册 mock 流程不再作为本次交付范围
- 补充登录模板接入真实接口后的联调与验收约束，包括明暗主题一致性、中文文案和失败态反馈

## Capabilities

### New Capabilities
- `login-template-authentication`: 提供登录模板对真实用户登录接口的调用、认证状态持久化和登录态反馈能力

### Modified Capabilities

## Impact

- 影响代码：`login-template/src/pages/LoginPage.tsx`、`login-template/src/lib/*`、`login-template/src/App.tsx` 及可能新增的认证工具模块
- 影响接口：消费 `general-server` 的 `POST /api/user/loginUser`
- 影响运行配置：需要前端可配置的后端接口基础地址与本地存储策略
- 影响联调：需要验证登录成功、账号密码错误、禁用用户、网络异常和重复提交等场景
