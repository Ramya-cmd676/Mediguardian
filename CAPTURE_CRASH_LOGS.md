# How to Capture Android Crash Logs

## Method 1: Using ADB (Android Debug Bridge)

### Step 1: Install ADB
1. Download Android Platform Tools: https://developer.android.com/tools/releases/platform-tools
2. Extract the ZIP file to a folder (e.g., `C:\platform-tools`)
3. Connect your Android device via USB
4. Enable USB Debugging on your device:
   - Settings → About Phone → Tap "Build Number" 7 times
   - Settings → Developer Options → Enable "USB Debugging"

### Step 2: Connect Device
```powershell
# Navigate to platform-tools folder
cd C:\platform-tools  # or wherever you extracted it

# Check if device is connected
.\adb.exe devices

# You should see something like:
# List of devices attached
# ABCD1234567890  device
```

### Step 3: Capture Crash Logs
```powershell
# Clear existing logs
.\adb.exe logcat -c

# Start capturing logs (keep this running)
.\adb.exe logcat > crash_log.txt

# In another terminal/window, launch the app
.\adb.exe shell am start -n com.mediguardian.app/.MainActivity

# Wait for crash to occur (app will close)
# Press Ctrl+C to stop log capture

# Now check crash_log.txt for errors
```

### Step 4: Find the Crash
Look for lines containing:
- `FATAL EXCEPTION`
- `AndroidRuntime`
- `com.mediguardian.app`
- `ReactNativeJS`

Paste the error stacktrace here so we can fix it.

---

## Method 2: Quick Fix Without Logs

Based on common Expo APK crashes, try these fixes:

### Fix 1: Update AndroidManifest.xml to add android:exported

The most common crash cause is missing `android:exported` attribute on MainActivity.

**File:** `frontend/android/app/src/main/AndroidManifest.xml`

Add `android:exported="true"` to the MainActivity:

```xml
<activity
  android:name=".MainActivity"
  android:exported="true"
  ...
```

### Fix 2: Upgrade to Expo SDK 50+

Your current SDK 48 targets Android API 33, which is outdated.

```bash
# In frontend directory
npx expo-cli upgrade 50
```

### Fix 3: Check Camera Permissions

Make sure camera permission is properly declared:

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-feature android:name="android.hardware.camera" android:required="false" />
```

---

## Method 3: Use Expo Dev Client (Alternative)

Instead of a production APK, build a development client that shows errors:

```bash
docker exec ramya-major-frontend-1 eas build --profile development --platform android
```

This will show error messages on the device screen instead of just crashing.

---

## Next Steps

1. **If you can install ADB:** Capture logs using Method 1
2. **If you can't install ADB:** Try fixes in Method 2 (especially Fix 1)
3. **If still stuck:** Build a dev client using Method 3

Let me know which approach you'd like to take!
