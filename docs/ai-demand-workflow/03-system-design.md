# 03 系统设计

## 设计原则

- 边界清晰：采集、处理、聚类、证据整理、评分、PRD 生成、审查和审计分层
- 流程可重放：原始输入和关键中间结果都需要持久化
- 增量集成：后续接入 super-pro 时优先新增包和服务，而不是修改现有系统核心
- 人工可接管：关键自动步骤都允许暂停、重跑或人工替换
- 策略可配置：评分维度、权重和门禁规则由配置驱动，而不是写死在流程里

## MVP 模块

### 1. 来源连接器

职责：

- 拉取或接收公开需求信号
- 转成统一的 `raw_signal`
- 记录来源配置和采集批次

### 2. 信号处理

职责：

- 清洗文本、提取字段、去重和脱敏
- 产出 `cleaned_signal`
- 写入质量标签和处理元数据

### 3. 问题聚类

职责：

- 识别跨信号的问题主题
- 形成 `problem_cluster`
- 保留代表样本和聚类解释

### 4. 机会摘要构建器

职责：

- 从 `problem_cluster` 生成 `opportunity_brief`
- 汇总证据、边界说明、目标用户和信息缺口
- 为评分和门禁提供统一输入

### 5. 机会评分引擎

职责：

- 按 `scoring_profile` 对 `opportunity_brief` 多维打分
- 产出 `opportunity`
- 保存分项结果、理由和不确定性说明

### 6. PRD 生成器

职责：

- 仅对通过 Gate 1 的机会生成 `prd_draft`
- 输出结构化章节和章节级引用

### 7. 审查控制台

职责：

- 展示完整证据链、评分理由和 PRD 草案
- 支持 Gate 1 和 Gate 2 的通过、退回和拒绝
- 存储审查结论与评论

### 8. 工作流编排器

职责：

- 驱动状态机和显式门禁
- 处理任务调度、重试和幂等
- 协调 AI 阶段与人工阶段

### 9. 审计与追踪

职责：

- 存储状态流转、提示词执行、模型元数据和人工操作
- 支持按对象、批次、工作流实例回放

## 逻辑架构

```text
来源连接器
  -> 原始信号仓
  -> 清洗流水线
  -> 清洗信号仓
  -> 聚类引擎
  -> 问题聚类仓
  -> 机会摘要构建器
  -> opportunity_brief 仓
  -> 评分引擎
  -> opportunity 仓
  -> Gate 1
  -> PRD 生成器
  -> prd_draft 仓
  -> Gate 2
  -> 通过 / 退回 / 拒绝结果

审计与追踪横跨全链路。
工作流编排器负责状态流转、重试和门禁协同。
```

## 运营模型

### AI 负责什么

- 把原始信号转成结构化信号
- 给出聚类建议和 `opportunity_brief`
- 基于策略配置完成评分
- 起草 PRD 和审查辅助建议

### 人类负责什么

- 决定采集范围和合法性边界
- 抽查证据质量与聚类边界
- 执行 Gate 1 和 Gate 2
- 在策略冲突时做最终判断

### 决策门禁

- Gate 1，PRD 前门禁： owner 建议为产品经理；检查证据是否充分、评分是否符合当前策略、是否值得投入 PRD 编写成本
- Gate 2，PRD 后门禁： owner 建议为产品经理或团队负责人；检查 PRD 是否清晰、证据是否足够、范围是否受控

## 存储建议

- 事务型数据库：核心对象、状态和门禁结果
- 大文本表或对象存储：原始快照、提示词输入输出快照、长文本 PRD
- 队列：异步清洗、聚类、评分和 PRD 生成

## 未来 super-pro 集成建议

建议按当前仓库风格落到以下位置：

- `packages/ai-demand-contracts`：放 DTO、状态枚举、Zod 或 JSON Schema、事件契约；当前阶段已创建最小骨架
- `packages/ai-demand-config`：放 `scoring_profile`、门禁规则、来源模板和提示词版本声明；当前阶段已创建最小骨架
- `ai-demand-server`：新增独立后端服务，加入 `pnpm-workspace.yaml`；当前已创建一期数据库模型与迁移脚手架
- `ai-demand-console`：新增独立前端审查台，加入 `pnpm-workspace.yaml`；当前仅保留建议落位，不创建目录

`ai-demand-server` 建议的模块目录：

- `src/modules/source-config`
- `src/modules/signal-ingest`
- `src/modules/signal-process`
- `src/modules/problem-cluster`
- `src/modules/opportunity-brief`
- `src/modules/opportunity-score`
- `src/modules/prd-draft`
- `src/modules/review-gate`
- `src/modules/audit`

`ai-demand-console` 建议的页面目录：

- `src/pages/signals`
- `src/pages/clusters`
- `src/pages/briefs`
- `src/pages/opportunities`
- `src/pages/prds`
- `src/pages/reviews`
- `src/pages/audit`

共享能力优先复用现有包：

- 类型与常量优先依赖 `packages/shared-types`、`packages/shared-constants`
- 服务基础设施优先依赖 `packages/shared-server`
- 前端基础组件优先依赖 `packages/shared-ui`、`packages/shared-web`

## API 边界建议

- `POST /signals/import`
- `POST /signals/collect-jobs`
- `POST /clusters/rebuild`
- `POST /briefs/build`
- `POST /opportunities/score`
- `POST /gates/pre-prd/{opportunityId}/submit`
- `POST /opportunities/{id}/generate-prd`
- `POST /gates/post-prd/{prdId}/submit`
- `GET /audit/{objectType}/{objectId}`

API 只暴露资源操作、门禁动作和状态流转，不暴露内部提示词细节。
