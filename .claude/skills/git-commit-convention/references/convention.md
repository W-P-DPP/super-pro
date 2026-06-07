# 仓库提交规范

## 格式

使用：

```text
<type>(<scope>): <subject>
```

## 推荐 Type

- `feat`: 新功能
- `fix`: 缺陷修复
- `docs`: 仅文档变更
- `refactor`: 不改变既有行为的重构
- `test`: 新增或调整测试
- `style`: 仅格式或无功能影响的样式修改
- `perf`: 性能优化
- `build`: 构建系统或依赖变更
- `ci`: CI/CD 流程变更
- `chore`: 其他维护性修改
- `revert`: 回滚历史提交

## 推荐 Scope

- `repo`: repository-level changes
- `agent-front`
- `agent-server`
- `reimburse-front`
- `reimburse-server`
- `frontend-template`
- `login-template`
- `general-server`
- `shared`
- `docs`
- `scripts`

## 规则

- 一个提交只聚焦一个清晰改动。
- `subject` 保持简短具体。
- `subject` 结尾不要加句号。
- 多个包一起改动时，优先使用 `repo` 或 `shared`。
- 不兼容变更使用 `type(scope)!`，或补充 `BREAKING CHANGE:` footer。
- 在这个仓库里，除非用户明确要求英文，否则 `subject` 默认使用简洁的简体中文。

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
