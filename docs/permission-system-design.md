# 权限功能设计方案

更新时间：2026-06-04

## 1. 背景

仓库当前已经有一套基础 RBAC 能力：

- `general-server` 已有 `sys_role`、`sys_permission`、`sys_user_role`、`sys_role_permission` 四张核心表。
- 后端已经有 `loadAuthenticatedPrincipal`、`requirePermission`、`requireAnyPermission`、`requireAllPermissions` 等权限校验中间件。
- `file-server` 已完成第一阶段试点。
- `project` 模块已经接入了接口级权限校验。

但当前权限体系仍然不完整，主要缺口有：

- `site-menu` 路由没有统一接入 JWT 和权限校验。
- `admin-front` 的页面路由和侧边导航仍然是静态写死的，没有消费权限快照。
- 按钮权限目前只存在于设计占位页面里，没有真实后端绑定。
- “菜单可见”、“按钮显隐”和“接口可调用”之间还没有形成闭环。

这次设计的目标，是在不推翻现有 RBAC 基础的前提下，把“项目、菜单、按钮、接口”四类权限统一到一套可落地方案里，待你审核通过后再实施。

## 2. 本次设计范围

本方案覆盖四类权限能力：

1. 项目权限
2. 菜单权限
3. 按钮权限
4. 接口权限

本方案不覆盖的内容：

- 项目维度的数据隔离
- 按部门、按区域、按项目成员范围的数据权限
- 登录流程重写
- 全量动态路由系统

需要特别说明：

- 这里的“项目权限”，先指 `sys_project` 这个项目管理模块的 CRUD 权限，不等于“用户只能看自己项目的数据范围”。
- 这里的“菜单权限”，同时包括“管理台导航菜单显隐”和“菜单管理模块自身的 CRUD 权限”两个概念，后续实施时必须分开处理。

## 2.1 已确认的审核结论

以下结论已由需求方确认：

1. `site-menu/getMenu` 不需要改为必须登录访问，现阶段保持公开访问。
2. `admin-front` 导航菜单第一阶段只做显隐控制，不改动态路由。
3. “项目权限”当前仅指项目管理模块 CRUD，不包含项目数据隔离。
4. 同意采用新权限编码规范：`<appCode>.<resourceType>.<resourceCode>.<action>`。
5. 第一批实施范围暂时只包含 `admin-front`。

## 3. 现状梳理

### 3.1 后端现状

- `authorization` 模块已经具备角色、权限、角色权限分配、用户角色分配能力。
- 权限实体已经包含 `appCode`、`resourceType`、`resourceCode`、`action`，模型本身可以覆盖 `menu`、`route`、`button`、`api`、`data`。
- `project` 路由已经通过 `requirePermission(...)` 做了接口保护。
- `site-menu` 仍未挂 `jwtMiddleware`，目前不是受保护接口。

### 3.2 前端现状

- `admin-front` 的 `App.tsx` 采用静态路由。
- `AppLayout.tsx` 的侧边菜单来自静态 `admin-navigation.ts`，不是后端权限快照。
- `PermissionsPage.tsx` 目前是本地模拟数据，不是实际权限管理页。
- `site-menu` 接口虽然存在，但当前更多用于菜单数据消费，不是管理台权限中心。

### 3.3 结论

当前系统更像“后端已有权限基础，前端和业务模块还没统一接入”。  
因此推荐继续沿用现有 RBAC 基础做增量演进，而不是重做一套权限系统。

## 4. 设计目标

## 4.1 功能目标

- 后端接口必须成为真正的安全边界。
- 前端菜单和按钮必须能根据权限快照做显隐。
- 同一个权限编码体系，能够同时表达项目、菜单、按钮、接口。
- 项目管理和菜单管理要优先接入，作为 `admin-front` 第一批真实落地模块。

## 4.2 设计原则

- 认证和授权分离：JWT 解决“你是谁”，权限系统解决“你能做什么”。
- 后端权威：前端显隐只优化体验，不能代替后端校验。
- 复用现有基础：继续使用 `authorization` 模块和现有 RBAC 表。
- 先静态接入、后动态演进：第一阶段不强制把 `admin-front` 改成全动态路由。

## 5. 推荐方案

## 5.1 总体架构

```text
            +--------------------+
            |      JWT 登录       |
            +----------+---------+
                       |
                       v
            +--------------------+
            |  loadAuthenticated |
            |     Principal      |
            +----------+---------+
                       |
             +---------+----------+
             |                    |
             v                    v
   +------------------+   +----------------------+
   | 权限快照 snapshot |   | 接口级权限中间件 guard |
   +--------+---------+   +----------+-----------+
            |                        |
            v                        v
   +------------------+   +----------------------+
   | 前端菜单/按钮显隐 |   | project/site-menu/... |
   +------------------+   +----------------------+
```

这套方案分两条链路：

- 用户进入前端时，前端请求权限快照，决定菜单和按钮是否显示。
- 用户调用后端接口时，后端通过权限中间件做强校验。

## 5.2 权限资源模型

继续复用当前 `sys_permission` 结构：

- `appCode`：权限所属应用或域
- `resourceType`：资源类型
- `resourceCode`：资源标识
- `action`：动作
- `code`：稳定权限编码

推荐的资源类型用法如下：

| 类型 | 含义 | 示例 |
| --- | --- | --- |
| `menu` | 页面或导航可见性 | 项目管理页面、权限管理页面 |
| `button` | 页面操作按钮 | 新增、修改、删除、导入、发布 |
| `api` | 后端接口调用权限 | 获取列表、获取详情、创建、更新、删除 |
| `data` | 数据范围 | 后续项目隔离、部门隔离时再启用 |

## 5.3 权限编码规范

现有 `file-server` 试点使用的是简化编码，例如：

- `file-server.tree.read`
- `project.project.read`

为了支持菜单、按钮、接口三类资源同时存在，建议从 `admin-front` 第二阶段开始统一采用更明确的新编码规范：

```text
<appCode>.<resourceType>.<resourceCode>.<action>
```

示例：

- `admin-front.menu.projects.view`
- `admin-front.button.projects.create`
- `admin-front.button.projects.update`
- `admin-front.button.projects.delete`
- `general-server.api.project.list.read`
- `general-server.api.project.detail.read`
- `general-server.api.project.create.create`
- `general-server.api.project.update.update`
- `general-server.api.project.delete.delete`
- `admin-front.menu.site-menu.view`
- `admin-front.button.site-menu.import`
- `general-server.api.site-menu.list.read`

说明：

- 旧编码先兼容，不立即改 file-server 试点。
- 新接入的 `admin-front`、`project`、`site-menu` 权限建议直接使用新规范。
- `appCode` 用于区分“哪个端/哪个服务消费这个权限”。

## 5.4 角色模型

继续使用现有 RBAC：

- 用户 `user`
- 角色 `role`
- 权限 `permission`
- 用户角色关系 `user_role`
- 角色权限关系 `role_permission`

推荐角色分层：

- `platform.admin`
- `admin-front.viewer`
- `admin-front.editor`
- `project.viewer`
- `project.editor`
- `site-menu.viewer`
- `site-menu.editor`

角色不要直接和页面写死绑定。页面、按钮、接口最终都通过权限集合控制。

## 6. 四类权限的落地方式

## 6.1 项目权限

第一阶段的“项目权限”只覆盖项目管理模块本身：

### 菜单权限

- `admin-front.menu.projects.view`

### 按钮权限

- `admin-front.button.projects.create`
- `admin-front.button.projects.update`
- `admin-front.button.projects.delete`

### 接口权限

- `general-server.api.project.list.read`
- `general-server.api.project.detail.read`
- `general-server.api.project.create.create`
- `general-server.api.project.update.update`
- `general-server.api.project.delete.delete`

### 落地规则

- 用户没有菜单权限：管理台不显示“项目管理”菜单。
- 用户有菜单权限但没有按钮权限：页面能进，但按钮按权限显隐。
- 用户没有接口权限：即使前端误放出按钮，后端也返回 `403`。

## 6.2 菜单权限

这里分两种菜单：

### A. 管理台导航菜单

例如：

- 工作台
- 用户管理
- 角色管理
- 权限管理
- 项目管理
- BMS 菜单
- 站点菜单

推荐每个页面配置一条 `menu` 权限。

示例：

- `admin-front.menu.users.view`
- `admin-front.menu.roles.view`
- `admin-front.menu.permissions.view`
- `admin-front.menu.projects.view`
- `admin-front.menu.bms-menu.view`
- `admin-front.menu.site-menu.view`

### B. 菜单管理模块自身权限

这是 `site-menu` 这个业务模块的 CRUD 权限。

推荐：

- `admin-front.button.site-menu.create`
- `admin-front.button.site-menu.update`
- `admin-front.button.site-menu.delete`
- `admin-front.button.site-menu.import`
- `general-server.api.site-menu.list.read`
- `general-server.api.site-menu.detail.read`
- `general-server.api.site-menu.create.create`
- `general-server.api.site-menu.update.update`
- `general-server.api.site-menu.delete.delete`
- `general-server.api.site-menu.import.create`

注意：

- “菜单可见性”不等于“菜单管理权限”。
- 一个用户可以看见“站点菜单”页面，但没有新增/删除按钮权限。

## 6.3 按钮权限

按钮权限只做前端交互控制，不单独作为安全边界。

推荐实现方式：

- 前端启动后读取 `/authorization/snapshot?appCode=admin-front`
- 把 `resourceType=button` 的权限整理成一个 `buttonPermissionSet`
- 页面通过统一方法判断：

```text
can('admin-front.button.projects.create')
can('admin-front.button.site-menu.import')
```

按钮权限的适用对象：

- 新增
- 编辑
- 删除
- 导入
- 导出
- 发布
- 分配角色

按钮权限和接口权限必须一一对应，不能只做前端显隐。

## 6.4 接口权限

接口权限是本方案里必须先落地的部分。

推荐规则：

- 所有需要登录的业务路由先经过 `jwtMiddleware`
- 进入模块后统一 `loadAuthenticatedPrincipal`
- 每个接口用 `requirePermission(...)` 明确声明所需权限

例如：

- `GET /project/getProject` 需要列表读取权限
- `POST /project/createProject` 需要项目创建权限
- `DELETE /site-menu/deleteMenu/:id` 需要菜单删除权限

后端返回语义：

- 未登录：`401`
- 已登录但无权限：`403`

这部分要保持和 `file-server` 试点一致。

## 7. 权限快照设计

现有快照接口已经存在：

- `GET /authorization/snapshot?appCode=xxx`

推荐继续复用，不另起接口。

但为了支持前端菜单、按钮、接口同时消费，建议快照返回值在现有基础上按 `resourceType` 分组使用。

前端消费方式：

```text
permissions
  -> menu permissions
  -> button permissions
  -> api permissions
```

推荐前端内部生成三个集合：

- `menuPermissionCodes`
- `buttonPermissionCodes`
- `apiPermissionCodes`

如果后续发现前端频繁自己分组，可以在第二阶段再考虑把分组结果直接放到快照响应里，但第一阶段不是必须。

## 8. admin-front 的推荐接入策略

不建议第一阶段把 `admin-front` 改成完全动态路由。  
推荐分两步：

### 第一步：静态路由不动，只做权限显隐

- `App.tsx` 继续保留静态路由
- `AppLayout.tsx` 根据菜单权限过滤左侧导航
- 每个页面根据按钮权限控制操作区
- 页面初始化失败或无权限时展示受控空态

优点：

- 改动小
- 回归风险低
- 能快速完成真实接入

### 第二步：如有需要，再逐步演进为“权限驱动导航”

只有在后续确认管理台菜单需要完全后台化时，再考虑让前端导航由后端配置驱动。

## 9. site-menu 模块的推荐接入策略

`site-menu` 是这次设计里必须处理的重点，因为它现在没有统一鉴权。

但根据已确认结论，第一批不实施 `site-menu` 改造，且 `GET /site-menu/getMenu` 现阶段继续保持公开访问。

推荐调整：

1. `/site-menu/*` 先统一接入 `jwtMiddleware`
2. 路由内部统一 `loadAuthenticatedPrincipal`
3. 各接口按动作挂权限中间件

建议映射如下：

| 接口 | 权限 |
| --- | --- |
| `GET /site-menu/getMenu` | `general-server.api.site-menu.list.read` |
| `GET /site-menu/getMenu/:id` | `general-server.api.site-menu.detail.read` |
| `POST /site-menu/createMenu` | `general-server.api.site-menu.create.create` |
| `PUT /site-menu/updateMenu/:id` | `general-server.api.site-menu.update.update` |
| `DELETE /site-menu/deleteMenu/:id` | `general-server.api.site-menu.delete.delete` |
| `POST /site-menu/uploadMenuFile` | `general-server.api.site-menu.import.create` |

同时要明确一个业务选择：

- 如果 `/site-menu/getMenu` 既给管理台用，又给其他匿名场景用，就要拆成“公开菜单接口”和“后台管理接口”两套路由。
- 如果它本来就是后台接口，那就应该直接纳入 JWT 和权限体系。

当前代码更偏向“后台接口”，所以推荐直接纳入鉴权。

补充说明：

- 上述调整保留为第二阶段建议，不进入第一批实施范围。
- 如果后续要同时兼顾公开菜单消费和后台菜单管理，建议拆分为“公开读取接口”和“后台管理接口”两套路由。

## 10. 第一批权限矩阵建议

完整方案下，建议优先覆盖以下模块：

### 项目管理

- 页面菜单：1 条
- 按钮：3 条
- 接口：5 条

### 菜单管理

- 页面菜单：2 条
  - `BMS 菜单`
  - `站点菜单`
- 按钮：4 到 6 条
- 接口：5 到 6 条

### 权限管理与角色管理

这两个页面本身建议同步纳入菜单权限，但不建议在第一阶段就把整套管理能力做复杂化。

推荐先保留：

- `admin-front.menu.roles.view`
- `admin-front.menu.permissions.view`

这样可以先把“谁能看见权限页面”纳入体系。

## 11. 第一批实施建议

根据已确认范围，第一批只实施 `admin-front`，不改造 `project` 和 `site-menu` 后端接口。

第一批建议内容：

1. `admin-front` 接入 `authorization/snapshot?appCode=admin-front`
2. 在前端建立统一的 `can(permissionCode)` 权限判断能力
3. 左侧导航按 `menu` 权限做显隐
4. 页面操作区按 `button` 权限做显隐
5. 对未授权页面提供受控空态或无权限提示

第一批不包含：

- `project` 后端接口权限重构
- `site-menu` 路由鉴权改造
- 动态路由
- 数据权限

## 12. 后续实施建议

待你审核通过后，推荐按下面顺序实施：

1. 先完成 `admin-front` 菜单与按钮显隐联动
2. 补齐 `admin-front` 所需权限编码与角色种子数据
3. 第二阶段再评估 `project` 的接口权限编码升级
4. 第二阶段再评估 `site-menu` 后台管理接口鉴权拆分
5. 最后视情况扩展到数据权限

## 13. 第一批影响文件范围

审核通过后，预计会改动这些区域：

- `packages/shared-types/src/auth.ts`
- `admin-front/src/App.tsx`
- `admin-front/src/components/AppLayout.tsx`
- `admin-front/src/pages/admin/*`
- `admin-front/src/api/*`

按当前范围，第一批原则上不改：

- `general-server/src/project/*`
- `general-server/src/siteMenu/*`
- `general-server/src/index.ts`

是否需要改 `general-server/src/authorization/*`，取决于当前快照是否已足够支撑 `admin-front` 的菜单和按钮权限消费。

## 14. 风险与注意点

- 如果只做前端菜单隐藏，不做后端接口拦截，权限是不成立的。
- 如果把 `site-menu/getMenu` 直接加鉴权，要确认有没有匿名场景依赖它。
- 如果项目权限后续扩展到“按项目看数据”，那会从功能权限演进到数据权限，需要单独设计。
- 当前 `admin-front` 不是权限驱动路由，第一阶段不要强推动态路由，否则范围会失控。

针对当前已确认范围，需要额外说明：

- 第一批只做 `admin-front`，因此第一批成果本质上是“前端显隐能力接入”。
- 真正的后端强校验闭环会在后续阶段补齐到 `project`、`site-menu` 等业务模块。
- 所以第一批更像“管理台权限消费层接入”，不是“全链路权限闭环完成”。

## 15. 推荐结论

推荐采用“继续沿用现有 RBAC 基础，第一批只实现 `admin-front` 的菜单/按钮显隐接入，后续再补业务模块接口强校验”的方案。

具体结论如下：

- 不重做权限表结构
- 继续以 `authorization` 模块为中心
- `admin-front` 第一阶段先做静态路由下的菜单和按钮显隐
- `site-menu/getMenu` 保持公开访问
- `project` 权限暂按 CRUD 功能权限理解
- 新权限编码按 `<appCode>.<resourceType>.<resourceCode>.<action>` 推进
- 第一阶段只做功能权限，不做项目级数据隔离

## 16. 审核结果记录

本轮已确认结果如下：

1. `site-menu/getMenu` 不改为必须登录访问
2. 管理台导航暂时只做显隐藏，不改动态路由
3. “项目权限”当前只指项目管理模块 CRUD
4. 同意新权限编码规范 `<appCode>.<resourceType>.<resourceCode>.<action>`
5. 第一批实施范围暂时只有 `admin-front`
