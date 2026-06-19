# BMS 系统管理新增全局配置设计

## 1. 目标

在 `BMS` 管理后台的 `系统管理` 分组下新增一个二级菜单 `全局配置`，提供按项目维度维护配置项的能力。

本次交付目标：

- 在后台菜单、前端导航、权限体系中新增 `全局配置` 模块入口
- 提供项目维度的全局配置 CRUD
- 配置记录以“项目 + 配置键”作为唯一业务边界
- 配置支持基础类型：文本、数字、布尔
- 前后端沿用仓库现有 `project` / `site-menu` / `admin-menu` / `permissions` 的实现风格

## 2. 范围

本次纳入：

- 后端新增 `global-config` 模块
- 前端新增 `GlobalConfigPage`
- `shared-types` 新增该模块菜单、按钮和 API 权限码
- BMS 后台种子菜单增加 `全局配置`
- 支持配置列表查询、按项目切换、新增、编辑、删除

本次不纳入：

- 配置发布历史
- 配置版本回滚
- 配置分环境覆盖
- 批量导入导出
- 复杂类型如 JSON、数组、密文配置
- 基于配置模板的自动生成表单

## 3. 用户界面

### 3.1 菜单位置

在 `系统管理` 分组下新增二级菜单：

- `全局配置`

与现有：

- `BMS菜单`
- `站点菜单`

保持同级。

### 3.2 页面结构

页面结构参考现有 `权限管理` 页面，采用左右分栏：

- 左侧为项目列表区
- 右侧为配置表格区
- 右侧顶部为工具栏
- 右侧底部为分页区
- 右侧承载新增 / 编辑弹窗与删除确认弹窗

交互约束：

- 左侧项目列表支持关键词过滤项目
- 默认选中第一个可见项目
- 右侧表格仅展示当前选中项目下的配置
- 切换项目后，右侧配置列表、分页和筛选条件按当前项目重新加载
- 若当前没有项目数据，右侧展示空状态并提示先去项目管理页创建项目

### 3.3 左侧项目区

左侧项目区参考 `权限管理` 的项目侧栏：

- 展示项目名称
- 展示项目编码
- 可补充当前项目配置数
- 支持项目关键词搜索
- 当前选中项目有高亮态

项目列表过滤：

- 匹配项目名称
- 匹配项目编码

### 3.4 右侧筛选项

右侧配置区首版提供：

- 配置关键词搜索：匹配配置键、配置名称、备注
- 状态筛选：正常 / 冻结 / 全部

说明：

- `项目维度` 不再通过顶部下拉筛选，而是通过左侧项目列表选择驱动

### 3.5 列表字段

右侧表格展示：

- 项目名称
- 项目编码
- 配置键
- 配置名称
- 配置类型
- 配置值
- 状态
- 更新时间
- 备注
- 操作

说明：

- `项目名称 / 项目编码` 主要用于表格上下文完整性展示，即使已在左侧选中项目仍保留
- `配置值` 按类型展示，超长时截断
- `布尔` 类型在列表中展示为 `true / false`
- `数字` 类型按数值文本展示

### 3.6 表单字段

新增 / 编辑表单字段：

- `projectId`
- `configKey`
- `configName`
- `configType`
- `configValue`
- `status`
- `remark`

字段约束：

- `projectId` 必填，来自左侧当前选中项目，默认不允许在右侧表单内切换
- `configKey` 必填，作为项目内唯一键，格式沿用项目编码风格：字母、数字、点、下划线、中划线组合
- `configName` 必填
- `configType` 必填，首版支持：
  - `text`
  - `number`
  - `boolean`
- `configValue` 必填，并根据 `configType` 使用对应输入控件
- `status` 默认 `1`
- `remark` 可选

表单交互：

- `text` 类型使用文本域
- `number` 类型使用数字输入框
- `boolean` 类型使用布尔选择组件
- 编辑时若切换类型，需要按新类型重新校验配置值

## 4. 数据模型

新增表：`sys_global_config`

建议字段：

- `id`
- `project_id`
- `config_key`
- `config_name`
- `config_type`
- `config_value`
- `status`
- `remark`
- 通用基础字段：`create_by` / `create_time` / `update_by` / `update_time` / `delete_flag`

业务约束：

- `project_id + config_key` 唯一
- 仅保留逻辑删除
- 配置必须挂到已存在项目
- `config_type` 仅允许预设枚举
- `config_value` 按 `config_type` 解释和校验

实体关系：

- `sys_global_config` -> `sys_project`

首版不做外键级联删除，删除项目时也不自动删除配置；若项目已有关联配置，删除项目的处理保持现状，不在本次改动扩大范围。

## 5. 后端设计

新增模块目录：

- `general-server/src/globalConfig`

模块文件参考现有 `project` 模块组织：

- `global-config.entity.ts`
- `global-config.dto.ts`
- `global-config.repository.ts`
- `global-config.service.ts`
- `global-config.controller.ts`
- `global-config.router.ts`

### 5.1 接口

提供接口：

- `GET /global-config/getGlobalConfig`
- `GET /global-config/getGlobalConfig/:id`
- `POST /global-config/createGlobalConfig`
- `PUT /global-config/updateGlobalConfig/:id`
- `DELETE /global-config/deleteGlobalConfig/:id`

### 5.2 查询能力

列表查询支持：

- `keyword`
- `projectId`
- `status`
- `page`
- `pageSize`

返回值沿用现有分页结构：

- `items`
- `total`
- `page`
- `pageSize`

### 5.3 校验规则

服务层校验：

- `id` / `projectId` 为正整数
- `configKey` 非空、长度受限、格式合法
- `configName` 非空、长度受限
- `configType` 必填，且仅允许 `text | number | boolean`
- `configValue` 必填，且按类型校验：
  - `text`：按字符串保存
  - `number`：必须是合法数字
  - `boolean`：必须是 `true/false` 或等价布尔值
- `status` 仅允许 `0 | 1`
- `remark` 为可选字符串
- `projectId` 必须存在
- 同一项目下 `configKey` 不可重复

### 5.4 仓储行为

仓储层负责：

- 列表分页
- 关联项目名称和项目编码
- 唯一键检查
- 逻辑删除
- `configType` 与 `configValue` 的持久化

列表查询直接补齐：

- `projectName`
- `projectCode`

避免前端二次映射。

## 6. 前端设计

新增页面：

- `admin-front/src/pages/admin/GlobalConfigPage.tsx`

新增接口模块：

- `admin-front/src/api/modules/global-config.ts`

新增路由：

- `/global-config`

在 `App.tsx` 中注册路由，并接入 `AdminRouteGuard`。

### 6.1 导航与模块元信息

需要同步：

- `admin-front/src/data/admin-navigation.ts`
- `general-server/src/adminMenu/adminMenu.seed.ts`

新增模块元信息：

- `slug: global-config`
- `group: 系统管理`

### 6.2 权限

新增权限码：

- `admin-console.menu.global-config.view`
- `admin-console.button.global-config.create`
- `admin-console.button.global-config.update`
- `admin-console.button.global-config.delete`
- `admin-console.api.global-config.read`
- `admin-console.api.global-config.create`
- `admin-console.api.global-config.update`
- `admin-console.api.global-config.delete`

需要同步位置：

- `packages/shared-types/src/auth.ts`
- `general-server/src/authorization/authorization.permissions.ts`
- `general-server/src/adminMenu/adminMenu.seed.ts`

默认编辑角色需要具备以上权限，以保持与现有后台编辑能力一致。

### 6.3 页面交互

页面实现参考 `PermissionsPage`：

- 左侧项目列表负责当前项目上下文切换
- 右侧表格区负责当前项目下配置管理
- 新增配置时直接挂到当前选中项目
- 若当前无项目数据，右侧区域展示引导文案，提示先去项目管理页创建项目
- 若左侧项目过滤后没有结果，保持未选中状态并清空右侧表格数据

## 7. 实现策略

本次按“最小完整闭环”交付：

1. 先补齐共享类型、权限码、菜单种子
2. 再补后端 `global-config` 模块和路由挂载
3. 再补前端 API、页面、路由与模块元信息
4. 再补配置类型相关校验、映射和表单控件
5. 最后补测试与构建验证

## 8. 测试与验证

后端至少覆盖：

- 创建配置成功
- 同项目重复 `configKey` 创建失败
- 不存在项目时创建失败
- 不同 `configType` 的值校验成功与失败
- 更新配置成功
- 更新时切换 `configType` 后值校验生效
- 删除配置成功
- 列表按项目筛选成功

前端至少覆盖：

- API 请求参数归一化
- 页面基础交互：左侧项目切换、右侧筛选、创建、编辑、删除
- 不同类型表单控件与提交载荷正确映射
- 权限控制下按钮显隐

命令层验证至少覆盖：

- `shared-types` 构建
- `admin-front` 构建或相关测试
- `general-server` 单测

## 9. 风险与取舍

已知取舍：

- 首版只支持 `text / number / boolean` 三种类型
- `configValue` 存储层仍统一落为可序列化值，业务层负责类型校验与转换
- 不处理项目删除与配置引用的联动策略，避免扩大到项目模块行为变更

主要风险：

- 若后续要求配置值支持结构化 JSON、数组或密文，前端展示和服务层校验需要扩展
- 若业务要求“每项目只有固定配置集合”，则首版通用配置中心需要再增加模板层

## 10. 验收标准

验收以以下结果为准：

- 系统管理下可见 `全局配置` 二级菜单
- 页面结构与 `权限管理` 一致，左侧为项目列表，右侧为当前项目配置表格
- 有权限用户可进入页面并完成项目维度配置 CRUD
- 无权限用户不可见菜单或不可执行对应操作
- 列表可按项目切换
- 同项目下重复配置键会被拦截
- 不同配置类型的录入、保存和展示符合预期
- 前后端构建 / 测试通过
