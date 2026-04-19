@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "SCRIPT_DIR=%~dp0"
if "%SCRIPT_DIR:~-1%"=="\" set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"
set "REPO_DIR=%SCRIPT_DIR%"

set "PNPM_CMD=pnpm"
set "PM2_CMD=pm2"

set "NGINX_EXE=D:\Programs\nginx-1.26.3\nginx.exe"
set "NGINX_DIR=D:\Programs\nginx-1.26.3"
set "NGINX_CONF=%REPO_DIR%\nginx.production.conf"
set "NGINX_HTML_ROOT=%NGINX_DIR%\html"

if not "%~1"=="" set "NGINX_HTML_ROOT=%~1"
if not "%~2"=="" set "NGINX_CONF=%~2"

set "PM2_ECOSYSTEM=%REPO_DIR%\ecosystem.config.cjs"

echo [INFO] Repo dir        : %REPO_DIR%
echo [INFO] Nginx html root : %NGINX_HTML_ROOT%
echo [INFO] Nginx config    : %NGINX_CONF%
echo [INFO] PM2 ecosystem   : %PM2_ECOSYSTEM%
echo.

call :ensure_command "%PNPM_CMD%" "pnpm"
if errorlevel 1 exit /b 1

call :ensure_command "%PM2_CMD%" "pm2"
if errorlevel 1 exit /b 1

call :ensure_file "%NGINX_EXE%"
if errorlevel 1 exit /b 1

call :ensure_file "%NGINX_CONF%"
if errorlevel 1 exit /b 1

call :ensure_file "%PM2_ECOSYSTEM%"
if errorlevel 1 exit /b 1

call :ensure_dir "%NGINX_HTML_ROOT%"
if errorlevel 1 exit /b 1

echo [STEP 1/5] Build frontend apps
call :build_package "@super-pro/frontend"
if errorlevel 1 exit /b 1
call :build_package "@super-pro/login-template"
if errorlevel 1 exit /b 1
call :build_package "@super-pro/agent-front"
if errorlevel 1 exit /b 1
call :build_package "@super-pro/reimburse-front"
if errorlevel 1 exit /b 1
call :build_package "@super-pro/summary-front"
if errorlevel 1 exit /b 1
call :build_package "@super-pro/resume-template"
if errorlevel 1 exit /b 1
call :build_package "@super-pro/file-server"
if errorlevel 1 exit /b 1
echo.

echo [STEP 2/5] Sync frontend bundles to nginx html
call :sync_dist "frontend-template" "zwpsite"
if errorlevel 1 exit /b 1
call :sync_dist "login-template" "login"
if errorlevel 1 exit /b 1
call :sync_dist "agent-front" "agent"
if errorlevel 1 exit /b 1
call :sync_dist "reimburse-front" "reimburse"
if errorlevel 1 exit /b 1
call :sync_dist "summary-front" "summary-front"
if errorlevel 1 exit /b 1
call :sync_dist "resume-template" "resume"
if errorlevel 1 exit /b 1
call :sync_dist "file-server" "file-server"
if errorlevel 1 exit /b 1
echo.

echo [STEP 3/5] Build backend services
call :build_package "@super-pro/server"
if errorlevel 1 exit /b 1
call :build_package "@super-pro/agent-server"
if errorlevel 1 exit /b 1
call :build_package "@super-pro/reimburse-server"
if errorlevel 1 exit /b 1
echo.

echo [STEP 4/5] Reload backend services with PM2
pushd "%REPO_DIR%" >nul
call %PM2_CMD% startOrReload "%PM2_ECOSYSTEM%" --update-env
set "PM2_EXIT=!ERRORLEVEL!"
popd >nul
if !PM2_EXIT! NEQ 0 (
  echo [ERROR] PM2 startOrReload failed with exit code !PM2_EXIT!
  exit /b !PM2_EXIT!
)
echo [OK] PM2 services reloaded.
call %PM2_CMD% save >nul
echo.

echo [STEP 5/5] Restart nginx
call :restart_nginx
if errorlevel 1 exit /b 1
echo.

echo [OK] Jenkins build and deploy completed successfully.
exit /b 0

:build_package
set "PACKAGE_NAME=%~1"
echo   [BUILD] %PACKAGE_NAME%
call %PNPM_CMD% --dir "%REPO_DIR%" --filter %PACKAGE_NAME% build
if errorlevel 1 (
  echo [ERROR] Build failed: %PACKAGE_NAME%
  exit /b 1
)
exit /b 0

:sync_dist
set "PACKAGE_DIR=%~1"
set "TARGET_SUBDIR=%~2"
set "SOURCE_DIR=%REPO_DIR%\%PACKAGE_DIR%\dist"
set "TARGET_DIR=%NGINX_HTML_ROOT%\%TARGET_SUBDIR%"

call :ensure_dir "%TARGET_DIR%"
if errorlevel 1 exit /b 1

if not exist "%SOURCE_DIR%" (
  echo [ERROR] Dist folder not found: %SOURCE_DIR%
  exit /b 1
)

echo   [SYNC ] %PACKAGE_DIR%\dist ^> %TARGET_SUBDIR%
robocopy "%SOURCE_DIR%" "%TARGET_DIR%" /MIR /R:2 /W:1 /NFL /NDL /NJH /NJS /NP >nul
set "ROBOCOPY_EXIT=!ERRORLEVEL!"
if !ROBOCOPY_EXIT! GEQ 8 (
  echo [ERROR] robocopy failed for %PACKAGE_DIR% with exit code !ROBOCOPY_EXIT!
  exit /b !ROBOCOPY_EXIT!
)
exit /b 0

:restart_nginx
echo   [NGINX] Stop old nginx processes
taskkill /F /IM nginx.exe >nul 2>&1

echo   [NGINX] Wait for process cleanup
timeout /t 2 /nobreak >nul

echo   [NGINX] Validate config
"%NGINX_EXE%" -t -p "%NGINX_DIR%" -c "%NGINX_CONF%"
if errorlevel 1 (
  echo [ERROR] nginx config validation failed.
  exit /b 1
)

echo   [NGINX] Start nginx
start "nginx" /D "%NGINX_DIR%" "%NGINX_EXE%" -p "%NGINX_DIR%" -c "%NGINX_CONF%"
if errorlevel 1 (
  echo [ERROR] nginx failed to start.
  exit /b 1
)

echo [OK] nginx restarted successfully.
exit /b 0

:ensure_command
set "COMMAND_NAME=%~1"
set "DISPLAY_NAME=%~2"
where %COMMAND_NAME% >nul 2>&1
if errorlevel 1 (
  echo [ERROR] %DISPLAY_NAME% command not found in PATH.
  exit /b 1
)
exit /b 0

:ensure_file
set "FILE_PATH=%~1"
if not exist "%FILE_PATH%" (
  echo [ERROR] File not found: %FILE_PATH%
  exit /b 1
)
exit /b 0

:ensure_dir
set "DIR_PATH=%~1"
if exist "%DIR_PATH%" exit /b 0

mkdir "%DIR_PATH%" >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Failed to create directory: %DIR_PATH%
  exit /b 1
)
exit /b 0
