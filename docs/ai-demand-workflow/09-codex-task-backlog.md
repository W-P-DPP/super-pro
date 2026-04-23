# 09 Codex 任务 Backlog

## 文档目的

这份文档把第一阶段的核心开发任务收敛成可直接派给 Codex 的任务单模板，用于逐步推进 ai-demand 一期 MVP。

原则：

- 一次只派一个明确任务包
- 每次都要求先阅读相关文档
- 每次都要求同步更新文档、测试和变更说明
- 严禁破坏性修改

## 通用任务单模板

```text
任务名称：
任务目标：
背景上下文：
请先阅读：
- docs/ai-demand-workflow/README.md
- docs/ai-demand-workflow/07-delivery-plan.md
- docs/ai-demand-workflow/08-phase-1-execution-checklist.md
- 与当前任务直接相关的其他文档

本次只做：
- 
- 
- 

本次不要做：
- 
- 
- 

输入：
- 现有代码/文档/表结构
- 相关依赖或配置

输出：
- 新增/修改哪些文件
- 更新哪些文档
- 增加哪些测试

约束：
- 禁止破坏性修改
- 优先增量新增，不侵入现有业务
- 文档统一中文
- 保持与 monorepo 现有规范一致
- 如遇不确定边界，先在文档中写清再实现

验收标准：
- 
- 
- 

完成后必须汇报：
- 改了什么
- 为什么这样改
- 还有哪些未完成/风险
```

## 任务单 1：建立 ai-demand 工程骨架与契约包

### 任务目标

在 super-pro monorepo 中，以非破坏性新增方式建立 ai-demand 相关工程骨架和共享契约包，为后续开发打底。

### 请先阅读

- `docs/ai-demand-workflow/README.md`
- `docs/ai-demand-workflow/03-system-design.md`
- `docs/ai-demand-workflow/04-data-model.md`
- `docs/ai-demand-workflow/08-phase-1-execution-checklist.md`

### 本次只做

- 新增 `packages/ai-demand-contracts`
- 新增 `packages/ai-demand-config`
- 为这两个包补最小 `README`、`package.json`、`src` 目录
- 规划未来 `ai-demand-server` / `ai-demand-console` 的建议落位说明
- 不实现业务逻辑

### 本次不要做

- 不新增后端服务代码
- 不新增前端控制台代码
- 不修改现有应用业务逻辑
- 不引入复杂依赖

### 验收标准

- contracts 与 config 两个包能被 workspace 识别
- README 清晰说明职责
- `ai-demand-server` / `ai-demand-console` 仅保留文档规划，不提前实现
- 不影响现有项目构建和结构

## 任务单 2：定义核心对象契约与状态枚举

### 任务目标

把第一阶段 MVP 需要的核心对象、状态机、审查动作和流程枚举落成统一代码契约。

### 请先阅读

- `docs/ai-demand-workflow/04-data-model.md`
- `docs/ai-demand-workflow/06-workflow-orchestration.md`
- `docs/ai-demand-workflow/08-phase-1-execution-checklist.md`

### 本次只做

- 在 `packages/ai-demand-contracts` 中定义核心实体类型
- 定义状态枚举
- 定义 Gate 1 / Gate 2 审查动作枚举
- 定义 workflow stage / prompt stage 相关枚举
- 导出统一入口

### 本次不要做

- 不实现数据库
- 不实现 API
- 不实现业务流程
- 不擅自删改文档定义的核心对象

### 必须覆盖的对象

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

### 验收标准

- 所有对象字段与文档一致或有明确修订说明
- 状态机和门禁枚举完整
- 后续服务和前端可直接复用这些类型

### 当前执行记录

- 已新增 `packages/ai-demand-contracts/src/common.ts`，定义通用 ID、时间戳、JSON、nullable 类型。
- 已新增 `packages/ai-demand-contracts/src/core-object.ts`，统一核心对象 key。
- 已新增 `packages/ai-demand-contracts/src/state.ts`，覆盖 Gate 1 / Gate 2 决策、review stage、workflow stage、prompt stage、核心对象状态和审计 actor 类型。
- 已新增 `packages/ai-demand-contracts/src/contracts.ts`，覆盖 `source_config`、`collection_batch`、`raw_signal`、`cleaned_signal`、`problem_cluster`、`opportunity_brief`、`scoring_profile`、`opportunity`、`prd_draft`、`review_task`、`workflow_run`、`prompt_execution`、`state_transition`、`audit_event`。
- 当前验证受本地依赖影响，`pnpm --filter @super-pro/ai-demand-contracts exec tsc -p tsconfig.json --noEmit` 失败原因为 `tsc` 命令不存在，而不是已确认的类型错误。

## 任务单 3：定义 scoring_profile 与 Prompt I/O Schema

### 任务目标

把评分策略和 Prompt 输入输出结构固定下来，确保后续 AI 流水线可校验、可配置、可审计。

### 请先阅读

- `docs/ai-demand-workflow/04-data-model.md`
- `docs/ai-demand-workflow/05-prompt-pipeline.md`
- `docs/ai-demand-workflow/07-delivery-plan.md`

### 本次只做

- 定义 `scoring_profile` schema
- 提供一套默认评分策略
- 定义清洗、聚类、机会摘要、评分、PRD 生成的输入输出 schema
- 约束字段命名与状态引用

### 本次不要做

- 不实现模型调用
- 不实现评分引擎
- 不实现 PRD 生成器

### 验收标准

- 评分维度支持可配置
- 可包含流量/分发潜力、结果可见性等维度
- Prompt 输出可被程序校验

### 当前执行记录

- 已新增 `packages/ai-demand-contracts/src/scoring.ts`，定义评分维度、权重、归一化、Gate rule、score breakdown 和 `AI_DEMAND_SCORING_PROFILE_SCHEMA`。
- 已新增 `packages/ai-demand-contracts/src/schema.ts`，定义轻量 schema 描述结构，用于后续 Prompt I/O 和配置校验。
- 已新增 `packages/ai-demand-contracts/src/prompt.ts`，覆盖 `signal_normalization`、`problem_clustering`、`opportunity_brief_generation`、`opportunity_scoring`、`prd_draft_generation` 的输入输出类型和 schema。
- 已新增 `packages/ai-demand-config/src/default-scoring-profile.ts`，提供默认评分策略，包含需求强度、战略匹配度、实现可行性、分发潜力、结果可见性、证据置信度，商业化潜力为默认关闭的可选维度。
- 待补：`signal_deduplication`、`pre_prd_gate_assist`、`post_prd_review_assist` 暂时只有枚举，尚未定义独立 I/O schema；可在进入对应业务任务前补齐。

## 任务单 4：建立数据库模型与迁移脚本

### 任务目标

把第一阶段闭环所需的数据表正式落地，支持后续信号、聚类、评分、PRD、审查和审计。

### 请先阅读

- `docs/ai-demand-workflow/04-data-model.md`
- `docs/ai-demand-workflow/06-workflow-orchestration.md`
- `docs/ai-demand-workflow/08-phase-1-execution-checklist.md`

### 本次只做

- 建表模型
- migration 脚本
- 基础 repository/dao 占位
- 状态与审计字段设计
- 版本化字段设计

### 必须覆盖的表

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

### 验收标准

- 一期所有核心对象都可落库
- 追加写、版本化、审计分离原则得到体现
- 字段命名与 contracts / docs 一致

### 当前执行记录

- 已新增 `docs/ai-demand-workflow/10-database-model-design.md`，明确表结构、索引、Gate 约束、幂等键与 migration 顺序。
- 已识别当前 contracts 与落库设计的差异项：`workflow_run.idempotency_key`、`state_transition.workflow_run_id` / `review_task_id`、`audit_event.workflow_run_id` / `prompt_execution_id` / `review_task_id` 尚未进入共享契约。
- 这意味着任务单 4 最合理的实现顺序应为：先微调共享契约，再落 migration 和 repository/dao 占位，而不是直接跳进数据库实现。

## 任务单 5：实现手工导入与 raw_signal 入库

### 任务目标

先打通最小信号入口，不依赖复杂爬虫，让公开信号能稳定进入系统。

### 请先阅读

- `docs/ai-demand-workflow/02-mvp-scope.md`
- `docs/ai-demand-workflow/06-workflow-orchestration.md`
- `docs/ai-demand-workflow/08-phase-1-execution-checklist.md`

### 本次只做

- `source_config` 基础管理
- `collection_batch` 创建
- 手工导入接口（文本、链接、批量）
- `raw_signal` 入库
- 去重基础逻辑
- 导入失败记录

### 本次不要做

- 不实现复杂抓取
- 不实现清洗/聚类
- 不实现评分

### 验收标准

- 一批公开信号可进入 `raw_signal`
- 支持按 batch 追踪
- 去重和失败记录可用

## 任务单 6：实现清洗流程 raw_signal -> cleaned_signal

### 任务目标

把原始信号转成结构化信号，作为聚类输入。

### 请先阅读

- `docs/ai-demand-workflow/05-prompt-pipeline.md`
- `docs/ai-demand-workflow/06-workflow-orchestration.md`
- `docs/ai-demand-workflow/08-phase-1-execution-checklist.md`

### 本次只做

- 清洗 Prompt 调用层
- 输出校验
- `cleaned_signal` 入库
- 噪音、重复、置信度处理
- `prompt_execution` / `workflow_run` 记录

### 本次不要做

- 不实现聚类
- 不实现评分
- 不实现 PRD 生成

### 验收标准

- `raw_signal` 能稳定转成 `cleaned_signal`
- 输出有结构化字段
- 失败、重试、审计可查

## 任务单 7：实现 problem_cluster 与 evidence 关联

### 任务目标

把 `cleaned_signal` 聚成问题簇，并保留可审查的代表性证据。

### 请先阅读

- `docs/ai-demand-workflow/04-data-model.md`
- `docs/ai-demand-workflow/05-prompt-pipeline.md`
- `docs/ai-demand-workflow/08-phase-1-execution-checklist.md`

### 本次只做

- 聚类流程
- `problem_cluster` 入库
- representative evidence 写入
- cluster 与 signal 的关联
- 聚类失败/低置信度处理

### 验收标准

- 一批 `cleaned_signal` 能形成多个问题簇
- 每个问题簇都能回查原始证据
- 边界不清晰时能标记低置信度

## 任务单 8：实现 opportunity_brief 与 scoring_profile 驱动评分

### 任务目标

先生成机会摘要，再按可配置策略完成评分，产出可审查的 candidate opportunity。

### 请先阅读

- `docs/ai-demand-workflow/03-system-design.md`
- `docs/ai-demand-workflow/04-data-model.md`
- `docs/ai-demand-workflow/05-prompt-pipeline.md`
- `docs/ai-demand-workflow/08-phase-1-execution-checklist.md`

### 本次只做

- `problem_cluster -> opportunity_brief`
- `scoring_profile` 加载
- `opportunity` 评分流程
- score breakdown / rationale / risks 写入

### 本次不要做

- 不实现 PRD 生成
- 不实现 Gate 2

### 验收标准

- 一个成熟 cluster 能形成一个 `opportunity_brief`
- 一个 brief 能按配置策略形成一个可解释的 `opportunity`
- 评分结果能体现策略差异

## 任务单 9：实现 Gate 1 + PRD 生成

### 任务目标

建立 PRD 前门禁，并在通过后生成结构化 PRD 草案。

### 请先阅读

- `docs/ai-demand-workflow/06-workflow-orchestration.md`
- `docs/ai-demand-workflow/07-delivery-plan.md`
- `docs/ai-demand-workflow/08-phase-1-execution-checklist.md`

### 本次只做

- Gate 1 `review_task`
- Gate 1 状态流转
- PRD 生成 Prompt 调用
- `prd_draft` 版本化
- `prompt_execution` / `audit_event` 记录

### 验收标准

- 没有 Gate 1 通过记录时，系统不能生成 PRD
- 通过后可生成结构化 PRD 草案
- 草案能追溯回 opportunity 和证据

## 任务单 10：实现 Gate 2 + 最小审核台

### 任务目标

让系统形成真正可操作的审查闭环，而不只是后台流水线。

### 请先阅读

- `docs/ai-demand-workflow/06-workflow-orchestration.md`
- `docs/ai-demand-workflow/07-delivery-plan.md`
- `docs/ai-demand-workflow/08-phase-1-execution-checklist.md`

### 本次只做

- Gate 2 `review_task`
- approve / changes_requested / reject 流程
- `prd_draft` 新版本逻辑
- 最小审核页面：
  - 机会列表
  - PRD 审核页
  - 审计追踪页

### 本次不要做

- 不做复杂 BI 看板
- 不做协同编辑器
- 不做大而全控制台

### 验收标准

- 产品经理可完成 Gate 2
- `changes_requested` 后会生成新版本
- 审核过程可审计

## 推荐执行顺序

- 先做任务单 1
- 验收通过后再做任务单 2、3
- 再进入数据库和导入
- 后续每个任务都建立在上一个任务结果上

原则：一单一验收，不并行把骨架、数据库、AI 流程全放出去。
