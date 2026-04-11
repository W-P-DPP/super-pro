# login-template

一个纳入 monorepo 管理的独立登录前端模板，基于 Vite、React 和 Tailwind CSS v4。

## 常用命令

```bash
pnpm --filter @super-pro/login-template dev
pnpm --filter @super-pro/login-template build
pnpm --filter @super-pro/login-template lint
```

## 后端联调

登录页默认调用 `POST /api/user/loginUser`。联调时可通过环境变量指定后端地址：

```bash
VITE_API_BASE_URL=http://127.0.0.1:30010
```

未显式配置时，开发环境会默认使用 `http://127.0.0.1:30010`。
