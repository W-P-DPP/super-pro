## 1. Upload Filename Normalization

- [x] 1.1 在 `general-server/src/file` 上传链路中新增统一的文件名标准化逻辑，兼容 macOS 中文文件名乱码场景并保留现有正常文件名
- [x] 1.2 让 `file.controller.ts` 到 `file.service.ts` 再到 `file.repository.ts` 全链路都使用规范化后的文件名进行校验、冲突检测和落盘
- [x] 1.3 保持现有 `POST /api/file/upload` 接口协议与中文错误响应不变，确认异常回退仍受控

## 2. Regression Coverage

- [x] 2.1 在 `general-server/__tests__/unit/file.service.test.ts` 增加文件名标准化相关用例，覆盖正常文件名与乱码恢复场景
- [x] 2.2 在 `general-server/__tests__/integration/file.api.test.ts` 增加上传接口用例，验证 macOS 中文文件名上传后响应和实际落盘名称一致
- [x] 2.3 运行 `general-server` 相关单元与集成测试，修复回归后再更新任务状态
