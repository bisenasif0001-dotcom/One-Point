@echo off
cd /d "%~dp0"

echo Checking if server already running on port 4173...
netstat -ano | findstr ":4173" | findstr "LISTENING" >nul
if errorlevel 1 (
    echo Starting server...
    start "One Point Digital Services - Local Server" cmd /k "node server.js"
    timeout /t 2 /nobreak >nul
) else (
    echo Server already running.
)

start http://localhost:4173/
