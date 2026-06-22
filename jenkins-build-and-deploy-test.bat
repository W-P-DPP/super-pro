@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "SCRIPT_DIR=%~dp0"
if "%SCRIPT_DIR:~-1%"=="\" set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"
set "REPO_DIR=%SCRIPT_DIR%"

set "COMPOSE_PROJECT_NAME=super-pro-test"
set "PUBLIC_HTTP_PORT=29999"
set "DOCKER_RUNTIME_DIR=D:/super-pro_test"
set "MYSQL_HOST_PORT=23306"
set "REDIS_HOST_PORT=26379"
set "APP_NODE_ENV=development"

echo [INFO] Jenkins deploy environment : test
echo [INFO] Repo dir                   : %REPO_DIR%
echo [INFO] Compose file               : %REPO_DIR%\docker\.generated\docker-compose.yml
echo [INFO] Compose project            : %COMPOSE_PROJECT_NAME%
echo [INFO] HTTP port                  : %PUBLIC_HTTP_PORT%
echo [INFO] Runtime dir                : %DOCKER_RUNTIME_DIR%
echo [INFO] MySQL host port            : %MYSQL_HOST_PORT%
echo [INFO] Redis host port            : %REDIS_HOST_PORT%
echo [INFO] App NODE_ENV               : %APP_NODE_ENV%
echo.

pushd "%REPO_DIR%" >nul

echo [INFO] Starting test docker compose deployment...
call pnpm docker:test:deploy
if errorlevel 1 (
  popd >nul
  echo [ERROR] Test Docker deployment failed.
  exit /b 1
)

echo [INFO] Current test service status:
node scripts/docker-compose-run.cjs test ps
set "EXIT_CODE=%ERRORLEVEL%"

popd >nul
exit /b %EXIT_CODE%
