<#
  build-apk.ps1

  Helper to run an Expo EAS Android build from Windows PowerShell.

  Usage:
    ./build-apk.ps1 -Profile development
    ./build-apk.ps1 -Profile preview
    ./build-apk.ps1 -Profile production

  Notes:
  - Requires Node/npm installed and network access.
  - You must be logged into Expo (interactive) or set EXPO_TOKEN environment variable.
  - For physical device testing use 'development' profile (developmentClient=true) to get dev client APK.
  - For a release APK use 'production' or 'preview'.
#>

param(
  [ValidateSet('development','preview','production')]
  [string]$Profile = 'development'
)

Write-Host "Building Expo APK using profile: $Profile" -ForegroundColor Cyan

Push-Location -Path (Split-Path -Path $MyInvocation.MyCommand.Definition -Parent)

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  Write-Error "npm not found in PATH. Install Node.js and try again."; exit 1
}

# Ensure eas-cli is installed
if (-not (Get-Command eas -ErrorAction SilentlyContinue)) {
  Write-Host "eas-cli not found. Installing eas-cli globally..." -ForegroundColor Yellow
  npm install -g eas-cli
  if ($LASTEXITCODE -ne 0) { Write-Error "Failed to install eas-cli"; exit 1 }
}

Write-Host "Installing project dependencies (frontend)..." -ForegroundColor Cyan
npm install
if ($LASTEXITCODE -ne 0) { Write-Error "npm install failed"; exit 1 }

# Login handling: prefer EXPO_TOKEN if set
if ($env:EXPO_TOKEN) {
  Write-Host "Using EXPO_TOKEN environment variable for authentication." -ForegroundColor Green
} else {
  Write-Host "No EXPO_TOKEN found. You will be prompted to login interactively if not already logged in." -ForegroundColor Yellow
}

# Run the build
Write-Host "Starting EAS build (this may open an interactive prompt)." -ForegroundColor Cyan
eas build --platform android --profile $Profile
$exitCode = $LASTEXITCODE

if ($exitCode -ne 0) {
  Write-Error "eas build failed (exit code $exitCode)"
  Pop-Location
  exit $exitCode
}

Write-Host "Build started. Use 'eas build:list' to view builds and 'eas build:download --id <build-id>' to download." -ForegroundColor Green

Pop-Location
return 0
