## Why

当前 `file-server` 的上传链路在 macOS 浏览器上传中文文件名时会出现乱码，导致服务端落盘名称与用户原始文件名不一致。这会直接破坏文件可识别性，也会让同名校验、后续下载和目录浏览行为变得不可靠，因此需要尽快把上传文件名处理改为跨平台一致。

## What Changes

- 调整 `POST /api/file/upload` 的文件名解析逻辑，兼容 macOS 浏览器通过 multipart 上传时可能出现的非 UTF-8 文件名编码。
- 统一服务端在保存上传文件前的文件名标准化流程，保证合法校验、冲突检测和最终落盘使用同一份已解码文件名。
- 为中文文件名上传补充后端测试，覆盖 macOS 上传场景和现有普通上传场景，避免回归。

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `file-service-management`: 调整文件上传 requirement，要求系统在跨平台 multipart 上传场景下保留用户原始文件名，避免中文名乱码后再保存或参与冲突校验。

## Impact

- 影响后端文件上传链路：`general-server/src/file/file.router.ts`、`general-server/src/file/file.controller.ts`、`general-server/src/file/file.service.ts`
- 影响测试：`general-server/__tests__/unit/file.service.test.ts`、`general-server/__tests__/integration/file.api.test.ts`
- 不新增接口路径，不改变 `file-server` 前端上传入口，但会改变上传成功后的服务端文件命名结果
