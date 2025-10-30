# Fix APK Crash - MediGuardian

The APK is crashing on startup. Here are 3 solutions, ranked by ease:

## Option 1: Build Development Client (EASIEST - Recommended)

A development client will show error messages on screen instead of crashing silently.

### Steps:
```bash
# Make sure Docker frontend container is running
docker-compose up -d

# Build development APK (this will show errors on screen)
docker exec -it ramya-major-frontend-1 eas build --platform android --profile development

# Follow the prompts, wait for build to complete (~3-5 minutes)
# Download and install the new APK
# This version will display errors on the screen!
```

**Why this helps:** Development builds include error reporting, so you'll see exactly what's wrong when you open the app.

---

## Option 2: Install ADB and Capture Logs (MOST ACCURATE)

This tells us exactly what's wrong.

### Steps:
1. Download Android Platform Tools: https://developer.android.com/tools/releases/platform-tools
2. Extract to `C:\platform-tools`
3. Enable USB Debugging on your phone:
   - Settings → About Phone → Tap "Build Number" 7 times
   - Settings → Developer Options → Enable "USB Debugging"
4. Connect phone via USB

```powershell
# Navigate to platform-tools
cd C:\platform-tools

# Check device connection
.\adb.exe devices

# Clear logs
.\adb.exe logcat -c

# Start capturing logs (keep running)
.\adb.exe logcat -s ReactNativeJS:V AndroidRuntime:E > crash_log.txt

# In another PowerShell window, launch the app
.\adb.exe shell am start -n com.mediguardian.app/.MainActivity

# Wait for crash
# Press Ctrl+C to stop logging
# Check crash_log.txt for the error
```

**Send me the FATAL EXCEPTION or ReactNativeJS error from crash_log.txt**

---

## Option 3: Rebuild with Latest Expo SDK (PERMANENT FIX)

Your current SDK 48 is outdated. Upgrading to SDK 50+ fixes many issues.

### Steps:

**WARNING:** This requires updating dependencies and may take 10-15 minutes.

```bash
# Stop containers
docker-compose down

# Update package.json manually or use expo upgrade
# In frontend directory
docker run -it --rm -v "M:/Desktop/Ramya-major/frontend:/app" -w /app node:18 npx expo upgrade 50

# Rebuild containers
docker-compose build --no-cache

# Build new APK
docker-compose up -d
docker exec -it ramya-major-frontend-1 eas build --platform android --profile preview
```

---

## Quick Diagnostic Commands

If you want to check the current APK on your device:

```powershell
# If you install ADB later, run these:
adb shell pm list packages | findstr mediguardian    # Check if app is installed
adb shell dumpsys package com.mediguardian.app       # Check app info
adb logcat -d | findstr -i "fatal exception"         # Check recent crashes
```

---

## Which Option Should You Choose?

1. **If you want to see what's wrong immediately:** Choose **Option 1** (dev client)
2. **If you want to fix it properly:** Choose **Option 2** (get crash logs) then **Option 3** (upgrade SDK)
3. **If you're in a hurry:** Choose **Option 1** and test the backend flows

---

## What I've Already Done

✅ Updated `eas.json` with development build profile
✅ Updated `app.json` with adaptive icon configuration
✅ Backend is running and accessible from your phone

---

## Next Steps

**Tell me which option you want to try**, and I'll guide you through it step by step!

If you choose Option 1 (recommended), just copy this command:

```bash
docker exec -it ramya-major-frontend-1 eas build --platform android --profile development
```

This will build a version that shows errors instead of crashing!
