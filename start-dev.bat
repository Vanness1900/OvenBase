@echo off
REM ---------------------------------------------------------------
REM  OvenBase - start the local dev server
REM
REM  Double-click this file, then open http://localhost:3000
REM  Press Ctrl+C in this window to stop the server.
REM ---------------------------------------------------------------

cd /d "%~dp0"

REM Node is on the system PATH, but a terminal opened before Node was
REM installed won't have picked it up. Add it explicitly to be safe.
if exist "C:\Program Files\nodejs\npm.cmd" set "PATH=C:\Program Files\nodejs;%PATH%"

where npm >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Could not find npm. Install Node.js from https://nodejs.org
  echo   then run this file again.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo.
  echo   First run - installing dependencies. This takes a minute...
  echo.
  call npm install
  if errorlevel 1 (
    echo.
    echo   npm install failed.
    pause
    exit /b 1
  )
)

echo.
echo   Starting OvenBase...
echo   Open http://localhost:3000 in your browser.
echo   Press Ctrl+C to stop.
echo.

call npm run dev

echo.
echo   Server stopped.
pause
