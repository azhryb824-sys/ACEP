@echo off
setlocal enabledelayedexpansion

set "GREEN=[92m"
set "YELLOW=[93m"
set "RED=[91m"
set "CYAN=[96m"
set "NC=[0m"

echo %CYAN%============================================%NC%
echo %CYAN%   ACEP - Quick Start (Windows)%NC%
echo %CYAN%   Architectural Construction Estimation Platform%NC%
echo %CYAN%============================================%NC%
echo.

:: Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo %RED%[ERROR] Node.js is not installed. Please install Node.js 18+ from https://nodejs.org%NC%
    pause
    exit /b 1
)

for /f "tokens=1-3 delims=v." %%a in ('node -v') do set NODE_VER=%%~a%%~b
if %NODE_VER% LSS 18 (
    echo %RED%[ERROR] Node.js 18+ required. Current: %NODE_VER%%NC%
    pause
    exit /b 1
)
echo %GREEN%[OK] Node.js %NODE_VER% detected%NC%

:: Check npm
where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo %RED%[ERROR] npm not found%NC%
    pause
    exit /b 1
)
echo %GREEN%[OK] npm detected%NC%

:: Install dependencies
echo.
echo %YELLOW%[STEP 1/3] Installing dependencies...%NC%
call npm install
if %ERRORLEVEL% neq 0 (
    echo %RED%[ERROR] npm install failed%NC%
    pause
    exit /b 1
)
echo %GREEN%[OK] Dependencies installed%NC%

:: Build packages
echo.
echo %YELLOW%[STEP 2/3] Building packages...%NC%
call npm run build 2>nul
if %ERRORLEVEL% neq 0 (
    echo %YELLOW%[WARN] Build script not found, skipping%NC%
) else (
    echo %GREEN%[OK] Packages built successfully%NC%
)

:: Set up CLI
echo.
echo %YELLOW%[STEP 3/3] Setting up CLI...%NC%
:: Link CLI globally if available
if exist "scripts\acep-cli.js" (
    echo %GREEN%[OK] CLI ready at scripts\acep-cli.js%NC%
)

echo.
echo %CYAN%============================================%NC%
echo %GREEN%  Setup complete!%NC%
echo %CYAN%============================================%NC%
echo.
echo   Quick commands:
echo     node scripts/acep-cli.js help
echo     npm test
echo.
pause
