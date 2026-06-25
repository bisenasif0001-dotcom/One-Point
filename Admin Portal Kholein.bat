@echo off
title One Point - Admin Portal
color 0A
echo ============================================
echo   One Point Digital Services
echo   Admin Portal Starting...
echo ============================================
echo.

cd /d "%~dp0"
set "ADMIN_URL=http://localhost:4173/login.html?portal=admin"

echo Server start ho raha hai, thodi der mein browser mein khulega...
echo.
echo Band karne ke liye yeh window close karein.
echo ============================================
echo.

:: If the backend is already running, just open the admin portal.
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { Invoke-WebRequest -UseBasicParsing 'http://localhost:4173' -TimeoutSec 1 | Out-Null; exit 0 } catch { exit 1 }"
if %ERRORLEVEL% EQU 0 (
    start "" "%ADMIN_URL%"
    exit /b
)

:: Start browser after 3 seconds in background.
start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 3; Start-Process '%ADMIN_URL%'"

:: Start website backend and admin dashboard.
node server.js

pause
