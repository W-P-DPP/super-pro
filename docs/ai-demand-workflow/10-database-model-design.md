# 10 数据库模型与迁移设计

## 文档目的

本文档承接任务单 4，把 ai-demand 一期 MVP 的数据模型、表结构、状态写入、审计写入和幂等策略先定死，作为后续落库实现和 migration 的依据。

设计目标不是做大而全数据仓库，而是支撑一条可审查、可追溯、可恢复的最小生产线：

```text
source_config
-> collection_batch
-> raw_signal
-> cleaned_signal
-> problem_cluster
-> opportunity_brief
-> opportunity
-> prd_draft
-> review_task
-> state_transition / audit_event / workflow_run / prompt_execution
```

## 建模原则

- 追加优先：原始信号、AI 执行、状态流转、审计事件只追加，不覆盖。
- 版本化优先：PRD 草案、评分策略、Prompt 执行快照必须保留版本或快照引用。
- 审计分离：业务对象只保存当前状态，历史变化写入 `state_transition` 和 `audit_event`。
- 证据可回溯：任何 `opportunity` 和 `prd_draft` 都必须能追到 `raw_signal` / `cleaned_signal`。
- 门禁强约束：没有 Gate 1 通过记录，不允许生成 `prd_draft`。
- JSON 有边界：可配置字段用 JSON，核心查询字段必须列化。
- 命名稳定：表字段与 `packages/ai-demand-contracts` 中的类型保持一致。

## 命名约定

- 表名使用单数 snake_case，与核心对象 key 一致。
- 主键字段统一为 `id`，一期可用字符串 ID，后续可落为 UUID / CUID。
- 时间字段统一使用 `*_at`。
- JSON 字段统一使用 `metadata`、`event_payload`、`score_breakdown` 等业务名。
- `workflow_run.workflow_type` 继续沿用当前契约命名，但语义固定为 workflow stage。

## 表结构设计

### source_config

采集来源配置。

| 字段 | 类型建议 | 约束 | 说明 |
|---|---|---|---|
| id | varchar(128) | PK | 来源配置 ID |
| name | varchar(255) | not null | 来源名称 |
| source_type | varchar(32) | not null | `forum` / `social` / `qa` / `import` |
| access_mode | varchar(32) | not null | `manual` / `scheduled` |
| enabled | boolean | not null default true | 是否启用 |
| schedule_expr | varchar(128) | null | 定时表达式 |
| metadata | json | null | 来源补充配置 |
| created_at | timestamp | not null | 创建时间 |
| updated_at | timestamp | not null | 更新时间 |

索引：

- `idx_source_config_enabled`：`enabled`
- `idx_source_config_type`：`source_type`

### collection_batch

一次采集或手工导入批次。

| 字段 | 类型建议 | 约束 | 说明 |
|---|---|---|---|
| id | varchar(128) | PK | 批次 ID |
| source_config_id | varchar(128) | FK | 来源配置 ID |
| status | varchar(32) | not null | `pending` / `running` / `succeeded` / `failed` / `cancelled` |
| started_at | timestamp | null | 开始时间 |
| finished_at | timestamp | null | 完成时间 |
| raw_count | integer | not null default 0 | 原始条数 |
| accepted_count | integer | not null default 0 | 接收条数 |
| error_summary | text | null | 错误摘要 |
| metadata | json | null | 导入上下文 |
| created_at | timestamp | not null | 创建时间 |
| updated_at | timestamp | not null | 更新时间 |

索引：

- `idx_collection_batch_source`：`source_config_id`
- `idx_collection_batch_status`：`status`
- `idx_collection_batch_started_at`：`started_at`

### raw_signal

清洗前原始信号，追加写入。

| 字段 | 类型建议 | 约束 | 说明 |
|---|---|---|---|
| id | varchar(128) | PK | 原始信号 ID |
| collection_batch_id | varchar(128) | FK | 采集批次 ID |
| external_id | varchar(255) | null | 外部平台 ID |
| source_url | text | null | 来源链接 |
| author_name | varchar(255) | null | 作者名 |
| published_at | timestamp | null | 外部发布时间 |
| language | varchar(32) | null | 语言 |
| title | text | null | 标题 |
| content_raw | text | not null | 原文 |
| content_hash | varchar(128) | null | 内容 hash |
| dedupe_key | varchar(255) | null | 去重键 |
| is_duplicate | boolean | not null default false | 是否重复 |
| duplicate_of | varchar(128) | null | 重复目标 raw_signal ID |
| snapshot_ref | text | null | 原文快照引用 |
| metadata | json | null | 来源元信息 |
| ingested_at | timestamp | not null | 入库时间 |

索引：

- `idx_raw_signal_batch`：`collection_batch_id`
- `idx_raw_signal_content_hash`：`content_hash`
- `idx_raw_signal_dedupe_key`：`dedupe_key`
- `idx_raw_signal_duplicate_of`：`duplicate_of`
- `idx_raw_signal_ingested_at`：`ingested_at`

### cleaned_signal

结构化后的信号，保留从 raw_signal 到 AI 清洗结果的映射。

| 字段 | 类型建议 | 约束 | 说明 |
|---|---|---|---|
| id | varchar(128) | PK | 清洗信号 ID |
| raw_signal_id | varchar(128) | FK | 原始信号 ID |
| content_clean | text | not null | 清洗后正文 |
| normalized_problem | text | null | 标准化问题 |
| keywords | json | not null | 关键词数组 |
| sentiment | varchar(64) | null | 情绪倾向 |
| pain_level | decimal(4,2) | null | 痛点强度 |
| is_duplicate | boolean | not null default false | 是否重复 |
| duplicate_of | varchar(128) | null | 重复目标 cleaned_signal ID |
| is_noise | boolean | not null default false | 是否噪声 |
| pii_masked | boolean | not null default false | 是否脱敏 |
| quality_score | decimal(5,4) | null | 质量分 |
| processor_version | varchar(64) | not null | 清洗器或 Prompt 版本 |
| created_at | timestamp | not null | 创建时间 |

索引：

- `idx_cleaned_signal_raw`：`raw_signal_id`
- `idx_cleaned_signal_noise`：`is_noise`
- `idx_cleaned_signal_duplicate_of`：`duplicate_of`

### problem_cluster

问题簇主表。

| 字段 | 类型建议 | 约束 | 说明 |
|---|---|---|---|
| id | varchar(128) | PK | 问题簇 ID |
| title | varchar(255) | not null | 标题 |
| summary | text | not null | 摘要 |
| cluster_key | varchar(255) | not null | 聚类键 |
| size | integer | not null | 聚类规模 |
| confidence_score | decimal(5,4) | not null | 聚类置信度 |
| status | varchar(32) | not null | `pending` / `ready` / `brief_pending` / `archived` |
| representative_signal_ids | json | not null | 代表 cleaned_signal IDs 快照 |
| generated_by_run_id | varchar(128) | null | workflow_run ID |
| created_at | timestamp | not null | 创建时间 |
| updated_at | timestamp | not null | 更新时间 |

索引：

- `idx_problem_cluster_key`：`cluster_key`
- `idx_problem_cluster_status`：`status`
- `idx_problem_cluster_run`：`generated_by_run_id`

### problem_cluster_signal

问题簇与 cleaned_signal 的多对多关联。

| 字段 | 类型建议 | 约束 | 说明 |
|---|---|---|---|
| problem_cluster_id | varchar(128) | PK, FK | 问题簇 ID |
| cleaned_signal_id | varchar(128) | PK, FK | 清洗信号 ID |
| role | varchar(32) | not null | `member` / `representative` |
| confidence_score | decimal(5,4) | null | 归属置信度 |
| created_at | timestamp | not null | 创建时间 |

索引：

- `idx_problem_cluster_signal_signal`：`cleaned_signal_id`

### opportunity_brief

机会摘要和证据包。

| 字段 | 类型建议 | 约束 | 说明 |
|---|---|---|---|
| id | varchar(128) | PK | brief ID |
| problem_cluster_id | varchar(128) | FK | 问题簇 ID |
| title | varchar(255) | not null | 标题 |
| brief_statement | text | not null | 机会陈述 |
| target_user | text | not null | 目标用户 |
| evidence_signal_ids | json | not null | 证据 signal IDs 快照 |
| evidence_summary | text | not null | 证据摘要 |
| boundary_note | text | null | 边界说明 |
| distribution_hypothesis | text | null | 分发假设 |
| visibility_hypothesis | text | null | 结果可见性假设 |
| gap_notes | text | null | 证据缺口 |
| status | varchar(32) | not null | brief 状态 |
| generated_by_run_id | varchar(128) | null | workflow_run ID |
| created_at | timestamp | not null | 创建时间 |
| updated_at | timestamp | not null | 更新时间 |

索引：

- `idx_opportunity_brief_cluster`：`problem_cluster_id`
- `idx_opportunity_brief_status`：`status`

### scoring_profile

评分策略配置。即使默认配置来自代码，落库时也要保存可审计版本。

| 字段 | 类型建议 | 约束 | 说明 |
|---|---|---|---|
| id | varchar(128) | PK | profile ID |
| name | varchar(255) | not null | 名称 |
| strategy_key | varchar(128) | not null | 策略键 |
| version | varchar(64) | not null | 版本 |
| dimensions | json | not null | 评分维度 |
| weights | json | not null | 权重 |
| scale | json | null | 输出分数范围 |
| normalization | json | null | 归一化规则 |
| gate_rules | json | not null | Gate 规则 |
| enabled | boolean | not null default true | 是否启用 |
| metadata | json | null | 补充信息 |
| created_at | timestamp | not null | 创建时间 |
| updated_at | timestamp | not null | 更新时间 |

索引：

- `uniq_scoring_profile_strategy_version`：`strategy_key, version` unique
- `idx_scoring_profile_enabled`：`enabled`

### opportunity

候选产品机会和评分结果。

| 字段 | 类型建议 | 约束 | 说明 |
|---|---|---|---|
| id | varchar(128) | PK | opportunity ID |
| opportunity_brief_id | varchar(128) | FK | brief ID |
| scoring_profile_id | varchar(128) | FK | profile ID |
| name | varchar(255) | not null | 名称 |
| opportunity_statement | text | not null | 机会陈述 |
| score_total | decimal(8,2) | not null | 总分 |
| score_breakdown | json | not null | 分项评分 |
| score_confidence | decimal(5,4) | null | 评分置信度 |
| score_rationale | text | not null | 评分理由 |
| risk_notes | json | not null | 风险说明 |
| status | varchar(32) | not null | opportunity 状态 |
| created_at | timestamp | not null | 创建时间 |
| updated_at | timestamp | not null | 更新时间 |

索引：

- `idx_opportunity_brief`：`opportunity_brief_id`
- `idx_opportunity_profile`：`scoring_profile_id`
- `idx_opportunity_status_score`：`status, score_total`

### prd_draft

PRD 草案版本。重生成必须新增版本，不覆盖旧版本。

| 字段 | 类型建议 | 约束 | 说明 |
|---|---|---|---|
| id | varchar(128) | PK | PRD 草案 ID |
| opportunity_id | varchar(128) | FK | opportunity ID |
| version | integer | not null | 版本号，从 1 开始 |
| title | varchar(255) | not null | 标题 |
| background | text | not null | 背景 |
| target_user | text | not null | 目标用户 |
| problem_statement | text | not null | 问题陈述 |
| solution_hypothesis | text | not null | 方案假设 |
| scope_in | json | not null | 范围内 |
| scope_out | json | not null | 范围外 |
| risks | json | not null | 风险 |
| open_questions | json | not null | 未决问题 |
| citations | json | not null | 引用 |
| status | varchar(32) | not null | PRD 状态 |
| created_at | timestamp | not null | 创建时间 |
| updated_at | timestamp | not null | 更新时间 |

索引：

- `uniq_prd_draft_opportunity_version`：`opportunity_id, version` unique
- `idx_prd_draft_status`：`status`

### review_task

人工审查任务。

| 字段 | 类型建议 | 约束 | 说明 |
|---|---|---|---|
| id | varchar(128) | PK | 审查任务 ID |
| object_type | varchar(32) | not null | `opportunity` / `prd_draft` |
| object_id | varchar(128) | not null | 被审查对象 ID |
| review_stage | varchar(32) | not null | `pre_prd_gate` / `post_prd_gate` |
| assignee | varchar(128) | null | 审查人 |
| status | varchar(32) | not null | 审查任务状态 |
| decision | varchar(64) | null | 审查结论 |
| comment | text | null | 审查意见 |
| decided_at | timestamp | null | 决策时间 |
| created_at | timestamp | not null | 创建时间 |
| updated_at | timestamp | not null | 更新时间 |

索引：

- `idx_review_task_object`：`object_type, object_id`
- `idx_review_task_stage_status`：`review_stage, status`
- `idx_review_task_assignee`：`assignee`

### workflow_run

工作流阶段执行记录。

| 字段 | 类型建议 | 约束 | 说明 |
|---|---|---|---|
| id | varchar(128) | PK | run ID |
| workflow_type | varchar(64) | not null | workflow stage |
| target_type | varchar(64) | not null | 核心对象 key |
| target_id | varchar(128) | not null | 目标对象 ID |
| status | varchar(32) | not null | 执行状态 |
| attempt | integer | not null default 1 | 尝试次数 |
| idempotency_key | varchar(255) | not null | 幂等键 |
| started_at | timestamp | null | 开始时间 |
| finished_at | timestamp | null | 结束时间 |
| error_detail | text | null | 错误详情 |
| created_at | timestamp | not null | 创建时间 |
| updated_at | timestamp | not null | 更新时间 |

索引：

- `uniq_workflow_run_idempotency`：`idempotency_key` unique
- `idx_workflow_run_target`：`target_type, target_id`
- `idx_workflow_run_status`：`status`

说明：`idempotency_key` 尚未出现在 TypeScript 契约中，建议在任务单 4 实现时补回 `AiDemandWorkflowRun`。

### prompt_execution

模型调用和 Prompt 执行记录。

| 字段 | 类型建议 | 约束 | 说明 |
|---|---|---|---|
| id | varchar(128) | PK | prompt execution ID |
| workflow_run_id | varchar(128) | FK | workflow_run ID |
| target_type | varchar(64) | not null | 目标对象类型 |
| target_id | varchar(128) | not null | 目标对象 ID |
| prompt_stage | varchar(64) | not null | prompt stage |
| prompt_name | varchar(128) | not null | Prompt 名称 |
| prompt_version | varchar(64) | not null | Prompt 版本 |
| model_name | varchar(128) | not null | 模型名称 |
| input_ref | text | not null | 输入快照引用 |
| output_ref | text | null | 输出快照引用 |
| token_usage | json | null | token 统计 |
| latency_ms | integer | null | 延迟 |
| status | varchar(32) | not null | 执行状态 |
| created_at | timestamp | not null | 创建时间 |
| updated_at | timestamp | not null | 更新时间 |

索引：

- `idx_prompt_execution_run`：`workflow_run_id`
- `idx_prompt_execution_target`：`target_type, target_id`
- `idx_prompt_execution_stage_status`：`prompt_stage, status`

### state_transition

对象状态流转历史，只追加。

| 字段 | 类型建议 | 约束 | 说明 |
|---|---|---|---|
| id | varchar(128) | PK | 状态流转 ID |
| object_type | varchar(64) | not null | 对象类型 |
| object_id | varchar(128) | not null | 对象 ID |
| from_state | varchar(64) | null | 前置状态 |
| to_state | varchar(64) | not null | 后置状态 |
| trigger_type | varchar(32) | not null | `system` / `human` |
| trigger_by | varchar(128) | null | 触发人或系统标识 |
| reason | text | null | 原因 |
| workflow_run_id | varchar(128) | null | 关联 workflow_run |
| review_task_id | varchar(128) | null | 关联 review_task |
| created_at | timestamp | not null | 创建时间 |

索引：

- `idx_state_transition_object`：`object_type, object_id`
- `idx_state_transition_created_at`：`created_at`

说明：`workflow_run_id`、`review_task_id` 尚未出现在 TypeScript 契约中，建议在任务单 4 实现时补回 `AiDemandStateTransition`，否则审计链路需要通过 `audit_event` 间接关联。

### audit_event

统一审计事件，只追加。

| 字段 | 类型建议 | 约束 | 说明 |
|---|---|---|---|
| id | varchar(128) | PK | 审计事件 ID |
| object_type | varchar(64) | not null | 对象类型 |
| object_id | varchar(128) | not null | 对象 ID |
| event_type | varchar(128) | not null | 事件类型 |
| event_payload | json | not null | 事件载荷 |
| actor_type | varchar(32) | not null | `system` / `human` / `model` |
| actor_id | varchar(128) | null | actor ID |
| workflow_run_id | varchar(128) | null | 关联 workflow_run |
| prompt_execution_id | varchar(128) | null | 关联 prompt_execution |
| review_task_id | varchar(128) | null | 关联 review_task |
| created_at | timestamp | not null | 创建时间 |

索引：

- `idx_audit_event_object`：`object_type, object_id`
- `idx_audit_event_type`：`event_type`
- `idx_audit_event_created_at`：`created_at`

说明：关联 ID 尚未出现在 TypeScript 契约中，建议在任务单 4 实现时补回 `AiDemandAuditEvent`。

## 状态写入规则

### 通用规则

- 业务对象当前状态写在主表 `status`。
- 每次状态变化必须追加 `state_transition`。
- 每次关键动作必须追加 `audit_event`。
- 人工审查产生的状态变化必须关联 `review_task`。
- AI 执行产生的状态变化必须关联 `workflow_run` 和必要的 `prompt_execution`。

### Gate 1

- Gate 1 对象：`opportunity`。
- Gate 1 review stage：`pre_prd_gate`。
- 允许决策：`approved_for_prd`、`needs_more_evidence`、`blocked`。
- 只有存在 `review_task.status = completed` 且 `decision = approved_for_prd` 的记录，才能创建 `prd_draft`。
- Gate 1 通过后，`opportunity.status` 可进入 `approved_for_prd`，再由 PRD 生成流程推进到 `prd_generating` / `prd_generated`。

### Gate 2

- Gate 2 对象：`prd_draft`。
- Gate 2 review stage：`post_prd_gate`。
- 允许决策：`approved`、`changes_requested`、`rejected`。
- `changes_requested` 后必须生成新的 `prd_draft.version`，旧版本进入 `superseded` 或保留 `rejected` / `in_review` 的历史状态。
- `rejected` 不允许直接转 `approved`。

## 幂等策略

建议 `workflow_run.idempotency_key` 使用：

```text
{workflow_type}:{target_type}:{target_id}:{version_or_attempt_scope}
```

示例：

- `signal_cleaning:raw_signal:raw_123:v1`
- `problem_clustering:collection_batch:batch_123:v1`
- `opportunity_scoring:opportunity_brief:brief_123:profile_default_v1`
- `prd_generation:opportunity:opp_123:prd_v1`

规则：

- 相同幂等键的未完成任务不得重复创建。
- 失败重试增加 `attempt`，不覆盖旧 `prompt_execution`。
- 人工要求重跑时必须改变版本域，例如 `v2`。

## 审计事件类型建议

- `source_config.created`
- `collection_batch.started`
- `collection_batch.completed`
- `raw_signal.ingested`
- `raw_signal.duplicate_marked`
- `cleaned_signal.generated`
- `cleaned_signal.flagged_noise`
- `problem_cluster.generated`
- `opportunity_brief.generated`
- `opportunity.scored`
- `review_task.created`
- `review_task.decided`
- `prd_draft.generated`
- `prd_draft.superseded`
- `state.changed`
- `workflow_run.failed`
- `prompt_execution.failed`

## 迁移落地顺序

### migration 001：基础采集表

- `source_config`
- `collection_batch`
- `raw_signal`
- `audit_event`

### migration 002：AI 清洗与聚类表

- `cleaned_signal`
- `problem_cluster`
- `problem_cluster_signal`
- `workflow_run`
- `prompt_execution`
- `state_transition`

### migration 003：机会、评分与 PRD 表

- `scoring_profile`
- `opportunity_brief`
- `opportunity`
- `prd_draft`
- `review_task`

### migration 004：约束与种子数据

- 唯一索引
- 默认 `scoring_profile`
- 默认 `source_config` 示例（可选）
- 必要的检查约束（如当前数据库支持）

## 契约反向修订建议

为了让代码契约完全覆盖落库和审计链路，建议下一轮补充：

- `AiDemandWorkflowRun.idempotency_key`
- `AiDemandStateTransition.workflow_run_id`
- `AiDemandStateTransition.review_task_id`
- `AiDemandAuditEvent.workflow_run_id`
- `AiDemandAuditEvent.prompt_execution_id`
- `AiDemandAuditEvent.review_task_id`
- 主对象通用 `created_at` / `updated_at` 是否进入共享契约，需要统一取舍

## 验收标准

- 一期所有核心对象都有表结构承载。
- 数据库模型能支撑从信号到 PRD 草案的完整闭环。
- Gate 1 / Gate 2 有硬性数据约束和审计链路。
- AI 执行、人工审查、状态变化都能回放。
- 与当前 TypeScript 契约的差异已经明确列为下一轮修订项。
