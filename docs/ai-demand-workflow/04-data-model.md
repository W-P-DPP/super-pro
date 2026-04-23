# 04 数据模型

## 核心实体

### source_config

定义一个采集来源。

关键字段：

- `id`
- `name`
- `source_type`：`forum | social | qa | import`
- `access_mode`：`manual | scheduled`
- `enabled`
- `schedule_expr`
- `metadata`

### collection_batch

表示一次采集或导入批次。

关键字段：

- `id`
- `source_config_id`
- `status`
- `started_at`
- `finished_at`
- `raw_count`
- `accepted_count`
- `error_summary`

### raw_signal

保存业务清洗前的原始信号。

关键字段：

- `id`
- `collection_batch_id`
- `external_id`
- `source_url`
- `author_name`
- `published_at`
- `language`
- `title`
- `content_raw`
- `content_hash`
- `dedupe_key`
- `is_duplicate`
- `duplicate_of`
- `snapshot_ref`
- `metadata`
- `ingested_at`

### cleaned_signal

保存清洗后的结构化信号。

关键字段：

- `id`
- `raw_signal_id`
- `content_clean`
- `normalized_problem`
- `keywords`
- `sentiment`
- `pain_level`
- `is_duplicate`
- `duplicate_of`
- `is_noise`
- `pii_masked`
- `quality_score`
- `processor_version`

### problem_cluster

表示一个已聚合的用户问题簇。

关键字段：

- `id`
- `title`
- `summary`
- `cluster_key`
- `size`
- `confidence_score`
- `status`
- `representative_signal_ids`
- `generated_by_run_id`

### opportunity_brief

表示进入评分前的机会摘要和证据包。

关键字段：

- `id`
- `problem_cluster_id`
- `title`
- `brief_statement`
- `target_user`
- `evidence_signal_ids`
- `evidence_summary`
- `boundary_note`
- `distribution_hypothesis`
- `visibility_hypothesis`
- `gap_notes`
- `status`
- `generated_by_run_id`

### scoring_profile

表示一套可配置的评分策略。

关键字段：

- `id`
- `name`
- `strategy_key`
- `version`
- `dimensions`
- `weights`
- `gate_rules`
- `enabled`
- `metadata`

说明：

- `dimensions` 与 `weights` 建议存 JSON，不把分项字段硬编码进主业务表
- 付费意愿或商业化潜力只能作为可选维度配置，不作为固定字段

### opportunity

表示一个基于 `opportunity_brief` 得出的候选机会。

关键字段：

- `id`
- `opportunity_brief_id`
- `scoring_profile_id`
- `name`
- `opportunity_statement`
- `score_total`
- `score_breakdown`
- `score_confidence`
- `score_rationale`
- `risk_notes`
- `status`

### prd_draft

保存一个 AI 生成的 PRD 草案版本。

关键字段：

- `id`
- `opportunity_id`
- `version`
- `title`
- `background`
- `target_user`
- `problem_statement`
- `solution_hypothesis`
- `scope_in`
- `scope_out`
- `risks`
- `open_questions`
- `citations`
- `status`

### review_task

表示一个人工审查任务。

关键字段：

- `id`
- `object_type`
- `object_id`
- `review_stage`：`pre_prd_gate | post_prd_gate`
- `assignee`
- `status`
- `decision`
- `comment`
- `decided_at`

### workflow_run

表示一次工作流阶段执行。

关键字段：

- `id`
- `workflow_type`
- `target_type`
- `target_id`
- `status`
- `attempt`
- `started_at`
- `finished_at`
- `error_detail`

说明：

- 当前代码契约里 `workflow_run.workflow_type` 实际复用统一的 workflow stage 枚举，后续数据库命名是否保留 `workflow_type` 或调整为 `workflow_stage`，需要在建表阶段一次性定死，但跨服务必须只保留一套枚举来源。

### prompt_execution

保存一次模型执行记录。

关键字段：

- `id`
- `workflow_run_id`
- `target_type`
- `target_id`
- `prompt_stage`
- `prompt_name`
- `prompt_version`
- `model_name`
- `input_ref`
- `output_ref`
- `token_usage`
- `latency_ms`
- `status`

### state_transition

保存对象级状态变更历史。

关键字段：

- `id`
- `object_type`
- `object_id`
- `from_state`
- `to_state`
- `trigger_type`：`system | human`
- `trigger_by`
- `reason`
- `created_at`

### audit_event

保存统一审计记录。

关键字段：

- `id`
- `object_type`
- `object_id`
- `event_type`
- `event_payload`
- `actor_type`
- `actor_id`
- `created_at`

## 关系

- `source_config` 1:N `collection_batch`
- `collection_batch` 1:N `raw_signal`
- `raw_signal` 1:N `cleaned_signal`
- `cleaned_signal` N:N `problem_cluster`
- `problem_cluster` 1:N `opportunity_brief`
- `scoring_profile` 1:N `opportunity`
- `opportunity_brief` 1:N `opportunity`
- `opportunity` 1:N `prd_draft`
- `opportunity` 或 `prd_draft` 1:N `review_task`
- 任意核心对象 1:N `state_transition`
- 任意 AI 阶段 1:N `prompt_execution`

## 建模规则

- `raw_signal` 采用追加式写入，不原地覆盖
- AI 输出必须版本化，重跑生成新记录
- 评分维度和权重放在 `scoring_profile`，不在 `opportunity` 中写死分项列
- 状态历史和审计历史与业务表分离存储
- 任何对外结论都必须能追溯到证据、提示词执行和人工门禁

## 契约对齐约定

- `workflow_run.workflow_type` 当前在共享契约中已复用统一的 workflow stage 枚举，不在不同服务里重复维护。
- `prompt_execution.prompt_stage` 应使用统一的 prompt stage 枚举，与提示词流水线文档保持一致。
- `review_task.review_stage`、对象 `status`、门禁 `decision` 应全部复用共享契约中的枚举定义。
- `raw_signal` 已补充 `content_hash`、`dedupe_key`、`is_duplicate`、`duplicate_of`、`metadata`，用于支持后续手工导入和去重追踪。
- `scoring_profile` 当前已在共享契约中落为可配置 schema，默认 profile 以代码常量方式提供，后续落库时应保留版本字段与启停开关。
- Prompt I/O 已在共享契约中覆盖 `signal_normalization`、`problem_clustering`、`opportunity_brief_generation`、`opportunity_scoring`、`prd_draft_generation` 五类标准输入输出结构；`signal_deduplication`、`pre_prd_gate_assist`、`post_prd_review_assist` 仍保留在流程枚举中，但尚未单独定义 I/O schema。
