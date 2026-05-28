@echo off
setlocal

cd /d "%~dp0"
set "URL=http://127.0.0.1:3000/"

powershell -NoProfile -Command "try { $c = New-Object Net.Sockets.TcpClient('127.0.0.1', 3000); $c.Close(); exit 0 } catch { exit 1 }" >nul 2>nul
if %ERRORLEVEL% EQU 0 (
  echo 面板已经在运行，正在打开浏览器...
  start "" "%URL%"
  exit /b 0
)

echo 正在启动作品采集面板（本机模式）...
echo 打开后请不要关闭这个窗口；关闭窗口或按 Ctrl+C 会停止面板。
echo 本机访问地址：%URL%
echo.

start "" powershell -NoProfile -Command "Start-Sleep -Seconds 2; Start-Process '%URL%'"
npm run ui
