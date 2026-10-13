@echo off
title PAN Card AI Agent - Gemini Vision & Auto-Fill
cd /d "%~dp0"

echo =======================================================
echo    PAN CARD AI AGENT - GEMINI VISION & FORM FILLER
echo =======================================================
echo.

set PYTHONIOENCODING=utf-8
set PYTHONUTF8=1
chcp 65001 >nul

:: 1. Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH!
    echo Please install Python 3.10+ from python.org
    pause
    exit /b 1
)

:: 2. Check Virtual Environment
if exist "venv\Scripts\activate.bat" goto VENV_EXISTS

echo [*] Creating virtual environment...
python -m venv venv
if errorlevel 1 (
    echo [ERROR] Failed to create virtual environment!
    pause
    exit /b 1
)

:VENV_EXISTS
call venv\Scripts\activate.bat

:: 3. Install packages if first run
if exist "venv\.installed" goto START_APP

echo [*] Installing required packages: Flask, Gemini, Playwright, Pillow...
pip install -r requirements.txt
echo [*] Installing Playwright Chromium browser...
playwright install chromium
echo done > venv\.installed

:START_APP
echo [*] Starting PAN Card AI Web App...
echo [*] Opening Dashboard at http://localhost:5000 ...
echo.
python app.py

if errorlevel 1 (
    echo.
    echo [NOTICE] Application terminated.
    pause
)

deactivate
