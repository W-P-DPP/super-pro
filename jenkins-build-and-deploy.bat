@echo off
setlocal EnableExtensions

set "SCRIPT_DIR=%~dp0"
call "%SCRIPT_DIR%jenkins-build-and-deploy-prod.bat"
exit /b %ERRORLEVEL%
