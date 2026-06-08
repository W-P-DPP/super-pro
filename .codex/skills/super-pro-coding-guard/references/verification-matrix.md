# Verification Matrix

在编码完成后读取本文件，选择最小但有效的验证闭环。不要默认整仓全量验证，除非改动面确实跨层很广。

## 前端

目标应用改动时，优先跑对应应用的验证：

```bash
pnpm --filter @super-pro/admin-front build
pnpm --filter @super-pro/front-public build
pnpm --filter @super-pro/login build
```

如果目标应用存在测试脚本，再补最相关测试：

```bash
pnpm --filter @super-pro/admin-front test
pnpm --filter @super-pro/front-public test
pnpm --filter @super-pro/login test
```

手动检查：

- 受影响页面是否可进入
- 菜单、按钮、表单、浮层是否可用
- 桌面端、平板、移动端是否可读可点
- 涉及鉴权时，`401` / `403` 分支是否合理
- 重点确认 `401` 才进入登录态恢复或登录跳转，`403` 只显示无权限结果

## 后端

目标服务改动时，优先跑对应服务验证：

```bash
pnpm --filter @super-pro/server build
pnpm --filter @super-pro/server test:unit
pnpm --filter @super-pro/server test:integration
```

如果只是局部行为调整，至少跑 build 和最相关测试，不强制整套都跑。

涉及权限时，至少确认：

- 未登录返回 `401`
- 已登录无权限返回 `403`
- 有权限请求成功

## Shared 包

shared 改动至少验证自身；若变更影响消费者，再补消费者验证：

```bash
pnpm --filter @super-pro/shared-constants build
pnpm --filter @super-pro/shared-server build
pnpm --filter @super-pro/shared-server test
pnpm --filter @super-pro/shared-types build
pnpm --filter @super-pro/shared-types test
pnpm --filter @super-pro/shared-ui build
pnpm --filter @super-pro/shared-web build
pnpm --filter @super-pro/shared-web test
pnpm typecheck:shared
```

## 跨层或较大改动

仅当改动面较广时再考虑：

```bash
pnpm build
pnpm lint
pnpm test
```

## 最终说明

最终交付时至少交代：

- 跑了哪些命令
- 哪些验证通过了
- 哪些验证未跑以及原因
- 剩余风险落在前端、后端还是 shared
