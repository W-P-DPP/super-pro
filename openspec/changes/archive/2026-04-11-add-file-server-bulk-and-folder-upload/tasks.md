## 1. Backend Batch Upload Support

- [x] 1.1 扩展 `general-server/src/file` 的上传 DTO、controller、service、repository，使 `/api/file/upload` 支持单文件兼容、批量文件上传和带相对路径的文件夹上传
- [x] 1.2 为批量/文件夹上传实现整批预检、批次内冲突检查、目标冲突检查和受控目录路径保护
- [x] 1.3 在目标目录已存在的前提下，为文件夹上传自动创建缺失的中间目录，并返回受控中文结果

## 2. Frontend Tree Upload Modes

- [x] 2.1 在 `file-server` 树工作区增加“批量文件上传”和“文件夹上传”入口，并保持现有单目录上下文
- [x] 2.2 调整前端上传提交流程，按后端契约构造 `files` 与 `relativePaths` 表单数据，并在上传后刷新树和保留目标目录焦点
- [x] 2.3 为批量/文件夹上传补充中文成功和失败反馈，确保 light/dark 主题下交互仍一致

## 3. Verification

- [x] 3.1 补充 `general-server` 单元与集成测试，覆盖批量文件上传、文件夹上传、整批冲突拒绝和路径越界拒绝
- [x] 3.2 运行 `general-server` 相关测试，修复回归后更新任务状态
- [x] 3.3 运行 `file-server` 的 `lint` 与 `build`，确认前端上传模式扩展未引入编译问题
