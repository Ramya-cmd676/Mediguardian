# Building APK with Expo EAS - Step by Step Guide

## Prerequisites
✅ Node.js installed (v24.2.0 - confirmed)
✅ npm installed (v11.3.0 - confirmed)
⚠️ EAS CLI needs to be installed/fixed
⚠️ Expo account needed (free)

## Step 1: Fix EAS CLI Installation

Open PowerShell as Administrator and run:
```powershell
npm uninstall -g eas-cli
npm cache clean --force
npm install -g eas-cli@latest
```

Verify installation:
```powershell
eas --version
```

## Step 2: Install Frontend Dependencies

Navigate to frontend folder:
```powershell
cd C:\Users\DELL\Desktop\Projects\Mediguardian\frontend
npm install
```

## Step 3: Login to Expo

```powershell
eas login
```

Enter your Expo credentials. If you don't have an account:
- Go to https://expo.dev/signup
- Create a free account
- Come back and run `eas login`

## Step 4: Configure the Build (Already Done ✅)

Your project already has:
- ✅ `app.json` with package name: `com.mediguardian.app`
- ✅ `eas.json` with build profiles

## Step 5: Build the APK

Choose one of these profiles:

### Option A: Development Build (Recommended for Testing)
Best for debugging - shows errors on screen
```powershell
eas build --platform android --profile development
```

### Option B: Preview Build (Internal Testing)
Release-like APK for internal distribution
```powershell
eas build --platform android --profile preview
```

### Option C: Production Build (Final Release)
Production-ready APK
```powershell
eas build --platform android --profile production
```

## Step 6: Handle Interactive Prompts

During the build, EAS will ask:

**1. Generate a new Android Keystore?**
- Choose: **Yes** (unless you have your own keystore)
- Expo will manage it for you

**2. Would you like to upload a Google Services JSON?**
- Choose: **No** for now (needed later for FCM push notifications)
- You can add this later for production

## Step 7: Wait for Build to Complete

The build happens on Expo's cloud servers (not your computer).

You'll see:
```
✔ Build started
✔ Build URL: https://expo.dev/accounts/[your-account]/projects/mediguardian/builds/[build-id]
```

- Build takes 10-20 minutes
- You can close the terminal - the build continues
- Check status at the URL shown

## Step 8: Download the APK

Once complete, download via:

**Option 1: From Terminal**
```powershell
eas build:list --platform android
eas build:download --platform android
```

**Option 2: From Web**
- Open the build URL from Step 7
- Click "Download" button

## Step 9: Install APK on Your Device

**Via USB (ADB):**
```powershell
# Enable USB debugging on your Android device first
adb install -r path\to\downloaded.apk
```

**Via Direct Install:**
- Transfer APK to your phone
- Open it and allow installation from unknown sources

## Troubleshooting

### Issue: EAS CLI not found or errors
**Solution:**
```powershell
# Run as Administrator
npm uninstall -g eas-cli
npm cache clean --force
npm install -g eas-cli@latest
```

### Issue: "Not logged in"
**Solution:**
```powershell
eas logout
eas login
```

### Issue: Build fails with credential errors
**Solution:**
- Choose "Let Expo handle credentials" when prompted
- Or configure manually: `eas credentials`

### Issue: Need push notifications in production
**Solution:**
1. Create Firebase project: https://console.firebase.google.com
2. Get FCM Server Key
3. Upload to EAS: `eas credentials`
4. Or upload during build when prompted

## Quick Reference Commands

```powershell
# Check EAS version
eas --version

# Login
eas login

# Build development APK
eas build -p android --profile development

# Build preview APK
eas build -p android --profile preview

# List builds
eas build:list

# Download latest build
eas build:download -p android

# Check credentials
eas credentials
```

## Next Steps After APK is Built

1. Install on test device
2. Test camera functionality
3. Test patient login/registration
4. Test notification permissions
5. For production: Configure FCM for push notifications

## Support

- Expo docs: https://docs.expo.dev/build/setup/
- EAS Build docs: https://docs.expo.dev/build/introduction/
- Get help: https://forums.expo.dev/

---

**Current Build Profiles Available:**
- `development` - Dev client with debugging
- `preview` - Internal release (APK)
- `production` - Production release (APK)
