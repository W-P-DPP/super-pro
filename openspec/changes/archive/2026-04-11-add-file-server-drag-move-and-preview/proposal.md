## Why

`file-server` 目前已经能完成基础树形管理和上传，但用户仍然缺少两个高频能力：其一，无法直接通过拖动调整文件与文件夹的归属位置；其二，右侧内容区仍是占位态，无法用于查看常见文件内容。随着文件量和类型增加，这两个缺口已经开始影响日常整理和核对效率。

## What Changes

- 为 `file-server` 树工作区增加拖动移动能力，支持将文件或文件夹拖动到其他文件夹下。
- 为拖动移动补充受控校验与后端移动接口，继续限制在仓库根 `file` 目录内操作，并拒绝目标冲突、非法目标和路径越界。
- 将 `file-server` 右侧内容区从占位区升级为文件预览区，支持基于所选节点预览常见文件内容。
- 为内容区补充多类型预览能力，覆盖 `md`、`pdf`、音视频、图片，以及 `excel`、`docx` 等常见办公文件的可控预览体验。
- 为树节点与内容区补充拖动反馈、选中联动、加载态、失败态和不支持预览时的受控提示。

## Capabilities

### New Capabilities
- `file-preview-workspace`: 定义 `file-server` 内容区中的文件预览行为、支持类型、回退策略和交互反馈。

### Modified Capabilities
- `file-server-tree-workspace`: 扩展树工作区要求，增加文件与文件夹拖动、放置目标反馈、拖动后刷新与选中联动。
- `file-service-management`: 扩展文件服务要求，增加受控的移动能力，用于支撑树中的拖动移动操作。

## Impact

- 前端：`file-server/src/App.tsx` 及其内容区、树节点交互、拖动状态、预览渲染逻辑。
- 后端：`general-server/src/file` 模块需要新增移动接口、移动校验和可供预览的文件读取能力或受控静态访问路径。
- 规格：新增 `file-preview-workspace`，并修改 `file-server-tree-workspace` 与 `file-service-management`。
- 依赖与实现：可能引入办公文档和 Markdown 预览所需的前端解析或嵌入方案，并增加相应测试覆盖。
