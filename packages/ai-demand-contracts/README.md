# ai-demand-contracts

`@super-pro/ai-demand-contracts` 用于承载 AI 需求工作流的共享契约层。

当前阶段提供：
- 核心对象键名常量
- 核心实体 TypeScript 契约
- 状态枚举、Gate 1 / Gate 2 审查阶段与决策枚举
- workflow stage / prompt stage 枚举
- `scoring_profile` 的 schema、维度、权重、归一化与 gate rule 结构
- signal cleaning / problem clustering / opportunity brief generation / opportunity scoring / PRD draft generation 的 Prompt I/O contracts 与结构化 schema
- 包内统一入口导出

当前已覆盖的核心对象包括：
- `source_config`
- `collection_batch`
- `raw_signal`
- `cleaned_signal`
- `problem_cluster`
- `opportunity_brief`
- `scoring_profile`
- `opportunity`
- `prd_draft`
- `review_task`
- `workflow_run`
- `prompt_execution`
- `state_transition`
- `audit_event`

后续可继续在本包内补充：
- 事件校验工具
- 面向 API / DB 层的 DTO 与映射辅助类型
