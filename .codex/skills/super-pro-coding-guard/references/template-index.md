# Template Index

当任务需要快速起手真实编码时，读取本文件，再从 `assets/templates` 复制最接近的模板。

## 使用规则

1. 先读目标目录现有实现，再选模板。
2. 优先复制最接近的模板，不要把多个不相干模板硬拼在一起。
3. 复制后必须替换所有 `__Resource__`、`__resource__`、`__PERMISSION__`、`__ROUTE__` 等占位符。
4. 模板只是起步骨架，落地时仍要遵守本 skill 的前后端动作流、shared 边界和权限规则。

## 前端模板

- `assets/templates/frontend/api-module.template.ts`
  - 适用于 `src/api/modules/*`
  - 对齐当前仓库 `unwrapResponse + request + requiresAuth` 写法
- `assets/templates/frontend/search-toolbar.template.tsx`
  - 适用于管理页搜索区、筛选区、重置和新增按钮区
  - 对齐 `Card + CardContent + Input + ModuleSelect + Button` 结构
- `assets/templates/frontend/table-section.template.tsx`
  - 适用于列表页表格主体、加载态、错误态、空态和分页区
  - 对齐 `Table + Spinner + ListPagination` 结构
- `assets/templates/frontend/permission-usage.template.tsx`
  - 适用于页面准入、按钮显隐、受保护请求错误处理
  - 明确 `401` 与 `403` 的不同处理

## 后端模板

- `assets/templates/backend/module.dto.template.ts`
  - 适用于模块 DTO、参数、列表结果、错误上下文定义
- `assets/templates/backend/module.service.template.ts`
  - 适用于 service 骨架、业务错误、输入归一化、CRUD 主流程
- `assets/templates/backend/module.controller.template.ts`
  - 适用于 controller 层 `sendSuccess / sendFail` 包装
- `assets/templates/backend/module.router.template.ts`
  - 适用于公开接口 + JWT + principal + 权限中间件链路
- `assets/templates/backend/permission-guard.middleware.template.ts`
  - 适用于需要封装模块内权限编排或细化 guard 的场景
- `assets/templates/backend/operation-log.middleware.template.ts`
  - 适用于请求审计、操作日志、脱敏记录等中间件

## 推荐组合

新增前端 CRUD 页：

1. 先用 `api-module.template.ts`
2. 再用 `search-toolbar.template.tsx`
3. 再用 `table-section.template.tsx`
4. 涉及权限时补 `permission-usage.template.tsx`

新增后端 CRUD 模块：

1. 先用 `module.dto.template.ts`
2. 再用 `module.service.template.ts`
3. 再用 `module.controller.template.ts`
4. 再用 `module.router.template.ts`
5. 涉及特殊审计或局部权限封装时，再补对应 middleware 模板
