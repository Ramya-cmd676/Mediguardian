@echo off
echo Starting MediGuardian Frontend...
echo.

REM Check backend is running
curl -s http://localhost:4000/health >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: Backend doesn't seem to be running!
    echo Please start it first: docker-compose up -d
    echo.
    pause
)

cd /d M:\Desktop\Ramya-major\frontend
echo Starting Expo development server...
echo.
echo After the QR code appears:
echo 1. Open Expo Go app on your phone
echo 2. Scan the QR code
echo 3. App will load on your phone!
echo.
call npx expo start

pause
