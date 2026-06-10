# 前端权限接入指南

当任务涉及页面、菜单、按钮、用户显示要求、管理台操作区、受保护数据展示、个人信息、角色权限页面，或任何需要消费受保护 API 的前端能力时，默认读取本文件。除非用户明确要求“不做权限校验”，否则权限接入是必做项。

## 当前项目的前端权限校验链路

当前仓库已有一套前端权限消费主链路，重点集中在 `admin-front`：

1. `admin-front/src/api/modules/authorization.ts`
   - 通过 `/authorization/me/projects/:projectCode` 获取当前用户在指定项目下的权限快照
   - 通过 `/authorization/users/:id/projects` 获取用户项目权限展示数据
2. `packages/shared-web/src/authorization.ts`
   - 提供 `createProjectPermissionChecker`
   - 支持按权限码、资源维度、启用状态做校验
3. `admin-front/src/contexts/admin-menu-context.tsx`
   - 统一加载权限快照
   - 暴露 `hasPermission`
   - 生成 `visibleNavGroups` / `visibleModules`
4. `admin-front/src/App.tsx`
   - `AdminRouteGuard` 通过 `canAccessModule` 做页面准入控制
5. `admin-front/src/components/AppLayout.tsx`
   - 只渲染当前用户有权限看到的导航菜单
6. 具体页面示例
   - `SettingsPage.tsx`：按钮显隐由 `hasPermission(...)` 控制
   - `RolesPage.tsx`：创建、编辑、删除、分配权限按钮都做权限判断
   - `UsersPage.tsx`：查看用户项目权限时走专门权限展示 API

## 默认规则

- 页面准入、菜单显隐、按钮显隐、用户显示要险求，都是权限敏感场景
- 只控制页面入口不够，操作按钮和危动作也要继续校验
- 只控制按钮显隐不够，页面本身如果不该进入，也要做准入拦截或无权限空态
- 前端权限控制只负责体验，后端接口必须同步强校验
- 如果页面展示的是用户、角色、权限、项目权限等敏感信息，也必须先判断“当前用户是否有查看权限”

## 什么时候必须接权限

以下场景默认必须接权限：

- 新页面
- 新管理台菜单
- 新二级菜单或模块入口
- 新按钮、批量操作、导入导出、状态切换
- 用户信息展示
- 用户列表、用户详情、角色列表、权限列表、项目权限展示
- 任何调用 `requiresAuth: true` 接口的关键交互

只有这些情况可以不做：

- 用户明确要求不做权限校验
- 当前能力本身就是公开匿名页面，且后端也是公开接口

## 页面接入步骤

1. 先定义页面准入权限
2. 再定义页面操作权限
3. 确认权限码来自 `@super-pro/shared-types`
4. 优先接到已有权限上下文、hooks 或 shared 权限工具
5. 如果页面本身不应被无权限用户访问
   - 用现有 route guard
   - 或展示受控无权限状态
6. 如果页面能访问但部分功能受限
   - 用 `hasPermission(...)` 控制按钮、浮层入口、批量操作区和提交动作

## 菜单和路由规则

- 菜单显隐优先复用 `visibleNavGroups` / `visibleModules`
- 页面准入优先复用 `canAccessModule`
- 不要把权限判断散落到多个 layout 和 page 里各自手写一套
- 新菜单项如果来自后端菜单配置，必须同时定义菜单权限码
- 新静态路由页如果是管理页，也要明确它的准入权限

## 按钮和操作区规则

每个按钮都要先回答两个问题：

1. 谁能看见它
2. 看见以后触发的接口，后端是否也有对应权限

推荐写法：

```ts
const canCreate = hasPermission(PERMISSION_CODES.create)
const canUpdate = hasPermission(PERMISSION_CODES.update)
const canDelete = hasPermission(PERMISSION_CODES.delete)
```

适用对象包括：

- 新增
- 编辑
- 删除
- 导入
- 导出
- 状态开关
- 权限分配
- 用户资料修改

## 用户显示要求

“用户显示要求”默认也要做权限控制，包括但不限于：

- 用户列表是否可见
- 用户详情是否可见
- 当前用户是否可查看别人权限
- 是否展示角色、权限、项目权限、手机号等信息

实现要求：

- 先校验页面准入
- 再校验具体展示块或查看动作
- 必要时区分“可查看概要”和“可查看完整详情”

## API 消费要求

- 受保护接口默认 `requiresAuth: true`
- 明确处理 `401` 和 `403`
- 不在页面里手动拼 token 或权限头
- 若页面权限依赖快照，优先在 context / hook 层集中加载，不在多个页面重复拉取

## 缺少共享能力时的处理

如果现有项目没有你需要的权限工具：

1. 先看 `shared-web` 是否已有类似能力
2. 若缺少，优先补共享能力
3. 再让页面消费

不要做的事：

- 在页面里写死 permission code 字符串
- 每个页面自己发明一套 `canXXX`
- 只隐藏按钮，不管页面准入
- 只做前端显隐，不确认后端是否有 `403` 强校验

## 测试和验收清单

涉及权限接入的前端任务，至少验证：

- 有权限用户能看到正确页面或按钮
- 无权限用户看不到对应菜单/按钮，或进入后得到受控无权限状态
- 受保护 API 的 `401` / `403` 分支被正确处理
- 共享权限工具没有被页面层重复实现

如果无法补自动化测试，最终说明里必须明确：

- 哪些权限路径已手工验证
- 哪些仍存在验证空白
- 后端是否已同步具备强校验
