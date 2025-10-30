@echo off
REM MediGuardian Crash Log Capture
REM Run this after connecting your Android device via USB

set ADB=M:\Downloads\platform-tools-latest-windows\platform-tools\adb.exe

echo === MediGuardian Crash Log Capture ===
echo.

echo Step 1: Checking connected devices...
%ADB% devices
echo.

echo Make sure your device appears above!
echo If not, enable USB Debugging and reconnect.
echo.
pause

echo Step 2: Clearing old logs...
%ADB% logcat -c
echo Logs cleared.
echo.

echo Step 3: Starting log capture...
echo.
echo INSTRUCTIONS:
echo 1. This window will capture logs
echo 2. Now open the MediGuardian app on your phone
echo 3. Let it crash
echo 4. Press Ctrl+C to stop capturing
echo.
pause

echo Capturing logs... Press Ctrl+C when app crashes
%ADB% logcat -s ReactNativeJS:V AndroidRuntime:E System.err:V > crash_log.txt

echo.
echo Logs saved to crash_log.txt
pause
