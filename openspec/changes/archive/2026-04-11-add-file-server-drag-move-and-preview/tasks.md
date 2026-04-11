## 1. Backend File Move And Preview Foundations

- [x] 1.1 扩展 `general-server/src/file` 的 DTO、controller、service、repository，新增受控移动接口并支持文件/文件夹移动到目标文件夹
- [x] 1.2 为移动能力补充目标校验，覆盖根目录保护、路径越界、自身/子孙目录移动拒绝、目标目录校验和同名冲突拒绝
- [x] 1.3 为文件预览补充受控读取能力或受控预览访问路径，支持在 `file` 根目录内读取预览文件内容

## 2. file-server Tree Drag And Preview Workspace

- [x] 2.1 在 `file-server` 树工作区增加文件与文件夹拖动能力，支持拖入目标文件夹并提供有效/无效放置反馈
- [x] 2.2 将右侧内容区从占位区升级为预览区，并根据当前选中节点渲染文件预览或文件夹上下文状态
- [x] 2.3 为 `md`、`pdf`、图片、音视频、`docx`、`xlsx/xls` 等支持类型补充受控预览策略，并为不支持或失败场景提供中文提示

## 3. Verification

- [x] 3.1 补充 `general-server` 单元与集成测试，覆盖移动成功、非法移动拒绝、目标冲突拒绝和预览访问路径保护
- [x] 3.2 补充 `file-server` 交互验证，覆盖拖动移动、刷新后的树状态、预览切换和失败提示
- [x] 3.3 运行 `general-server` 相关测试以及 `file-server` 的 `lint`/`build`，确认拖动与预览扩展未引入回归
