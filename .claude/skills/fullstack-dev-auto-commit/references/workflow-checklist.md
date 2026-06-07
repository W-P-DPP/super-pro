# 全栈工作流检查清单

## 常见读取目标

前端阶段优先读取：

- `design.md`
- `<target-front>/src/theme.css`
- `<target-front>/theme.css`
- `<target-front>/src/api/modules/*`
- `<target-front>/src/lib/auth-session.ts`
- `<target-front>/src/lib/login-redirect.ts`
- `packages/shared-types/*`
- `packages/shared-web/*`

后端阶段优先读取：

- `<target-server>/src/app.ts`
- `<target-server>/src/main.ts`
- `<target-server>/src/router/*`
- `<target-server>/src/controller/*`
- `<target-server>/src/service/*`
- `<target-server>/src/repository/*`
- `<target-server>/src/dto/*`
- `packages/shared-server/*`

## 常见验证命令

按最小有效原则选用：

```bash
pnpm lint
pnpm build
pnpm test
pnpm --filter <package-name> build
pnpm --filter <package-name> test
pnpm --filter <package-name> dev
```

如果是仓库根脚本已定义的目标，也可以优先使用：

```bash
pnpm dev:agent-front
pnpm dev:summary-front
pnpm dev:resume-template
pnpm dev:agent-server
pnpm dev:reimburse-front
pnpm dev:reimburse-server
pnpm dev:frontend
pnpm dev:login-template
pnpm dev:server
pnpm build:agent-front
pnpm build:agent-server
pnpm build:summary-front
pnpm build:resume-template
pnpm build:reimburse-front
pnpm build:reimburse-server
pnpm test:agent-server
pnpm test:reimburse-server
pnpm test:shared
pnpm typecheck:shared
```

## 自动提交前检查

- `git status --short`
- `git diff --stat`
- `git diff`
- `git diff --staged --stat`
- `git diff --staged`

## 提交执行建议

优先使用显式路径暂存：

```bash
git add path/to/file-a path/to/file-b
```

生成提交信息后使用：

```bash
git commit -m "type(scope): subject"
```

如果存在破坏性变更，使用多行提交：

```bash
git commit -m "feat(scope)!: subject" -m "BREAKING CHANGE: detail"
```
