## Why

当前 `file-server` 只能一次上传单个文件，无法直接上传一批文件，也无法保留目录结构地上传整个文件夹。这让常见的素材导入、文档目录同步和本地目录迁移都需要重复操作，效率过低，也与文件管理工具的基本预期不一致。

## What Changes

- 扩展 `POST /api/file/upload`，让文件服务支持一次上传多个文件。
- 让文件服务支持按客户端提供的相对路径重建文件夹结构，实现整个文件夹上传。
- 保持现有受控目录边界与冲突保护，并将其扩展到批量/文件夹上传场景。
- 更新 `file-server` 树工作区交互，提供批量文件上传和文件夹上传入口，并回显整批结果。
- 为批量上传、文件夹上传、冲突拒绝和路径保护补充后端与前端回归测试。

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `file-service-management`: 调整文件上传 requirement，使系统支持批量文件上传、保留相对路径的文件夹上传，以及整批冲突校验与受控目录保护。
- `file-server-tree-workspace`: 调整树工作区上传 requirement，使用户可以从树工作区发起批量文件上传和文件夹上传，而不再局限于单文件上传。

## Impact

- 影响后端文件模块：`general-server/src/file/*`
- 影响后端测试：`general-server/__tests__/unit/file.service.test.ts`、`general-server/__tests__/integration/file.api.test.ts`
- 影响前端文件管理界面：`file-server/src/App.tsx`
- 不新增业务域，不新增新的上传路由，但会扩展现有 `/api/file/upload` 的 multipart 处理能力和前端上传交互
