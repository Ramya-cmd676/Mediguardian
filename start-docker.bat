@echo off
echo ========================================
echo MediGuardian Docker Startup Script
echo ========================================
echo.

echo Checking Docker status...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker is not running or is paused!
    echo.
    echo Please:
    echo 1. Check system tray for Docker whale icon
    echo 2. Right-click and select "Resume" or "Unpause"
    echo 3. Or open Docker Desktop and click Resume
    echo.
    echo Then run this script again.
    pause
    exit /b 1
)

echo Docker is running!
echo.

echo Building Docker image (first time takes 3-5 minutes)...
docker-compose build
if %errorlevel% neq 0 (
    echo Build failed! Check errors above.
    pause
    exit /b 1
)

echo.
echo Build successful!
echo.
echo Starting MediGuardian backend server...
echo Server will be available at: http://localhost:4000
echo.
echo Press Ctrl+C to stop the server
echo.
docker-compose up

pause
