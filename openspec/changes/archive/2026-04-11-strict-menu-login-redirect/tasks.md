## 1. frontend-template strict 菜单跳转

- [x] 1.1 为 `frontend-template` 增加 strict 登录页地址环境变量与统一跳转 URL 生成工具
- [x] 1.2 在菜单 DTO 与目录归一化逻辑中保留 `strict` 字段，避免卡片点击链路丢失该信息
- [x] 1.3 调整工具卡片点击逻辑，`strict === true` 时跳到登录页并附带 `redirect` 参数，非 strict 保持原有行为

## 2. login-template 登录后回跳

- [x] 2.1 在 `login-template` 中增加 URL 查询参数读取逻辑，识别 `redirect` 参数
- [x] 2.2 调整登录成功流程：保存 token 后优先跳转到 `redirect` 指定地址，无参数时保留现有成功反馈

## 3. 验证与回归

- [x] 3.1 验证 strict 卡片、非 strict 卡片和默认登录地址配置三种前端跳转路径
- [x] 3.2 验证 login 成功后带 `redirect` 与不带 `redirect` 两种场景的行为
