<#
.SYNOPSIS
    Simple script to build Expo APK using EAS
    
.DESCRIPTION
    This script automates the Expo EAS build process for Android APK.
    It will guide you through the steps and handle common issues.
    
.PARAMETER Profile
    Build profile: development, preview, or production
    
.EXAMPLE
    .\build-apk-simple.ps1 -Profile development
#>

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('development','preview','production')]
    [string]$Profile = 'development'
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  MediGuardian APK Builder (Expo EAS)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Navigate to frontend directory
$frontendPath = Split-Path -Path $MyInvocation.MyCommand.Path -Parent
Set-Location $frontendPath
Write-Host "📁 Working directory: $frontendPath" -ForegroundColor Green

# Step 1: Check Node.js
Write-Host "`n🔍 Step 1: Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js $nodeVersion installed" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js from https://nodejs.org" -ForegroundColor Red
    exit 1
}

# Step 2: Fix and install EAS CLI
Write-Host "`n🔍 Step 2: Setting up EAS CLI..." -ForegroundColor Yellow
try {
    $easVersion = eas --version 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "EAS CLI needs reinstall"
    }
    Write-Host "✅ EAS CLI installed: $easVersion" -ForegroundColor Green
} catch {
    Write-Host "⚠️  EAS CLI needs to be installed/fixed" -ForegroundColor Yellow
    Write-Host "Installing EAS CLI globally..." -ForegroundColor Cyan
    
    npm uninstall -g eas-cli 2>$null
    npm cache clean --force 2>$null
    npm install -g eas-cli@latest
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install EAS CLI. Please run as Administrator." -ForegroundColor Red
        Write-Host "Or manually run: npm install -g eas-cli" -ForegroundColor Yellow
        exit 1
    }
    
    $easVersion = eas --version
    Write-Host "✅ EAS CLI installed: $easVersion" -ForegroundColor Green
}

# Step 3: Install dependencies
Write-Host "`n🔍 Step 3: Installing project dependencies..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Write-Host "✅ Dependencies already installed" -ForegroundColor Green
} else {
    Write-Host "Installing npm packages..." -ForegroundColor Cyan
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Dependencies installed" -ForegroundColor Green
}

# Step 4: Check login status
Write-Host "`n🔍 Step 4: Checking Expo login..." -ForegroundColor Yellow
$whoami = eas whoami 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Not logged in to Expo" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please login to Expo (or create account at https://expo.dev/signup)" -ForegroundColor Cyan
    Write-Host "Running: eas login..." -ForegroundColor Cyan
    Write-Host ""
    
    eas login
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Login failed" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✅ Logged in as: $whoami" -ForegroundColor Green
}

# Step 5: Show build info
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Ready to Build!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Profile: $Profile" -ForegroundColor White
Write-Host "Platform: Android" -ForegroundColor White
Write-Host "Package: com.mediguardian.app" -ForegroundColor White
Write-Host ""

if ($Profile -eq 'development') {
    Write-Host "ℹ️  Development build includes:" -ForegroundColor Cyan
    Write-Host "   - Dev client for debugging" -ForegroundColor White
    Write-Host "   - Errors shown on screen" -ForegroundColor White
    Write-Host "   - Hot reload support" -ForegroundColor White
} elseif ($Profile -eq 'preview') {
    Write-Host "ℹ️  Preview build includes:" -ForegroundColor Cyan
    Write-Host "   - Release-like APK" -ForegroundColor White
    Write-Host "   - Internal testing ready" -ForegroundColor White
} else {
    Write-Host "ℹ️  Production build includes:" -ForegroundColor Cyan
    Write-Host "   - Production APK" -ForegroundColor White
    Write-Host "   - Play Store ready" -ForegroundColor White
}

Write-Host ""
Write-Host "⚠️  Important Notes:" -ForegroundColor Yellow
Write-Host "   1. Build happens on Expo cloud (not your PC)" -ForegroundColor White
Write-Host "   2. Takes 10-20 minutes to complete" -ForegroundColor White
Write-Host "   3. You may be asked about Android credentials" -ForegroundColor White
Write-Host "      → Choose 'Let Expo handle it' (recommended)" -ForegroundColor White
Write-Host "   4. For push notifications, FCM setup needed later" -ForegroundColor White
Write-Host ""

$continue = Read-Host "Continue with build? (Y/N)"
if ($continue -ne 'Y' -and $continue -ne 'y') {
    Write-Host "❌ Build cancelled" -ForegroundColor Yellow
    exit 0
}

# Step 6: Start build
Write-Host "`n🚀 Starting EAS build..." -ForegroundColor Green
Write-Host ""

eas build --platform android --profile $Profile

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Build failed" -ForegroundColor Red
    Write-Host ""
    Write-Host "Common fixes:" -ForegroundColor Yellow
    Write-Host "1. Make sure you're logged in: eas login" -ForegroundColor White
    Write-Host "2. Check credentials: eas credentials" -ForegroundColor White
    Write-Host "3. See build logs at the URL shown above" -ForegroundColor White
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Build Started Successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Wait for build to complete (10-20 min)" -ForegroundColor White
Write-Host "2. Check status: eas build:list" -ForegroundColor White
Write-Host "3. Download APK: eas build:download -p android" -ForegroundColor White
Write-Host ""
Write-Host "Or visit the build URL shown above to download from browser" -ForegroundColor White
Write-Host ""
