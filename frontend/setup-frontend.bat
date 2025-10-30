@echo off
echo ===================================
echo MediGuardian Frontend Setup
echo ===================================
echo.

REM Check if Node.js is installed
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH!
    echo.
    echo Please install Node.js 18:
    echo https://nodejs.org/dist/v18.20.1/node-v18.20.1-x64.msi
    echo.
    echo After installing, restart your computer and run this script again.
    pause
    exit /b 1
)

echo Node.js found!
node -v
npm -v
echo.

echo Installing frontend dependencies...
cd /d M:\Desktop\Ramya-major\frontend
call npm install

if %errorlevel% neq 0 (
    echo.
    echo ERROR: npm install failed!
    pause
    exit /b 1
)

echo.
echo ===================================
echo Setup Complete!
echo ===================================
echo.
echo NEXT STEPS:
echo.
echo 1. Find your IP address:
echo    Run: ipconfig
echo    Look for "IPv4 Address" (example: 192.168.1.100)
echo.
echo 2. Edit frontend\App.js:
echo    Change line 9: const BACKEND_URL = 'http://YOUR_IP:4000';
echo    Replace YOUR_IP with your actual IP address
echo.
echo 3. Start the app:
echo    Run: npm start
echo    (or double-click start-frontend.bat)
echo.
echo 4. On your phone:
echo    - Install "Expo Go" app from Play Store/App Store
echo    - Make sure phone is on the SAME WiFi as this computer
echo    - Scan the QR code that appears
echo.
pause
