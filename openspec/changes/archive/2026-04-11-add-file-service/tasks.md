## 1. 变更准备

- [x] 1.1 确认文件服务能力边界、固定根目录约束和前端工程范围
- [x] 1.2 为文件服务补齐 proposal、design、spec 所需上下文并确认接口命名

## 2. 后端 file 模块实现

- [x] 2.1 新增 `general-server/src/file` 业务模块，并按现有分层补齐 `dto`、`controller`、`service`、`repository`、`router`
- [x] 2.2 实现固定 `file`/`rubbish` 根目录解析与路径越界保护，确保所有操作都限定在 `file` 根目录内
- [x] 2.3 实现 `GET /api/file/tree`，以树结构返回 `file` 根目录内容
- [x] 2.4 实现 `POST /api/file/folder`，支持在指定父目录下新建文件夹，并拒绝同名冲突
- [x] 2.5 实现 `POST /api/file/upload`，支持上传单文件到指定目录，并拒绝覆盖同名目标
- [x] 2.6 实现 `DELETE /api/file`，将目标文件或文件夹移动到 `rubbish/<timestamp>/原相对路径`
- [x] 2.7 在 `general-server/src/index.ts` 中挂载 `file` 业务路由，并保持现有路由风格一致

## 3. 后端验证

- [x] 3.1 补充单元测试，覆盖路径越界、同名冲突、目录不存在、删除根目录受限等错误场景
- [x] 3.2 补充集成测试，覆盖查询树、创建文件夹、上传文件、软删除成功链路
- [x] 3.3 运行后端测试并修复回归

## 4. 前端 file-server 工程

- [x] 4.1 在仓库根目录新增 `file-server` 前端工程，并纳入 `pnpm-workspace.yaml`
- [x] 4.2 更新根 `package.json` 与 `turbo.json`，让 `file-server` 参与 monorepo 开发与构建流程
- [x] 4.3 实现最小可用文件管理页面，包含目录树、当前目录内容、上传、新建文件夹、删除入口
- [x] 4.4 对接后端文件服务接口，并补齐基础交互反馈与错误提示

## 5. 联调与验收

- [x] 5.1 验证 `file` 目录树与前端展示一致
- [x] 5.2 验证删除后内容进入 `rubbish` 且保留时间分桶与原目录结构
- [x] 5.3 验证同名上传被拒绝，且不会覆盖已有内容
