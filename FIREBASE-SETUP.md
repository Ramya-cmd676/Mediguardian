# 🔔 Firebase Push Notifications Setup Guide

## Current Status
✅ Code is ready for notifications (App.js configured)
✅ Expo notifications plugin added (app.json)
⚠️ Firebase needs to be configured (15 minute setup)

## Why Notifications Don't Work Yet
The app needs Firebase Cloud Messaging (FCM) to send push notifications. Right now we have a **placeholder** `google-services.json` file that prevents crashes but doesn't enable notifications.

## How to Enable Notifications (Step-by-Step)

### Step 1: Create Firebase Project (5 minutes)
1. Go to **Firebase Console**: https://console.firebase.google.com/
2. Click **"Add project"** or **"Create a project"**
3. Enter project name: **MediGuardian**
4. Disable Google Analytics (not needed)
5. Click **"Create project"**

### Step 2: Add Android App (5 minutes)
1. In your Firebase project, click **"Add app"** → **Android icon**
2. Enter these details:
   - **Android package name**: `com.mediguardian.app` (EXACTLY this)
   - **App nickname**: MediGuardian (optional)
   - **Debug signing certificate**: Leave empty (not needed for now)
3. Click **"Register app"**

### Step 3: Download Configuration File (1 minute)
1. Click **"Download google-services.json"**
2. **IMPORTANT**: Save this file to `M:\Desktop\Ramya-major\frontend\google-services.json`
3. **Replace the placeholder file** we created
4. Click **"Next"** → **"Continue to console"**

### Step 4: Enable Cloud Messaging (2 minutes)
1. In Firebase Console, go to **"Build"** → **"Cloud Messaging"**
2. Click **"Get started"** if prompted
3. No additional configuration needed - FCM is now enabled!

### Step 5: Rebuild APK (5 minutes)
```bash
# In frontend container or locally with Expo CLI
docker exec -it ramya-major-frontend-1 sh
cd /app
eas build --platform android --profile preview
```

OR use Expo web dashboard:
- https://expo.dev/accounts/nks-16/projects/mediguardian/builds
- Click "Create a build" → Android → APK

### Step 6: Test Notifications
After installing the new APK:

1. **Register/Login** to the app
2. App will automatically get **Expo Push Token**
3. Backend saves the token to `backend/db/push-tokens.json`
4. **Test sending notification** from backend:

```bash
# From backend container
node -e "
const { Expo } = require('expo-server-sdk');
const expo = new Expo();
const messages = [{
  to: 'ExponentPushToken[YOUR_TOKEN_HERE]',
  sound: 'default',
  title: 'Test from MediGuardian',
  body: 'This is a test notification!',
  data: { type: 'test' }
}];
expo.sendPushNotificationsAsync(messages).then(console.log);
"
```

## What Notifications Will Do

### Patient App (Mobile)
- ✅ Receive medication reminders
- ✅ Get alerts when caregiver registers new pills
- ✅ Notification taps open app to camera view
- ✅ Works even when app is closed

### Backend (Automatic)
- ✅ Sends scheduled medication reminders (via schedules.js)
- ✅ Uses `expo-server-sdk` to send push notifications
- ✅ Stores push tokens in `backend/db/push-tokens.json`

## Testing Without Firebase (Current State)
Right now the app works **without** notifications:
- ✅ App launches successfully
- ✅ Camera, login, pill recognition all work
- ⚠️ Push notifications gracefully disabled (no crash)
- Console shows: "Push notification registration failed (Firebase may not be configured)"

## After Firebase Setup
With real Firebase config:
- ✅ Everything above PLUS working push notifications
- ✅ Users receive medication reminders
- ✅ Real-time alerts and notifications
- ✅ Full medication adherence tracking

## Quick Links
- Firebase Console: https://console.firebase.google.com/
- Expo Push Notifications Docs: https://docs.expo.dev/push-notifications/overview/
- Expo Server SDK: https://github.com/expo/expo-server-sdk-node
- Test Push Notifications: https://expo.dev/notifications

## Need Help?
If you get stuck:
1. Check that package name is EXACTLY: `com.mediguardian.app`
2. Make sure `google-services.json` is in `frontend/` folder
3. Rebuild APK after adding the real Firebase file
4. Check ADB logs for notification token: `adb logcat -s ReactNativeJS:*`

---

**Note**: The placeholder file prevents crashes but notifications won't work until you add the real Firebase configuration from Firebase Console.
