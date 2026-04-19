@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "SCRIPT_DIR=%~dp0"
if "%SCRIPT_DIR:~-1%"=="\" set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"
set "REPO_DIR=%SCRIPT_DIR%"

rem Default nginx install path. Override by passing the target root as arg1.
set "NGINX_DIR=D:\Programs\nginx-1.26.3"
set "DEPLOY_ROOT=%NGINX_DIR%\html"

if not "%~1"=="" (
  set "DEPLOY_ROOT=%~1"
)

set "PNPM_CMD=pnpm"

echo [INFO] Repo dir   : %REPO_DIR%
echo [INFO] Deploy root: %DEPLOY_ROOT%
echo.

call :ensure_dir "%DEPLOY_ROOT%"
if errorlevel 1 exit /b 1

call :build_and_sync "frontend-template" "@super-pro/frontend" "zwpsite"
if errorlevel 1 exit /b 1

call :build_and_sync "login-template" "@super-pro/login-template" "login"
if errorlevel 1 exit /b 1

call :build_and_sync "agent-front" "@super-pro/agent-front" "agent"
if errorlevel 1 exit /b 1

call :build_and_sync "reimburse-front" "@super-pro/reimburse-front" "reimburse"
if errorlevel 1 exit /b 1

call :build_and_sync "summary-front" "@super-pro/summary-front" "summary-front"
if errorlevel 1 exit /b 1

call :build_and_sync "resume-template" "@super-pro/resume-template" "resume"
if errorlevel 1 exit /b 1

call :build_and_sync "file-server" "@super-pro/file-server" "file-server"
if errorlevel 1 exit /b 1

echo.
echo [OK] All frontend bundles were deployed to nginx successfully.
exit /b 0

:build_and_sync
set "PACKAGE_DIR=%~1"
set "PACKAGE_NAME=%~2"
set "TARGET_SUBDIR=%~3"
set "SOURCE_DIR=%REPO_DIR%\%PACKAGE_DIR%\dist"
set "TARGET_DIR=%DEPLOY_ROOT%\%TARGET_SUBDIR%"

echo [BUILD] %PACKAGE_NAME%
call %PNPM_CMD% --dir "%REPO_DIR%" --filter %PACKAGE_NAME% build
if errorlevel 1 (
  echo [ERROR] Build failed: %PACKAGE_NAME%
  exit /b 1
)

if not exist "%SOURCE_DIR%" (
  echo [ERROR] Dist folder not found: %SOURCE_DIR%
  exit /b 1
)

call :ensure_dir "%TARGET_DIR%"
if errorlevel 1 exit /b 1

echo [SYNC ] %SOURCE_DIR% ^> %TARGET_DIR%
robocopy "%SOURCE_DIR%" "%TARGET_DIR%" /MIR /R:2 /W:1 /NFL /NDL /NJH /NJS /NP >nul
set "ROBOCOPY_EXIT=!ERRORLEVEL!"
if !ROBOCOPY_EXIT! GEQ 8 (
  echo [ERROR] robocopy failed for %PACKAGE_NAME% with exit code !ROBOCOPY_EXIT!
  exit /b !ROBOCOPY_EXIT!
)

echo [DONE ] %PACKAGE_NAME%
echo.
exit /b 0

:ensure_dir
set "DIR_TO_CREATE=%~1"
if exist "%DIR_TO_CREATE%" exit /b 0

mkdir "%DIR_TO_CREATE%" >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Failed to create directory: %DIR_TO_CREATE%
  exit /b 1
)
exit /b 0
