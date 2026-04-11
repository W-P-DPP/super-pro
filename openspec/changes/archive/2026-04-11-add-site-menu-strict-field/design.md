## Context

当前 `siteMenu` 模块已经是完整的六层后端实现，菜单数据通过 `sys_site_menu` 持久化，并同时支持列表查询、详情查询、创建、更新、删除和菜单文件导入。现有菜单字段包含 `name`、`path`、`icon`、`isTop`、`sort`、`remark` 等，但还没有 `strict` 字段，因此这一布尔配置无法在数据库、接口响应和文件导入链路中保持一致。

这次变更属于现有模块扩展，不需要拆新模块，但会同时触达：

- `siteMenu.entity.ts` 的表结构与种子节点建模
- `siteMenu.dto.ts` 的请求与响应契约
- `siteMenu.repository.ts` 的字段读写与导入持久化
- `siteMenu.service.ts` 的输入校验和默认值策略
- `siteMenu.controller.ts` 与现有 CRUD 接口返回结构
- `siteMenu.json` 和上传导入链路的兼容性
- `siteMenu` 相关单元测试与集成测试

## Goals / Non-Goals

**Goals:**

- 为 `siteMenu` 数据模型新增 `strict` 布尔字段并落到 `sys_site_menu`
- 让 `GET /api/site-menu/getMenu`、`GET /api/site-menu/getMenu/:id` 返回 `strict`
- 让 `POST /api/site-menu/createMenu`、`PUT /api/site-menu/updateMenu/:id` 支持写入和更新 `strict`
- 让 `siteMenu.json` 种子和 `uploadMenuFile` 导入链路支持 `strict`
- 为旧数据和旧请求保持兼容，不因新增字段破坏现有调用

**Non-Goals:**

- 不在本次变更中为 `strict` 定义新的菜单权限、路由匹配或前端行为语义
- 不新增 `siteMenu` 之外的模块联动逻辑
- 不改变现有 `siteMenu` 路由命名、业务前缀和整体响应格式

## Decisions

### 决策 1：`strict` 作为 `siteMenu` 的一等布尔字段落到实体、DTO 和响应模型

`strict` 直接加入 `SiteMenuEntity`、`SiteMenuResponseDto`、`CreateSiteMenuRequestDto` 和 `UpdateSiteMenuRequestDto`，并通过 repository 读写数据库字段。

这样做的原因：

- 字段是 `siteMenu` 的业务属性，应该由模块自己的数据模型承接
- 能保证查询结果、创建更新输入和数据库结构一致
- 符合后端守卫对“先定契约、再写接口”的要求

备选方案：

- 只在前端或 JSON 文件里挂临时字段：会导致数据库和接口失真，不可取

### 决策 2：数据库字段使用布尔类型，命名与实体字段保持 `strict`

`sys_site_menu` 新增 `strict` 列，实体字段名也使用 `strict`，类型为布尔。因为字段本身不是层级关系或审计字段，不需要塞进 `BaseEntity`，只保留在 `siteMenu` 实体本身。

这样做的原因：

- 字段语义简单直接，不需要额外映射名或枚举包装
- 与当前 `isTop` 的布尔建模方式一致，降低实现复杂度

### 决策 3：旧数据与旧请求对 `strict` 采用兼容默认值 `false`

为了避免新增字段破坏现有调用链，以下情况统一按 `false` 处理：

- `siteMenu.json` 老节点没有 `strict`
- 旧的 `createMenu` 请求体没有传 `strict`
- 旧的数据库记录同步后没有显式设置 `strict`

而 `updateMenu` 仍保持部分更新语义，仅在请求显式传入 `strict` 时更新该字段。

这样做的原因：

- 当前仓库已有大量种子、测试和可能的前端调用都不含该字段
- 布尔字段默认 `false` 风险最低，也最利于平滑迁移

备选方案：

- 把 `strict` 设为必填：会直接破坏现有导入数据和已存在的创建调用

### 决策 4：文件导入和种子展开链路同步支持 `strict`

`flattenSiteMenuSeedNodes`、`RawSiteMenuSeedNode`、文件导入校验和 `siteMenu.json` 示例结构都要接入 `strict`。导入时如果节点未传 `strict`，同样兼容为 `false`。

这样做的原因：

- 当前 `siteMenu` 模块既依赖数据库，也保留菜单文件作为导入源
- 如果只改 CRUD 不改导入链路，会导致字段在重新导入后丢失

### 决策 5：本次只做字段透传和校验，不定义 `strict` 的附加业务规则

service 层只负责：

- 把 `strict` 解析为布尔值
- 对非法类型返回中文参数错误
- 在创建、更新、查询和导入中保持字段一致

不在本次变更中追加例如“strict=true 时禁止为空路径”之类的新规则。

这样做的原因：

- 用户需求只要求新增字段并修改 CRUD 接口，没有提出新的业务行为
- 先把字段契约稳定下来，再按增量变更扩展语义更稳妥

## Risks / Trade-offs

- [风险] 老的 `siteMenu.json` 和历史测试数据没有 `strict` 字段
  → Mitigation：统一兼容默认值 `false`，并在实现时补齐测试断言

- [风险] CRUD 和导入链路没有一起改时，会出现字段只在部分路径可见
  → Mitigation：把实体、DTO、repository、service、controller、seed 和测试作为同一批变更处理

- [风险] 如果后续需要给 `strict` 增加业务语义，当前变更不会提前约束
  → Mitigation：在设计中明确本次只做字段建模与接口透传，后续通过独立 change 扩展语义

## Migration Plan

1. 扩展 `siteMenu.entity.ts` 和数据库字段，新增 `strict`
2. 扩展 `siteMenu.dto.ts`、`siteMenu.repository.ts`、`siteMenu.service.ts`，支持字段校验、默认值和持久化
3. 扩展 `siteMenu.controller.ts` 对应的 CRUD 返回结构，确保查询结果包含 `strict`
4. 更新 `siteMenu.json`、种子节点展开和上传导入链路，保证导入兼容
5. 补充 `siteMenu` 单元测试与集成测试，覆盖默认值、显式写入和响应断言

回滚策略：

- 回滚 `siteMenu` 六层文件和测试中关于 `strict` 的改动
- 若数据库已添加字段但业务回滚，可保留兼容列不读写，避免强制回退表结构

## Open Questions

- `siteMenu.json` 示例数据里是否需要主动给部分现有节点设置 `strict: true`，还是全部先按 `false` 落地
