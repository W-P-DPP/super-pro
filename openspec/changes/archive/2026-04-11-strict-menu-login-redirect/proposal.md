## Why

当前 `frontend-template` 虽然已经能读取菜单项的 `strict` 字段，但点击卡片时并不会基于该字段执行登录前置校验，导致受限入口和公开入口的跳转行为没有区分。同时，`login-template` 登录成功后也不会消费重定向参数，无法把用户送回原始目标地址。

## What Changes

- 为 `frontend-template` 增加 strict 菜单跳转规则：菜单项 `strict` 为 `true` 时，卡片点击不直接进入目标地址，而是先跳转到登录页。
- 将 strict 菜单的登录页地址抽到 `frontend-template` 环境变量中，默认值使用 `http://www.zwpsite.icu:8082/login`，便于后续替换。
- 规定从工具卡片跳转到登录页时必须附带重定向参数，参数值为被点击卡片原本的目标地址。
- 修改 `login-template`，在登录成功后读取 URL 中的重定向参数，并跳转回该地址；无参数时保持现有登录成功反馈行为。

## Capabilities

### New Capabilities
- `frontend-template-strict-menu-redirect`: 定义 strict 菜单卡片的登录前置跳转、登录页环境变量和重定向参数拼装规则。

### Modified Capabilities
- `login-template-authentication`: 增加登录成功后消费重定向参数并执行目标跳转的要求。

## Impact

- 影响 `frontend-template` 的菜单 DTO、目录归一化逻辑、卡片点击跳转逻辑和环境变量配置。
- 影响 `login-template` 的登录成功后导航逻辑与 URL 参数处理。
- 影响前端联调与手工验证流程，特别是 strict 菜单卡片入口与跨项目登录回跳链路。
