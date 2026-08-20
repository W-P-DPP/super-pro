#!/usr/bin/env bash
set -euo pipefail

# 脚本所在目录（仓库根目录）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="${SCRIPT_DIR}"

# ===== 测试环境部署配置（与 jenkins-build-and-deploy-test.bat 保持一致）=====
COMPOSE_PROJECT_NAME="super-pro-test"
PUBLIC_HTTP_PORT="29999"
# 宿主机数据目录：原 Windows 脚本为 D:/super-pro_test，Linux 下请按实际部署路径修改
DOCKER_RUNTIME_DIR="/data/super-pro_test"
MYSQL_HOST_PORT="23306"
REDIS_HOST_PORT="26379"
APP_NODE_ENV="development"

# 这些变量必须 export，docker-compose-run.cjs 通过 process.env 读取
export COMPOSE_PROJECT_NAME
export PUBLIC_HTTP_PORT
export DOCKER_RUNTIME_DIR
export MYSQL_HOST_PORT
export REDIS_HOST_PORT
export APP_NODE_ENV

echo "[INFO] Jenkins deploy environment : test"
echo "[INFO] Repo dir                   : ${REPO_DIR}"
echo "[INFO] Compose file               : ${REPO_DIR}/docker/compose.yml"
echo "[INFO] Compose project            : ${COMPOSE_PROJECT_NAME}"
echo "[INFO] HTTP port                  : ${PUBLIC_HTTP_PORT}"
echo "[INFO] Runtime dir                : ${DOCKER_RUNTIME_DIR}"
echo "[INFO] MySQL host port            : ${MYSQL_HOST_PORT}"
echo "[INFO] Redis host port            : ${REDIS_HOST_PORT}"
echo "[INFO] App NODE_ENV               : ${APP_NODE_ENV}"
echo ""

cd "${REPO_DIR}"

echo "[INFO] Starting test docker compose deployment..."
if ! pnpm docker:test:deploy; then
  echo "[ERROR] Test Docker deployment failed." >&2
  exit 1
fi

# 原脚本以该命令的退出码作为整体退出码；失败时 set -e 同样会以对应码退出
echo "[INFO] Current test service status:"
node scripts/docker-compose-run.cjs test ps
