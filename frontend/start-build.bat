@echo off
echo ========================================
echo   Starting EAS Build for MediGuardian
echo ========================================
echo.
cd /d "%~dp0"
echo Current directory: %CD%
echo.
echo Starting build with development profile...
echo.
eas build --platform android --profile development
echo.
echo Build command completed!
pause
