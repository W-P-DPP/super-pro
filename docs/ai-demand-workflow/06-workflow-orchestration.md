# 06 工作流编排

## 编排目标

工作流层负责协调采集、AI 处理和人工审查，让系统具备可重试、可追溯、可恢复和可门禁的执行能力。

## 主要状态

### signal

- `collected`
- `cleaning`
- `cleaned`
- `flagged_noise`
- `duplicate_marked`
- `failed`

### cluster

- `pending`
- `ready`
- `brief_pending`
- `archived`

### opportunity_brief

- `draft`
- `ready_for_scoring`
- `awaiting_pre_prd_gate`
- `approved_for_prd`
- `needs_more_evidence`
- `blocked`
- `archived`

### opportunity

- `draft`
- `scored`
- `approved_for_prd`
- `prd_generating`
- `prd_generated`
- `in_post_prd_review`
- `approved`
- `changes_requested`
- `rejected`

### prd_draft

- `generated`
- `in_review`
- `approved`
- `superseded`
- `rejected`

### review_task

- `pending`
- `in_review`
- `completed`
- `cancelled`

其中：

- Gate 1 决策值：`approved_for_prd` | `needs_more_evidence` | `blocked`
- Gate 2 决策值：`approved` | `changes_requested` | `rejected`

### workflow_run

工作流阶段标识固定为：

- `signal_collection`
- `signal_cleaning`
- `problem_clustering`
- `opportunity_brief_building`
- `opportunity_scoring`
- `pre_prd_gate_review`
- `prd_generation`
- `post_prd_gate_review`

执行状态建议固定为：

- `pending`
- `running`
- `succeeded`
- `failed`
- `cancelled`

### prompt_execution

执行状态建议固定为：

- `pending`
- `running`
- `succeeded`
- `failed`
- `cancelled`

## 主流程

1. 采集创建 `collection_batch`
2. 每条 `raw_signal` 进入清洗队列
3. 清洗产出 `cleaned_signal`
4. 聚类任务生成 `problem_cluster`
5. 机会摘要任务生成 `opportunity_brief`
6. 评分任务基于 `scoring_profile` 生成 `opportunity`
7. 进入 Gate 1，决定是否允许生成 PRD
8. Gate 1 通过后生成 `prd_draft`
9. 自动创建 Gate 2 审查任务
10. Gate 2 结果推进 `opportunity` 和 `prd_draft` 状态

## 触发策略

- 采集：定时或手工触发
- 清洗：按信号异步消费
- 聚类：批次完成后或按周期增量构建
- 机会摘要：聚类成熟后自动触发
- 评分：`opportunity_brief` 就绪后自动触发
- Gate 1：评分完成后触发人工或规则审查
- PRD 生成：仅在 Gate 1 通过后触发
- Gate 2：PRD 生成完成后自动建审查任务

## 显式门禁

### Gate 1：PRD 生成前

- 输入：`opportunity_brief`、评分结果、`scoring_profile`、证据缺口说明
- 负责人：默认产品经理，必要时升级给团队负责人
- 允许结果：`approved_for_prd`、`needs_more_evidence`、`blocked`
- 规则：没有 Gate 1 通过记录，系统不得生成 `prd_draft`

### Gate 2：PRD 生成后

- 输入：`prd_draft`、章节引用、历史评论、版本记录
- 负责人：默认产品经理，必要时升级给团队负责人
- 允许结果：`approved`、`changes_requested`、`rejected`
- 规则：`changes_requested` 后必须生成新版本 PRD，不能直接回到 `approved`

## 幂等与重试

- 每个异步任务都使用业务幂等键，例如 `target_type + target_id + stage + version`
- 瞬时失败可以按上限重试
- 连续失败进入 `failed` 或人工处理
- 重跑必须生成新版本或新执行记录，不能覆盖历史

## 人工介入点

- 低置信度或高风险的清洗结果
- 聚类边界不清晰的情况
- `opportunity_brief` 证据不足或假设过多
- 评分结果与当前策略冲突
- Gate 1 和 Gate 2

## 流转规则

- `blocked` 的 `opportunity_brief` 不能直接进入 `approved_for_prd`
- 没有 Gate 1 通过记录，不允许从 `scored` 进入 `prd_generating`
- `changes_requested` 后必须生成新的 `prd_draft.version`
- `rejected` 不能直接转成 `approved`
- 每个人工决策都必须同时写入 `review_task`、`state_transition` 和 `audit_event`

## 审计要求

每次状态推进至少记录：

- 目标对象
- 触发来源
- 前置状态
- 后置状态
- 原因
- 关联 `workflow_run`
- 关联 `prompt_execution`
- 关联 `scoring_profile` 版本

## 实现建议

- 异步阶段统一走队列
- 状态与审计在同一事务中持久化
- 状态机逻辑集中放在编排模块，不能散落在控制器或前端
- Gate 1 与 Gate 2 应有独立的服务方法和审计事件类型
