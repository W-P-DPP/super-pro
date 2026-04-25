# 部署与运行检查

本文档说明当前 `super-pro` 仓库在 PM2 + nginx 部署下的后端运行检查方式，以及新增的服务健康检查约定。

## 部署结构

- 前端静态资源由 nginx 提供。
- Node 后端服务由 PM2 托管。
- 公网入口由 nginx 统一反向代理。
- `/live`、`/ready`、`/metrics` 作为后端服务的内部探针端点，默认不通过当前 nginx 公网入口暴露。

## 后端服务端口

生产和开发环境端口以各服务的 `.env.*` 为准，当前默认值如下：

| 服务 | 包名 | 默认端口 | 公网 API 入口 |
| --- | --- | --- | --- |
| general-server | `@super-pro/server` | `30010` | `/api/` |
| agent-server | `@super-pro/agent-server` | `30012` | `/agent-api/` |
| reimburse-server | `@super-pro/reimburse-server` | `30022` | `/reimburse-api/` |

说明：
- `main.ts` 的 fallback 端口应与 `.env.production` 一致。
- 部署时优先以 `.env.production` 中的 `PORT` 为准，不依赖 fallback。

## 健康检查端点

每个后端服务都提供以下内部端点：

- `/live`
  用于确认进程存活。只要进程仍在运行且未进入 `stopped/failed`，通常返回 `200`。
- `/ready`
  用于确认实例是否可接收新流量。只有运行时状态为 `ready` 且必需依赖探针成功时返回 `200`。
- `/metrics`
  返回文本格式的基础运行指标，包括请求量、请求耗时、进程 uptime、依赖可用性等。

## 推荐检查方式

### 1. 本机直接探测

在部署机器上执行：

```powershell
curl http://127.0.0.1:30010/live
curl http://127.0.0.1:30010/ready
curl http://127.0.0.1:30010/metrics

curl http://127.0.0.1:30012/live
curl http://127.0.0.1:30012/ready

curl http://127.0.0.1:30022/live
curl http://127.0.0.1:30022/ready
```

### 2. PM2 reload 后核验

每次执行 `pm2 startOrReload ecosystem.config.cjs --update-env` 后，至少检查：

```powershell
curl http://127.0.0.1:30010/ready
curl http://127.0.0.1:30012/ready
curl http://127.0.0.1:30022/ready
```

期望：
- 返回 `200`
- `state` 为 `ready`
- `checks` 中的必需依赖为 `ok: true`

### 3. 关停行为确认

当 PM2 对服务执行 reload 或 restart 时，服务会先进入 `draining`：

- `/ready` 应先变为 `503`
- 在途请求清理后再关闭 Redis / DB 等资源

如果需要手动验证，可在 reload 期间快速轮询：

```powershell
while ($true) { curl http://127.0.0.1:30010/ready; Start-Sleep -Milliseconds 500 }
```

## PM2 约定

当前 PM2 配置由 `ecosystem.config.cjs` + `scripts/workspace-deploy.cjs` 动态生成。

后端服务统一采用：

- `exec_mode: fork`
- `autorestart: true`
- `watch: false`
- `kill_timeout: 20000`

`kill_timeout: 20000` 的目的：
- 给 shared runtime 的 graceful shutdown 留出足够窗口
- 允许服务先进入 `draining`
- 允许 batched side effects、Redis、DataSource 等资源完成关闭

如果后续某个服务需要更长关停时间，可以通过对应包的 `package.json -> superPro.deploy.killTimeoutMs` 覆盖默认值。

## nginx 约定

当前 `nginx.production.conf` 仅代理公网业务入口：

- `/api/` -> `general-server`
- `/agent-api/` -> `agent-server`
- `/reimburse-api/` -> `reimburse-server`

当前不通过 nginx 暴露：

- `/live`
- `/ready`
- `/metrics`

这意味着：
- 健康检查和指标采集默认走宿主机本地端口
- 如果以后要接入外部探针，应显式新增受控代理规则，而不是直接把 `/metrics` 暴露到公网

## 发布后最小核验清单

```text
[ ] pm2 startOrReload 成功
[ ] pm2 save 成功
[ ] general-server /ready = 200
[ ] agent-server /ready = 200
[ ] reimburse-server /ready = 200
[ ] general-server /metrics 可返回文本指标
[ ] nginx -t 成功
[ ] 公网业务入口仍然可访问
```

## 故障排查建议

- `/live` 失败：
  说明进程已退出或进入 fatal 状态，优先看 PM2 状态和服务日志。
- `/ready` 失败但 `/live` 正常：
  说明进程还活着，但依赖探针失败或实例正在 `draining`。
- `/metrics` 无法访问：
  优先检查服务是否已启动、端口是否正确、是否误通过 nginx 访问了内部探针路径。
