## 1. JWT 运行时接入方式调整

- [x] 1.1 调整 `general-server/app.ts`，移除 `/api` 层的全局 `jwtMiddleware` 挂载，仅保留通用中间件与路由入口
- [x] 1.2 调整 `general-server/src/index.ts` 与必要的业务 router，将 JWT 改为显式按业务域或具体接口挂载
- [x] 1.3 调整 `general-server/utils/middleware/jwtMiddleware.ts`，移除白名单逻辑，只保留 JWT 校验职责

## 2. 后端开发规范收敛

- [x] 2.1 更新 `.codex/skills/backend-dev-guard/SKILL.md`，新增“后端新增接口默认需要 JWT，默认在 `src/index.ts` 挂载 JWT”的规则
- [x] 2.2 更新 `.codex/skills/backend-dev-guard/references/backend-conventions.md`，同步补充匿名接口必须显式说明、禁止再用 JWT 白名单放行的约束

## 3. 测试与验证

- [x] 3.1 更新与 JWT 相关的单元测试，覆盖白名单移除后的中间件行为
- [x] 3.2 更新集成测试，覆盖受保护接口鉴权、匿名接口放行和显式路由挂载后的行为
- [x] 3.3 执行后端相关单元测试与集成测试，确认新的 JWT 接入策略和 skill 约束对应实现可用
