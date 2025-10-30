# MediGuardian APK Crash Log Capture Script
# Run this script to capture crash logs from your Android device

Write-Host "=== MediGuardian Crash Log Capture ===" -ForegroundColor Cyan
Write-Host ""

# Find ADB
$adbPath = $null
$possiblePaths = @(
    "C:\platform-tools\adb.exe",
    "C:\Android\platform-tools\adb.exe",
    "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe",
    "$env:USERPROFILE\AppData\Local\Android\Sdk\platform-tools\adb.exe",
    "adb.exe"  # If it's in PATH
)

foreach ($path in $possiblePaths) {
    if (Test-Path $path -ErrorAction SilentlyContinue) {
        $adbPath = $path
        Write-Host "✓ Found ADB at: $adbPath" -ForegroundColor Green
        break
    }
}

if (-not $adbPath) {
    Write-Host "✗ ADB not found. Please enter the full path to adb.exe:" -ForegroundColor Red
    $adbPath = Read-Host "ADB Path"
    if (-not (Test-Path $adbPath)) {
        Write-Host "✗ Invalid path. Exiting." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "Step 1: Checking connected devices..." -ForegroundColor Yellow
& $adbPath devices

Write-Host ""
$continue = Read-Host "Is your device listed above? (y/n)"
if ($continue -ne 'y') {
    Write-Host ""
    Write-Host "Please:" -ForegroundColor Yellow
    Write-Host "1. Connect your phone via USB"
    Write-Host "2. Enable USB Debugging (Settings → Developer Options)"
    Write-Host "3. Accept the 'Allow USB debugging' prompt on your phone"
    Write-Host "4. Run this script again"
    exit 0
}

Write-Host ""
Write-Host "Step 2: Clearing old logs..." -ForegroundColor Yellow
& $adbPath logcat -c

Write-Host "✓ Logs cleared" -ForegroundColor Green
Write-Host ""
Write-Host "Step 3: Starting log capture..." -ForegroundColor Yellow
Write-Host "About to launch the app and capture crash logs..." -ForegroundColor Cyan
Write-Host ""

# Start log capture in background
$logFile = "crash_log.txt"
$logJob = Start-Job -ScriptBlock {
    param($adb, $log)
    & $adb logcat -s "ReactNativeJS:V" "AndroidRuntime:E" "System.err:V" "DEBUG:V" | Out-File $log
} -ArgumentList $adbPath, $logFile

Start-Sleep -Seconds 2

Write-Host "Step 4: Launching MediGuardian app..." -ForegroundColor Yellow
& $adbPath shell am start -n com.mediguardian.app/.MainActivity

Write-Host ""
Write-Host "Waiting for crash (10 seconds)..." -ForegroundColor Cyan
Start-Sleep -Seconds 10

Write-Host ""
Write-Host "Step 5: Stopping log capture..." -ForegroundColor Yellow
Stop-Job -Job $logJob
Remove-Job -Job $logJob

# Also capture the full logcat for the last few seconds
& $adbPath logcat -d -s "AndroidRuntime:E" "ReactNativeJS:V" | Out-File -Append $logFile

Write-Host "✓ Logs saved to: $logFile" -ForegroundColor Green
Write-Host ""
Write-Host "=== CRASH LOG ===" -ForegroundColor Cyan
Get-Content $logFile | Select-Object -Last 100
Write-Host ""
Write-Host "Full log saved to: $logFile" -ForegroundColor Green
Write-Host "Please share the FATAL EXCEPTION or error lines above!" -ForegroundColor Yellow
