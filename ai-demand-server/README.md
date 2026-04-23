# ai-demand-server

`@super-pro/ai-demand-server` 当前承载 ai-demand 一期后端的最小数据层与服务层实现。

当前包含：

- Phase 1 基础表的 `EntitySchema`
- 数据库迁移脚手架
- `source_config` 基础管理服务
- 手动导入 `signal-ingest` 服务
  - 支持 `text / link / batch`
  - 创建 `collection_batch`
  - 写入 `raw_signal`
  - 记录基础去重标记
  - 记录导入失败与批次审计

当前不包含：

- 网页抓取或复杂采集器
- `cleaned_signal` 之后的 AI 流程编排
- 前端控制台

使用约束：

- 以增量方式扩展 schema，不直接重写已存在数据
- 导入留痕优先复用 `workflow_run`、`state_transition`、`audit_event`
- 避免引入高风险依赖或破坏 monorepo 现有服务
