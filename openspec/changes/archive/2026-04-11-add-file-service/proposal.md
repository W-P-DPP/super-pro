## Why

当前仓库已经有 `general-server`、`frontend-template` 和 `login-template`，但还没有一个面向本地工作目录的文件服务能力。用户希望在仓库根目录维护一个固定的 `file` 目录作为可见文件区，并维护一个固定的 `rubbish` 目录作为逻辑删除区，同时通过后端 API 完成文件树查询、文件夹创建、文件上传和软删除，并新增一个独立的前端工程 `file-server` 进行管理。

如果继续把这些操作分散成脚本或手工维护，会带来几个直接问题：

- 缺少统一的路径边界控制，容易出现越权访问或误操作非目标目录
- 删除行为不可追踪，无法保留原目录结构和删除批次
- 没有专门的前端入口，后续文件管理体验难以收敛
- 现有 monorepo 尚未纳入该文件服务前端工程

## What Changes

- 新增后端 `file` 业务模块，提供文件树查询、创建文件夹、上传文件、软删除能力
- 将仓库根目录下的 `file` 作为唯一可操作根目录，将 `rubbish` 作为软删除落点目录
- 所有新增、上传、删除、查询操作都基于文件系统完成，`v1` 不引入数据库
- 删除文件或文件夹时，不做物理删除，而是移动到 `rubbish/<timestamp>/原相对路径`
- 上传文件时拒绝覆盖同名文件；目标目录必须已经存在，且必须位于 `file` 根目录内
- 新增前端工程 `file-server`，并将其纳入现有 `pnpm workspace + turbo` monorepo 管理

## Capabilities

### New Capabilities

- `file-service-management`: 支持基于固定工作目录的文件树管理、文件上传、文件夹创建、软删除和独立前端管理入口

### Modified Capabilities

- 无

## Impact

- 影响后端代码：`general-server/src/file/*`、`general-server/src/index.ts`、相关测试文件
- 影响仓库目录：根目录新增或使用 `file/`、`rubbish/`、`file-server/`
- 影响工作区配置：`pnpm-workspace.yaml`、根 `package.json`、`turbo.json`
- 影响接口：新增 `GET /api/file/tree`、`POST /api/file/folder`、`POST /api/file/upload`、`DELETE /api/file`
- 影响数据策略：`v1` 不增加数据库表，文件系统即真实数据源
