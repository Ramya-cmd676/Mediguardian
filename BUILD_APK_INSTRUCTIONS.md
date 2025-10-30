# Building APK for MediGuardian

Since we can't use Expo Go due to the download error, here are 3 options to get the app on your phone:

## Option 1: Use Expo Build Service (Recommended - Easiest)

1. **Create a free Expo account** at https://expo.dev/signup

2. **Install EAS CLI globally** (in Docker container):
   ```bash
   docker-compose up -d
   docker exec -it ramya-major-frontend-1 npm install -g eas-cli
   ```

3. **Login to Expo**:
   ```bash
   docker exec -it ramya-major-frontend-1 eas login
   ```

4. **Build the APK**:
   ```bash
   docker exec -it ramya-major-frontend-1 eas build --platform android --profile preview
   ```

5. **Wait for build** (takes 10-20 minutes)

6. **Download the APK** from the link provided and install it on your phone

## Option 2: Build Locally with Android Studio (Faster but requires setup)

1. **Install Android Studio** from https://developer.android.com/studio

2. **Install Android SDK** (API 33+)

3. **Run local build**:
   ```bash
   docker exec -it ramya-major-frontend-1 npx expo run:android --variant release
   ```

## Option 3: Simplest - Use Web Version (Works Now!)

Since your backend is already accessible from your phone, we can use the web version:

1. **Start the frontend**:
   ```bash
   docker-compose up
   ```

2. **In the terminal, press `w`** (to open web)

3. **Copy the URL** (should be http://localhost:19006)

4. **On your phone's browser**, visit:
   ```
   http://192.168.2.116:19006
   ```

**Note**: The web version won't have camera access, but you can test the backend connectivity.

## Current Status

- ✅ Backend running on port 4000
- ✅ Backend accessible from phone (tested with /health endpoint)
- ❌ Expo Go has update download issues
- 🔄 Need to build standalone APK

## Recommended Next Steps

1. Create Expo account (free)
2. Use Option 1 to build APK via cloud
3. Or wait for me to set up Option 2 with Android SDK in Docker
