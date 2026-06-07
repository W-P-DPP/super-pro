---
name: git-commit-convention
description: 为这个 monorepo 生成、检查和规范化符合 Conventional Commits 的 Git 提交信息。适用于用户要求生成 commit message、检查提交信息是否符合仓库规范、根据 staged 变更总结一个或多个提交，或判断正确的 type、scope、subject 与 BREAKING CHANGE 说明时。
---

# Git 提交规范

按下面的流程产出与仓库规范和真实代码变更一致的提交信息。

## 快速开始

1. 先读取仓库根目录 `README.md` 中的 `Git Commit Convention` 章节。
2. 如果该章节缺失或不完整，读取 [references/convention.md](references/convention.md)。
3. 在起草提交信息前先检查当前变更。
4. 输出与真实变更集一致的 Conventional Commit。

## 检查变更

不要猜测，优先依据仓库里的真实证据。

- 用 `git status --short` 查看 staged 和 unstaged 文件。
- 当用户正在准备提交时，优先查看 `git diff --staged --stat` 和 `git diff --staged`。
- 如果没有 staged 内容，查看 `git diff --stat` 和 `git diff`，并明确说明当前提交信息基于未暂存变更推断。
- 根据受影响的包、服务或共享区域判断 `scope`。
- 如果一份 diff 明显包含多个无关目的，建议拆成多个提交，并分别起草提交信息。

## 生成提交信息

使用以下格式：

```text
<type>(<scope>): <subject>
```

遵守以下规则：

- 一个提交只表达一个清晰目的。
- `subject` 保持简短、具体、面向结果。
- `subject` 结尾不要加句号。
- 在这个仓库里，除非用户明确要求英文，否则默认使用简洁的简体中文 `subject`。
- 代码标识符、路径、API 名称和包名保持原样。
- 变更跨多个包且没有更合适的公共范围时，使用 `repo`。
- 主要变更位于共享包或共享基础设施时，使用 `shared`。

## 选择 Type 和 Scope

仓库特定的映射规则以 [references/convention.md](references/convention.md) 为准。

选择规则：

- 新增对用户或 API 可见的能力时，使用 `feat`。
- 修复缺陷或纠正错误行为时，使用 `fix`。
- 仅修改文档时，使用 `docs`。
- 只做结构调整且不打算改变行为时，使用 `refactor`。
- 仅新增或调整测试时，使用 `test`。
- 仅做格式化或无功能影响的样式改动时，使用 `style`。
- 明确的性能优化时，使用 `perf`。
- 构建系统、依赖或打包流程变更时，使用 `build`。
- CI/CD 流程变更时，使用 `ci`。
- 其余维护性工作使用 `chore`。
- 只有在回滚历史提交时才使用 `revert`。

## 处理破坏性变更

如果变更不兼容，使用以下任一形式：

```text
feat(scope)!: <subject>
```

或添加 footer：

```text
BREAKING CHANGE: <what changed and what callers must update>
```

出现破坏性变更时：

- 明确写出变化的契约是什么。
- 指出受影响的 API、命令、配置或数据结构。
- 不要使用“重大调整”“一些修改”这类模糊表达。

## 输出方式

按用户请求返回最小但足够有用的结果。

- 如果用户只要一条提交信息，直接返回一条可用结果。
- 如果变更应拆分提交，按提交顺序返回一个简短候选列表。
- 如果用户要求检查，明确说明是否合规，并指出具体问题。
- 没有 diff 证据时，不要声称某些文件或行为发生了变化。

## 示例

```text
feat(agent-front): 新增会话列表筛选
fix(agent-server): 修复 token 续期失败问题
docs(repo): 补充部署说明
refactor(shared): 拆分日志工具
chore(scripts): 调整构建脚本
feat(general-server)!: 调整鉴权响应结构

BREAKING CHANGE: /auth/profile 返回字段从 userInfo 改为 user
```
