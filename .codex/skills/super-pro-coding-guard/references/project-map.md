# Project Map

在 `super-pro-coding-guard` 触发后，先读取本文件，用它确定改动落点、共享边界和验证入口。

## 工作区地图

`pnpm-workspace.yaml` 当前声明的主要目录包括：

- 前端应用：`*-front`
- 后端服务：`*-server`
- shared 包：`packages/**`

如果某个目录当前工作区中不存在，先按实际存在的目录执行，不要假设所有声明项都已检出。

## 默认读取顺序

1. 先看目标目录的现有实现。
2. 再看它依赖的 shared 包。
3. 前端任务额外读取 `design.md`。
4. 前端若存在主题文件，优先读取目标应用自己的主题源；当前已观察到 `admin-front/src/theme.css`。
5. 如果任务涉及构建、测试或工作区约束，再读取根目录 `package.json`、`turbo.json`。

## Shared 边界

优先复用的公共能力：

- `packages/shared-ui`：基础 UI 组件、常用 hooks、界面语义
- `packages/shared-web`：请求、会话、鉴权消费侧能力
- `packages/shared-types`：DTO、权限码、契约类型
- `packages/shared-server`：服务端 HTTP、运行时、日志、鉴权、异常、基础设施
- `packages/shared-constants`：常量和跨端稳定值

规则：

- 业务应用先消费 shared 包，不要在本地平行复制。
- shared 改动默认视为跨层改动，要同步确认直接消费者。
- 变更 export 时，记得同步检查 `src/index.ts` 或包级导出入口。

## 目录识别提示

前端改动常见落点：

- `src/pages/*`
- `src/components/*`
- `src/routes/*`
- `src/api/modules/*`
- `src/contexts/*`
- `src/hooks/*`
- `src/theme.css` 或其他样式入口

后端改动常见落点：

- `src/**/*.router.ts`
- `src/**/*.controller.ts`
- `src/**/*.service.ts`
- `src/**/*.repository.ts`
- `src/**/*.dto.ts`
- `src/**/*.entity.ts`
- `main.ts`、`app.ts`、运行时与中间件入口

## 跨层改动识别

以下场景默认按跨层处理：

- 新增或修改接口契约
- 新增或修改权限码
- 新增或修改共享 DTO、常量、错误码
- 前端页面与后端接口需要一起联动
- 删除 shared 导出或删除被多个应用消费的能力
