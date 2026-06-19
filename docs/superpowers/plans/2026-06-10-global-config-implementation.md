# 全局配置实现计划

> **面向 AI 代理的工作说明：** 优先使用 `superpowers:executing-plans` 在当前会话内按任务顺序实现；如需拆分并行，可改用 `superpowers:subagent-driven-development`。步骤使用复选框（`- [ ]`）跟踪进度。

**目标：** 为 BMS 系统管理新增“全局配置”二级菜单，并提供按项目维度管理文本、数字、布尔三种类型配置项的完整前后端 CRUD。

**架构：** 复用现有 `project`、`authorization`、`admin-menu`、`PermissionsPage` 的实现模式。后端新增独立 `globalConfig` 领域模块，前端采用“左侧项目列表 + 右侧当前项目配置表格”的双栏页，权限码、菜单种子和类型契约统一收口到 shared 层。

**技术栈：** TypeScript、Express、TypeORM、Vitest、Jest、React 19、Vite、shared-types、shared-ui、shared-server。

---

### 任务 1：补齐共享契约、权限码与后台菜单元数据

**文件：**
- 修改：`packages/shared-types/src/auth.ts`
- 修改：`packages/shared-types/src/index.ts`
- 新增：`packages/shared-types/src/global-config.ts`
- 新增测试：`packages/shared-types/src/global-config.test.ts`
- 修改：`general-server/src/authorization/authorization.permissions.ts`
- 修改：`general-server/src/adminMenu/adminMenu.seed.ts`
- 修改：`admin-front/src/data/admin-navigation.ts`

- [ ] **步骤 1：编写 shared-types 失败测试**

```ts
import { describe, expect, it } from 'vitest'
import {
  ADMIN_CONSOLE_PERMISSION_CODES,
  GLOBAL_CONFIG_TYPES,
  isGlobalConfigType,
} from './index'

describe('global-config shared contracts', () => {
  it('exports stable global config type options', () => {
    expect(GLOBAL_CONFIG_TYPES).toEqual(['text', 'number', 'boolean'])
    expect(isGlobalConfigType('boolean')).toBe(true)
    expect(isGlobalConfigType('json')).toBe(false)
  })

  it('exports admin console permission codes for global config module', () => {
    expect(ADMIN_CONSOLE_PERMISSION_CODES.globalConfigMenuView).toBe(
      'admin-console.menu.global-config.view',
    )
    expect(ADMIN_CONSOLE_PERMISSION_CODES.globalConfigApiDelete).toBe(
      'admin-console.api.global-config.delete',
    )
  })
})
```

- [ ] **步骤 2：运行 shared-types 测试并确认失败**

运行：`pnpm --filter @super-pro/shared-types test -- global-config.test.ts`

预期：失败，提示 `GLOBAL_CONFIG_TYPES`、`isGlobalConfigType`、`globalConfigMenuView` 等导出不存在。

- [ ] **步骤 3：实现 shared 契约与权限常量**

```ts
export const GLOBAL_CONFIG_TYPES = ['text', 'number', 'boolean'] as const
export type GlobalConfigType = (typeof GLOBAL_CONFIG_TYPES)[number]

export function isGlobalConfigType(value: string): value is GlobalConfigType {
  return GLOBAL_CONFIG_TYPES.includes(value as GlobalConfigType)
}

export const ADMIN_CONSOLE_PERMISSION_CODES = {
  // existing...
  globalConfigMenuView: 'admin-console.menu.global-config.view',
  globalConfigCreate: 'admin-console.button.global-config.create',
  globalConfigUpdate: 'admin-console.button.global-config.update',
  globalConfigDelete: 'admin-console.button.global-config.delete',
  globalConfigApiRead: 'admin-console.api.global-config.read',
  globalConfigApiCreate: 'admin-console.api.global-config.create',
  globalConfigApiUpdate: 'admin-console.api.global-config.update',
  globalConfigApiDelete: 'admin-console.api.global-config.delete',
} as const
```

- [ ] **步骤 4：同步权限种子与菜单元数据**

```ts
{
  code: ADMIN_CONSOLE_PERMISSION_CODES.globalConfigMenuView,
  appCode: ADMIN_CONSOLE_APP_CODE,
  resourceType: 'menu',
  resourceCode: 'global-config',
  action: 'view',
  name: '全局配置可见',
  description: '允许查看管理后台全局配置页面。',
}
```

```ts
{
  name: '全局配置',
  shortTitle: '配置',
  slug: 'global-config',
  iconKey: 'settings-2',
  menuType: 'item',
  description: '按项目维度维护全局配置项，支持文本、数字和布尔类型。',
  permissionCode: ADMIN_CONSOLE_PERMISSION_CODES.globalConfigMenuView,
}
```

- [ ] **步骤 5：重新运行 shared-types 测试与构建**

运行：
- `pnpm --filter @super-pro/shared-types test -- global-config.test.ts`
- `pnpm --filter @super-pro/shared-types build`

预期：测试通过，类型检查通过。

- [ ] **步骤 6：提交任务 1**

```bash
git add packages/shared-types/src/auth.ts packages/shared-types/src/index.ts packages/shared-types/src/global-config.ts packages/shared-types/src/global-config.test.ts general-server/src/authorization/authorization.permissions.ts general-server/src/adminMenu/adminMenu.seed.ts admin-front/src/data/admin-navigation.ts
git commit -m "feat: add global config shared contracts and permissions (task 1/4)"
```

### 任务 2：实现后端 global-config 领域模块与服务层校验

**文件：**
- 创建：`general-server/src/globalConfig/global-config.dto.ts`
- 创建：`general-server/src/globalConfig/global-config.entity.ts`
- 创建：`general-server/src/globalConfig/global-config.repository.ts`
- 创建：`general-server/src/globalConfig/global-config.service.ts`
- 创建：`general-server/src/globalConfig/global-config.controller.ts`
- 创建：`general-server/src/globalConfig/global-config.router.ts`
- 修改：`general-server/src/index.ts`
- 新增测试：`general-server/__tests__/unit/global-config.service.test.ts`
- 新增测试：`general-server/__tests__/unit/global-config.repository.test.ts`

- [ ] **步骤 1：编写服务层失败测试**

```ts
it('rejects duplicate configKey within the same project', async () => {
  await expect(
    service.createGlobalConfig({
      projectId: 1,
      configKey: 'site.title',
      configName: '站点标题',
      configType: 'text',
      configValue: '新标题',
      status: 1,
    }),
  ).rejects.toMatchObject({
    statusCode: 409,
    context: expect.objectContaining({ field: 'configKey' }),
  })
})

it('rejects invalid boolean config values', async () => {
  await expect(
    service.createGlobalConfig({
      projectId: 1,
      configKey: 'feature.enabled',
      configName: '功能开关',
      configType: 'boolean',
      configValue: 'yes',
      status: 1,
    }),
  ).rejects.toMatchObject({
    statusCode: 400,
    context: expect.objectContaining({ field: 'configValue' }),
  })
})
```

- [ ] **步骤 2：运行后端单测并确认失败**

运行：`pnpm --filter @super-pro/server test:unit -- global-config.service.test.ts`

预期：失败，提示 `GlobalConfigService`、DTO 类型或校验逻辑不存在。

- [ ] **步骤 3：实现 DTO、实体、仓储和服务**

```ts
export interface CreateGlobalConfigRequestDto {
  projectId: number
  configKey: string
  configName: string
  configType: GlobalConfigType
  configValue: string | number | boolean
  status: number
  remark?: string
}

export class GlobalConfigEntity extends BaseEntity {
  id!: number
  projectId!: number
  configKey!: string
  configName!: string
  configType!: GlobalConfigType
  configValue!: string
  status!: number
}
```

```ts
function normalizeConfigValue(type: GlobalConfigType, value: unknown): string {
  if (type === 'text') return ensureStringValue(value)
  if (type === 'number') return ensureNumberValue(value)
  return ensureBooleanValue(value)
}
```

- [ ] **步骤 4：挂载受保护路由与权限**

```ts
router.use('/global-config', jwtMiddleware, globalConfigRouter)
```

```ts
globalConfigRouter.use(loadAuthenticatedPrincipal)
globalConfigRouter.get(
  '/getGlobalConfig',
  requirePermission(
    ADMIN_CONSOLE_PERMISSION_CODES.globalConfigApiRead,
    '当前用户没有查看全局配置的接口权限',
  ),
  getGlobalConfig,
)
```

- [ ] **步骤 5：运行后端单测与最小类型验证**

运行：
- `pnpm --filter @super-pro/server test:unit -- global-config.service.test.ts`
- `pnpm --filter @super-pro/server test:unit -- global-config.repository.test.ts`

预期：新模块单测通过。

- [ ] **步骤 6：提交任务 2**

```bash
git add general-server/src/globalConfig general-server/src/index.ts general-server/__tests__/unit/global-config.service.test.ts general-server/__tests__/unit/global-config.repository.test.ts
git commit -m "feat: add global config backend module (task 2/4)"
```

### 任务 3：补齐后端权限链路验证与前端 API/辅助函数

**文件：**
- 新增测试：`general-server/__tests__/integration/global-config.permission.api.test.ts`
- 创建：`admin-front/src/api/modules/global-config.ts`
- 新增测试：`admin-front/src/api/modules/global-config.test.ts`
- 创建：`admin-front/src/pages/admin/global-config-page-helpers.ts`
- 新增测试：`admin-front/src/pages/admin/global-config-page-helpers.test.ts`

- [ ] **步骤 1：编写失败测试，覆盖后端 401/403/200 与前端参数归一化**

```ts
it('returns 403 when authenticated user misses global config read permission', async () => {
  const response = await request(app)
    .get('/api/global-config/getGlobalConfig?projectId=1')
    .set('Authorization', `Bearer ${viewerToken}`)

  expect(response.status).toBe(403)
})
```

```ts
it('normalizes global config list query by trimming keyword and dropping empty filters', () => {
  expect(
    normalizeGlobalConfigListQuery({
      keyword: '  site  ',
      status: '',
      projectId: 12,
      page: 2,
      pageSize: 20,
    }),
  ).toEqual({
    keyword: 'site',
    projectId: 12,
    page: 2,
    pageSize: 20,
  })
})
```

- [ ] **步骤 2：运行相关测试并确认失败**

运行：
- `pnpm --filter @super-pro/server test:integration -- global-config.permission.api.test.ts`
- `pnpm --filter @super-pro/admin-front test -- global-config.test.ts`

预期：失败，提示路由测试文件/API helper 缺失。

- [ ] **步骤 3：实现前端 API 与辅助函数**

```ts
export function normalizeGlobalConfigListQuery(query: GlobalConfigListQueryDto) {
  return {
    ...(query.keyword?.trim() ? { keyword: query.keyword.trim() } : {}),
    ...(typeof query.projectId === 'number' ? { projectId: query.projectId } : {}),
    ...(query.status === 0 || query.status === 1 ? { status: query.status } : {}),
    page: query.page ?? 1,
    pageSize: query.pageSize ?? 10,
  }
}
```

```ts
export function normalizeConfigValueByType(
  type: GlobalConfigType,
  rawValue: string,
): string | number | boolean
```

- [ ] **步骤 4：补齐后端权限链路使 401/403/200 可测**

```ts
globalConfigRouter.post(
  '/createGlobalConfig',
  requirePermission(
    ADMIN_CONSOLE_PERMISSION_CODES.globalConfigApiCreate,
    '当前用户没有新增全局配置的接口权限',
  ),
  createGlobalConfig,
)
```

- [ ] **步骤 5：运行前后端相关测试**

运行：
- `pnpm --filter @super-pro/server test:integration -- global-config.permission.api.test.ts`
- `pnpm --filter @super-pro/admin-front test -- src/api/modules/global-config.test.ts src/pages/admin/global-config-page-helpers.test.ts`

预期：权限链路与 helper/API 测试通过。

- [ ] **步骤 6：提交任务 3**

```bash
git add general-server/__tests__/integration/global-config.permission.api.test.ts admin-front/src/api/modules/global-config.ts admin-front/src/api/modules/global-config.test.ts admin-front/src/pages/admin/global-config-page-helpers.ts admin-front/src/pages/admin/global-config-page-helpers.test.ts
git commit -m "feat: add global config api helpers and permission tests (task 3/4)"
```

### 任务 4：实现前端双栏页面、路由接入与最终验证

**文件：**
- 创建：`admin-front/src/pages/admin/GlobalConfigPage.tsx`
- 修改：`admin-front/src/App.tsx`
- 可能修改：`admin-front/src/pages/admin/module-page-shared.tsx`
- 可选新增测试：`admin-front/src/pages/admin/global-config-page-helpers.test.ts`（若仍需补充分支）

- [ ] **步骤 1：先写失败断言，锁定页面核心辅助行为**

```ts
it('keeps current selection when visible project list still contains the active project', () => {
  expect(
    resolveSelectedProjectId(
      2,
      [
        { id: 1, projectName: 'BMS', projectCode: 'admin-console' },
        { id: 2, projectName: '站点', projectCode: 'zwpsite' },
      ],
      '站点',
    ),
  ).toBe(2)
})
```

- [ ] **步骤 2：运行前端测试确认失败**

运行：`pnpm --filter @super-pro/admin-front test -- src/pages/admin/global-config-page-helpers.test.ts`

预期：失败，提示页面选择逻辑尚未补齐。

- [ ] **步骤 3：实现页面与路由接入**

```tsx
<Route
  path="global-config"
  element={
    <AdminRouteGuard moduleSlug="global-config">
      <GlobalConfigPage />
    </AdminRouteGuard>
  }
/>
```

```tsx
<div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[18rem_minmax(0,1fr)]">
  <section>{/* 左侧项目列表 */}</section>
  <section>{/* 右侧配置表格、筛选、分页、弹窗 */}</section>
</div>
```

- [ ] **步骤 4：跑前端测试与构建**

运行：
- `pnpm --filter @super-pro/admin-front test -- src/api/modules/global-config.test.ts src/pages/admin/global-config-page-helpers.test.ts`
- `pnpm --filter @super-pro/admin-front build`

预期：前端测试通过，构建通过。

- [ ] **步骤 5：跑全链路最小验证**

运行：
- `pnpm --filter @super-pro/shared-types build`
- `pnpm --filter @super-pro/server test:unit -- global-config.service.test.ts global-config.repository.test.ts`
- `pnpm --filter @super-pro/server test:integration -- global-config.permission.api.test.ts`
- `pnpm --filter @super-pro/admin-front build`

预期：共享类型、后端、前端验证全部通过。

- [ ] **步骤 6：提交任务 4**

```bash
git add admin-front/src/pages/admin/GlobalConfigPage.tsx admin-front/src/App.tsx admin-front/src/pages/admin/global-config-page-helpers.test.ts
git commit -m "feat: add global config admin page (task 4/4)"
```
