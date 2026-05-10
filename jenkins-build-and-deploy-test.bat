@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "SCRIPT_DIR=%~dp0"
if "%SCRIPT_DIR:~-1%"=="\" set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"
set "REPO_DIR=%SCRIPT_DIR%"

set "COMPOSE_FILE=%REPO_DIR%\docker\docker-compose.test.yml"

if not "%~1"=="" set "COMPOSE_FILE=%~1"
for %%I in ("%COMPOSE_FILE%") do set "COMPOSE_FILE=%%~fI"

echo [INFO] Repo dir          : %REPO_DIR%
echo [INFO] Compose file      : %COMPOSE_FILE%
if defined TEST_RUNTIME_DIR (
  echo [INFO] Runtime dir      : %TEST_RUNTIME_DIR%
) else (
  echo [INFO] Runtime dir      : D:/super-pro_test ^(docker compose default^)
)
if defined TEST_DOCKER_HTTP_PORT (
  echo [INFO] HTTP port        : %TEST_DOCKER_HTTP_PORT%
) else (
  echo [INFO] HTTP port        : 29999 ^(docker compose default^)
)
if defined TEST_MYSQL_PORT (
  echo [INFO] MySQL port       : %TEST_MYSQL_PORT%
) else (
  echo [INFO] MySQL port       : 23306 ^(docker compose default^)
)
if defined TEST_REDIS_PORT (
  echo [INFO] Redis port       : %TEST_REDIS_PORT%
) else (
  echo [INFO] Redis port       : 26379 ^(docker compose default^)
)
echo.

if not exist "%COMPOSE_FILE%" (
  echo [ERROR] File not found: %COMPOSE_FILE%
  exit /b 1
)

pushd "%REPO_DIR%" >nul

echo [INFO] Starting test deployment...
docker compose -f "%COMPOSE_FILE%" up -d --build --remove-orphans
if errorlevel 1 (
  popd >nul
  echo [ERROR] Docker test deployment failed.
  exit /b 1
)

echo [INFO] Current service status:
docker compose -f "%COMPOSE_FILE%" ps
set "EXIT_CODE=%ERRORLEVEL%"

popd >nul
exit /b %EXIT_CODE%
