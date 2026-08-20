# Docker Deployment

Docker deployment is **hand-maintained**（无生成器）。整个栈由 `docker/` 下两个被 git 跟踪的文件定义：

- `docker/compose.yml` —— 整个栈的唯一定义的 Compose 文件
- `docker/nginx/default.conf` —— 网关 nginx 反向代理配置

部署 wrapper `scripts/docker-compose-run.cjs` 只负责按环境设置变量（项目名、公开 HTTP 端口、运行时目录、宿主端口、`NODE_ENV`），并把 Compose 指向 `docker/compose.yml`。它**不会生成或修改任何文件**。

每个可部署项目拥有自己的真实 `Dockerfile`，构建为独立镜像。前端项目发布为独立的 nginx 静态文件容器；API 项目作为独立服务运行。网关 nginx 容器把所有路由反向代理到它们之上，对外只暴露一个公开端口：

```
PUBLIC_HTTP_PORT:9999 (唯一公开端口)
        │
   nginx 网关容器（纯反代，不含任何前端产物）
        │  前端：前缀剥离 proxy_pass（/admin/ → admin-front:80/）
        │  api：前缀透传 proxy_pass（/api/ → general-server:30010/api/）
   admin-front  front-public  login  file-server  resume-template  general-server
```

网关 nginx 使用官方 `nginx:1.27-alpine` 镜像；`docker/nginx/default.conf` 以只读方式挂载到 `/etc/nginx/conf.d/default.conf`。改路由只需改该文件后 `docker compose restart nginx`，无需重新构建镜像。

## Commands

```bash
pnpm docker:prod:deploy
pnpm docker:test:deploy
```

Jenkins 入口脚本：

```bat
jenkins-build-and-deploy-prod.bat
jenkins-build-and-deploy-test.bat
```

旧版 `jenkins-build-and-deploy.bat` 委托给生产脚本。

生产默认值（定义在 `scripts/docker-compose-run.cjs`）：

- compose 项目名：`super-pro-prod`
- HTTP 端口：`9999`
- MySQL 宿主端口：`13306`
- Redis 宿主端口：`16379`
- 运行时目录：`D:/super-pro_pro`
- API `NODE_ENV`：`production`

测试默认值：

- compose 项目名：`super-pro-test`
- HTTP 端口：`29999`
- MySQL 宿主端口：`23306`
- Redis 宿主端口：`26379`
- 运行时目录：`D:/super-pro_test`
- API `NODE_ENV`：`development`

wrapper 以 `docker compose -p <project>` 运行，使容器、网络和默认名称在两个环境之间相互隔离。需要时可用环境变量覆盖默认值：

```bash
PUBLIC_HTTP_PORT=19999 DOCKER_RUNTIME_DIR=D:/custom-runtime pnpm docker:test:deploy
```

当 `DOCKER_RUNTIME_DIR` 未设置时，`PROD_RUNTIME_DIR` 仍被 wrapper 兼容接受，但新脚本应使用 `DOCKER_RUNTIME_DIR`。

## 维护

直接编辑两个文件后重新执行部署命令：

- `docker/compose.yml` —— 服务、镜像/构建上下文、卷、端口、健康检查、`depends_on`、网络。
- `docker/nginx/default.conf` —— 路由表。新增路由/服务时，同步更新网关 `depends_on` 的健康门控与 nginx `location` 块。

运行时数据（MySQL 数据、Redis 数据、上传文件、nginx 日志、应用日志）存放在宿主运行时目录（`DOCKER_RUNTIME_DIR`）下，**不在仓库里**。`docker/runtime/` 为保留目录且被 git 忽略。

## Services

- `admin-front` -> `/admin/` 前端容器（nginx）
- `front-public` -> `/zwpsite/` 前端容器（nginx），根路径重定向
- `login` -> `/login/` 前端容器（nginx）
- `file-server` -> `/file-server/` 前端容器（nginx）
- `resume-template` -> `/resume/` 前端容器（nginx）
- `general-server` -> `/api/`、`/public/` API 反向代理
- `mysql`、`redis` —— 基础设施

## 添加项目

1. 在项目目录添加真实的 `Dockerfile`。前端镜像遵循 `admin-front/Dockerfile` 的多阶段模式：用 `VITE_APP_BASE_PATH='/<route>/' pnpm --filter <pkg> build` 构建，再用 `nginx:1.27-alpine` 运行时 `COPY` 一份 `docker/nginx-static.conf` 和 `dist`。
2. 在 `docker/compose.yml` 中添加服务（build context `..`，`dockerfile: <dir>/Dockerfile`），并在 `docker/nginx/default.conf` 中添加路由。
3. 重新执行部署命令。
