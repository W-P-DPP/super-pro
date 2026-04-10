## Context

当前 `siteMenu` 的 DTO 和前端菜单类型都已经定义了 `remark` 字段，前端首页 `HomePage` 也已经优先尝试使用 `remark` 渲染分组说明和卡片描述。但后端 `siteMenu.repository` 的查询链路基于 TypeORM 默认 `find`，而公共 `BaseSchemaColumns` 中的 `remark`、`createBy`、`updateBy` 等字段默认 `select: false`，导致 `getMenu` 返回的实体通常不包含 `remark`，前端最终只能回退到路径或占位文案。

这次改动同时触达后端菜单查询契约和前端首页目录展示，属于一条跨模块的行为修正。需要在不改变现有路由、业务前缀、六层结构和中文返回约束的前提下，把菜单备注稳定透传到前端内容区卡片。

## Goals / Non-Goals

**Goals:**

- 让 `siteMenu` 查询接口稳定返回菜单 `remark`
- 保持后端 `siteMenu` 六层结构、中文响应和现有路由命名不变
- 让前端首页内容区卡片描述明确使用后端返回的 `remark`
- 补充测试，覆盖备注透传和前端展示

**Non-Goals:**

- 不新增新的菜单接口
- 不调整 `siteMenu` 的数据库表结构
- 不改动首页整体视觉语言，只修正数据展示来源
- 不扩展为富文本说明、多语言说明或独立详情页

## Decisions

### 决策 1：在 repository 查询层显式补齐 `remark` 的持久化查询

后端问题的根因在于 `remark` 属于 `BaseEntity` 公共字段，且被实体 schema 标记为默认不参与查询。仅在 service 或 controller 中补字段无法解决实际缺值问题，因此应在 `siteMenu.repository` 的查询方法中显式把 `remark` 查出来，再继续复用现有 `SiteMenuService -> toResponseDto` 的输出流程。

选择这一方案而不是在 service 里二次查表的原因：

- 保持 repository 作为数据访问边界，不把查询细节散到 service
- 不破坏现有 `SiteMenuEntity` 和 `SiteMenuResponseDto` 结构
- 能一次性覆盖 `getTree`、`getNodeById` 及后续依赖树查询的逻辑

备选方案是把 `BaseSchemaColumns.remark.select` 直接改为 `true`。这会影响所有继承 `BaseEntity` 的模块，不符合本次“小范围修正”的目标，因此不采用。

### 决策 2：前端内容区卡片描述只以 `remark` 作为菜单说明来源

首页卡片底部已经单独展示了路径/目标地址，因此卡片描述区不应再把路径冒充菜单说明。实现时应把内容区卡片描述的优先级收敛为：

- 有 `remark` 时展示 `remark`
- 没有 `remark` 时展示明确的中文占位说明，例如“暂无菜单说明”

选择这一方案而不是继续使用 `remark || path` 的原因：

- 路径属于导航目标，不是业务说明
- 描述区与底部目标区职责分离后，界面信息层级更清晰
- 与用户要求“描述区展示 remark”一致

### 决策 3：前端保留既有商务风格和 token，不引入新的展示容器

这次是数据渲染修正，不是设计重构。前端应继续复用现有 `Card`、`Badge`、`Separator` 和 token，保持冷静、克制的商务风格，不新增装饰性组件或第二套视觉语言。浅色和深色主题都沿用当前 token，只验证 `remark` 文本在两种主题下的可读性。

## Risks / Trade-offs

- [风险] 后端只修正列表接口而遗漏详情接口，导致前后端契约不一致
  → Mitigation：在设计和测试中同时覆盖 `getMenu` 与 `getMenu/:id`

- [风险] 部分菜单历史数据没有 `remark`，前端描述区出现空白
  → Mitigation：前端使用明确的中文占位文案，但不再退回路径冒充说明

- [风险] 若直接修改公共 `BaseEntity` 查询策略，可能波及其他业务模块
  → Mitigation：本次仅在 `siteMenu.repository` 查询链路显式补齐所需字段

## Migration Plan

1. 调整 `siteMenu` repository 的查询方式，显式查询 `remark`
2. 校验 `SiteMenuService` 的列表和详情 DTO 输出都包含 `remark`
3. 调整前端首页内容区卡片描述逻辑，优先使用 `remark`
4. 补充后端接口测试与前端展示验证
5. 回归验证菜单列表加载、卡片描述和路径展示

回滚策略：

- 若后端查询修正出现回归，可回滚 `siteMenu.repository` 的字段选择变更
- 若前端展示不符合预期，可回滚首页卡片描述逻辑，恢复当前实现

## Open Questions

- 是否需要同步把左侧目录、悬浮提示等其他菜单说明位也统一切换为仅展示 `remark`；本次先限定在首页内容区卡片描述和现有查询契约
