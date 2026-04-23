# 08 第一期执行清单

## 文档目的

这份文档把当前 `docs/ai-demand-workflow` 的方案进一步收敛为“第一阶段可开发任务清单”，用于项目启动、任务拆解与阶段验收。

第一阶段的目标不是做一个完整的平台，而是跑通一条最小闭环：

```text
公开信号进入
-> 清洗结构化
-> 问题聚类
-> 机会摘要
-> 评分
-> Gate 1
-> PRD 生成
-> Gate 2
-> 审计留痕
```

## 第一期总目标

交付一个内部可用、可审查、可追溯的需求工作流，让团队可以把公开需求信号稳定转成“可审查的 PRD 草案”。

## 工作包拆分

第一阶段建议拆成 8 个工作包：

- WP1：项目骨架与基础契约
- WP2：数据模型与存储层
- WP3：信号采集与导入
- WP4：AI 清洗与问题聚类
- WP5：机会摘要与评分引擎
- WP6：PRD 生成与双门禁
- WP7：审计、追踪与回放
- WP8：最小审核台 / 控制台

其中：

- WP1-WP3 是底盘
- WP4-WP6 是核心价值链
- WP7-WP8 是可控性与可用性保障

## WP1：项目骨架与基础契约

### 目标

先定义工程边界、核心对象契约、状态枚举和提示词输入输出契约，避免后续开发发散。

### 任务

- 定义核心对象 TypeScript 类型 / DTO / Schema
- 定义状态枚举
- 定义工作流阶段枚举
- 定义审查动作枚举
- 定义评分策略配置结构
- 定义 Prompt 输入输出 Schema

### 产出物

- `packages/ai-demand-contracts/`
- `packages/ai-demand-config/`
- `ai-demand-server` / `ai-demand-console` 的建议落位说明
- 与现有文档保持一致的契约定义

### 完成标准

- 所有核心对象和状态能被统一引用
- 讨论和实现不再依赖口头概念

## WP2：数据模型与存储层

### 目标

把核心数据表、状态写入规则、审计规则和版本化规则先落地。

### 任务

- 建表脚本
- Repository / DAO 基础层
- 状态写入规范
- 审计记录写入规范
- 版本化写入规则
- 幂等键设计

### 必须建的表

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

### 完成标准

- 数据层能支撑完整闭环
- 任意对象能向前回查证据，向后回查结论

### 当前推进结果

- 数据模型设计稿已新增：`docs/ai-demand-workflow/10-database-model-design.md`
- 已明确核心表、关联表、幂等键、状态写入规则、Gate 1 / Gate 2 审计链路和 migration 顺序
- 下一步可以直接进入 migration 与 repository/dao 占位实现，而不是再回头讨论对象边界

## WP3：信号采集与导入

### 目标

先把公开信号导入系统，不追求复杂自动爬虫。

### 任务

- `source_config` 管理
- 手工粘贴 / 上传文本导入接口
- 最小定时采集器框架
- `collection_batch` 写入
- 去重逻辑
- 采集失败记录与重试

### 第一阶段推荐来源

- Google Alerts 导出内容
- 手工整理的链接 / 文本
- Product Hunt / Reddit / Hacker News 半自动导入
- 可结构化 RSS

### 完成标准

- 一批公开信号能稳定进入 `raw_signal`
- 能按批次查看采集和导入结果

## WP4：AI 清洗与问题聚类

### 目标

把噪音文本转成结构化问题，并形成可审查的问题簇。

### 任务

- 清洗 Prompt 执行器
- 结构化 JSON 校验
- 去重与噪音标记
- 聚类 Prompt 执行器
- 聚类结果入库
- 聚类与原始信号关联
- 失败重试机制

### 必须产出的能力

- `raw_signal -> cleaned_signal`
- `cleaned_signal -> problem_cluster`

### 完成标准

- 一批信号能自动产出一组问题簇
- 每个问题簇都能回溯原始信号
- 垃圾信号能被过滤

## WP5：机会摘要与评分引擎

### 目标

先形成 `opportunity_brief`，再通过可配置策略完成机会评分。

### 任务

- `problem_cluster -> opportunity_brief` 生成
- 证据整理逻辑
- 边界说明和信息缺口输出
- `scoring_profile` 配置能力
- 评分 Prompt / 评分引擎
- 分项评分写入
- 风险与未知项写入

### 第一阶段默认评分维度

- 需求强度
- 证据置信度
- 问题清晰度
- 战略匹配度
- 实现可行性
- 流量 / 分发潜力
- 结果可见性

### 完成标准

- 一个 `problem_cluster` 能产出一个 `opportunity_brief`
- 一个 `opportunity_brief` 能按不同策略产出 `opportunity`

## WP6：PRD 生成与双门禁

### 目标

把高价值机会转成“可评审 PRD 草案”，并保留人工门禁。

### 任务

- Gate 1 审查流程
- PRD 生成 Prompt
- `prd_draft` 版本化
- Gate 2 审查流程
- 打回重生成逻辑
- 审查结论写入审计记录

### 规则

- 没有 Gate 1 通过，不得生成 PRD
- 没有 Gate 2 审查，不得宣布 PRD 已通过

### 完成标准

- 一个高分机会能完整走完：评分 -> Gate 1 -> PRD 生成 -> Gate 2

## WP7：审计、追踪与回放

### 目标

确保任何结论都能回答“为什么”。

### 任务

- `workflow_run` 记录
- `prompt_execution` 记录
- `state_transition` 记录
- `audit_event` 记录
- 对象级追踪查询
- 执行失败日志

### 完成标准

- 任意核心对象都能向前追、向后查
- 不会出现结果有了但不知道怎么来的情况

## WP8：最小审核台 / 控制台

### 目标

提供一个不查数据库也能完成审查的最小控制台。

### 页面建议

- 信号列表页
- 问题簇列表页
- 机会摘要页
- 机会评分页
- PRD 审核页
- 审计追踪页

### 完成标准

- 产品经理可以直接在审核台完成审查与门禁决策

## 推荐开发顺序

### 第 1 批

- WP1 项目骨架与契约
- WP2 数据模型与存储
- WP3 信号采集与导入

### 第 2 批

- WP4 清洗与聚类
- WP5 机会摘要与评分

### 第 3 批

- WP6 PRD 生成与双门禁
- WP7 审计与回放

### 第 4 批

- WP8 最小审核台

## 第一阶段里程碑

### M1：信号进系统

- 公开信号入库
- 批次可追踪
- 去重可用

### M2：系统能理解问题

- 清洗完成
- 聚类完成
- `opportunity_brief` 可生成

### M3：系统能给出候选产品机会

- 评分跑通
- Gate 1 跑通
- PRD 草案跑通

### M4：系统能形成可审查闭环

- Gate 2 跑通
- 审计可查
- 最小审核台可用

## 第一阶段角色建议

- 产品 Owner：决定策略、评分导向、门禁标准
- 技术 Owner：决定服务边界、数据模型、执行链路
- AI Owner：负责 Prompt、结构化输出、重试策略
- 审查 Owner：负责 Gate 1 / Gate 2 执行标准
- 前端 Owner：负责最小审核台

## 管理建议

第一阶段不要追求炫技平台，而要证明一件事：

系统能否把外部噪音稳定转成“可审查的 PRD 草案”。

只要这条生产线跑通，第二阶段再考虑开发骨架、实现服务和控制台都来得及。
