@echo off
rem Study Vault — rebuild the vault from every notes file in the "sources" folder.
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required to build the vault: https://nodejs.org
  pause
  exit /b 1
)
node tools\build.mjs
echo.
pause
