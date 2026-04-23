# AI 需求工作流文档

这是一套独立文档，用于定义一个从公开需求信号到机会评估、PRD 草案和人工审查的一期 MVP。

目标不是全自动产品决策，而是先建立一条可运行、可审计、可人工把关、后续可增量接入 super-pro 的工作流。

## 文件说明

- `01-overview.md`：一期目标、北极星、用户、运营模型和端到端流程
- `02-mvp-scope.md`：一期范围、非目标、范围边界和验收边界
- `03-system-design.md`：模块设计、逻辑架构、角色分工和集成建议
- `04-data-model.md`：核心实体、关系和建模规则
- `05-prompt-pipeline.md`：提示词阶段、输入输出契约和失败处理
- `06-workflow-orchestration.md`：状态机、双门禁、重试和审计要求
- `07-delivery-plan.md`：分阶段交付计划、成功指标和风险控制

## 设计规则

- 一期北极星：把公开需求信号稳定转成“可审查的 PRD 草案”，不是直接替代产品决策
- 一期只覆盖：公开信号采集、清洗、聚类、`opportunity_brief`、可配置评分、PRD 草案、人工门禁和审计追踪
- 任何 AI 结果都必须能追溯到来源证据、提示词版本、模型版本和人工决策
- super-pro 的后续接入必须是增量式的：新包、新服务、新表、新 API
- PRD 生成前和 PRD 生成后都必须经过显式门禁，不能跳过

## 当前工程落位

当前已在 monorepo 中新增以下共享包骨架：

- `packages/ai-demand-contracts`
- `packages/ai-demand-config`

未来建议继续按独立应用方式新增，但本阶段暂不创建目录：

- `ai-demand-server`
- `ai-demand-console`

## 建议阅读顺序

1. 先读 `01-overview.md` 和 `02-mvp-scope.md`
2. 再读 `03-system-design.md` 和 `04-data-model.md`
3. 然后按 `05-prompt-pipeline.md` 和 `06-workflow-orchestration.md` 实现 AI 流程
4. 最后用 `07-delivery-plan.md` 安排交付顺序
