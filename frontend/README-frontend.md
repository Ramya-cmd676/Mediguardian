# MediGuardian frontend (Expo MVP)

Instructions:

1. Install Expo CLI (if not already):

```powershell
npm install -g expo-cli
```

2. From `frontend` directory:

```powershell
npm install
expo start
```

3. Open the project with Expo Go on a physical device, or run an emulator. Replace `YOUR_PC_IP` in `App.js` with your machine's IP address so the mobile app can reach the backend (e.g. `http://192.168.1.10:4000`).

Notes:
- Use Expo Go for quick testing. Camera permissions will be requested at runtime.
- For production, replace fetch calls and FormData with secure endpoints and auth.
