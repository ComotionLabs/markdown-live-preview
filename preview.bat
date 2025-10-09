@echo off
REM Markdown Live Preview Launcher for Windows
REM Usage: preview.bat [markdown-file] [port]

setlocal enabledelayedexpansion

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [91mError: Node.js is not installed[0m
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if npm packages are installed
if not exist "node_modules\" (
    echo [94mInstalling dependencies...[0m
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [91mError: Failed to install dependencies[0m
        pause
        exit /b 1
    )
)

REM Get the directory where this script is located
set SCRIPT_DIR=%~dp0

REM Use the CLI with all arguments
node "%SCRIPT_DIR%cli.js" %*
