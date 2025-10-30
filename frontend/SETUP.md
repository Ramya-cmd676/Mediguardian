# MediGuardian Frontend Setup

## 📱 Setup Steps (Windows)

### Step 1: Install Node.js (if not already installed)
Download and install Node.js 18 from: https://nodejs.org/dist/v18.20.1/node-v18.20.1-x64.msi

### Step 2: Install Expo CLI globally
```powershell
npm install -g expo-cli
```

### Step 3: Navigate to frontend folder
```powershell
cd M:\Desktop\Ramya-major\frontend
```

### Step 4: Install dependencies
```powershell
npm install
```

### Step 5: Get your computer's IP address
```powershell
ipconfig
```

Look for "IPv4 Address" under your active network adapter (WiFi or Ethernet).
Example: `192.168.1.100`

### Step 6: Update Backend URL in App.js

Open `frontend/App.js` and find this line (near the top):
```javascript
const BACKEND_URL = 'http://192.168.1.100:4000'; // CHANGE THIS!
```

Replace `192.168.1.100` with YOUR computer's IP address from Step 5.

### Step 7: Start the Expo development server
```powershell
npx expo start
```

Or:
```powershell
npm start
```

You'll see a QR code in the terminal.

---

## 📱 Run on Your Phone

### Option A: Expo Go App (Easiest)

1. **Install Expo Go** on your phone:
   - Android: https://play.google.com/store/apps/details?id=host.exp.exponent
   - iOS: https://apps.apple.com/app/expo-go/id982107779

2. **Make sure your phone and computer are on the SAME WiFi network**

3. **Scan the QR code:**
   - Android: Open Expo Go app → Scan QR code from terminal
   - iOS: Open Camera app → Point at QR code → Tap notification

4. **App will load on your phone!**

### Option B: Android Emulator (if you have Android Studio)

```powershell
# Press 'a' in the Expo terminal to open Android emulator
a
```

### Option C: iOS Simulator (Mac only)

Not available on Windows.

---

## 🧪 Testing the App

1. **Allow camera permissions** when prompted
2. **Tap "Capture Pill"** to take a photo
3. **Choose action:**
   - **Verify Pill** - Check if this pill is registered
   - **Register Pill** - Add this pill to the database (enter name)
   - **Retake** - Take another photo

---

## ✅ Checklist

- [ ] Backend running in Docker: `docker-compose up -d`
- [ ] Backend accessible: `curl http://localhost:4000/health`
- [ ] Node.js installed
- [ ] Expo CLI installed
- [ ] Frontend dependencies installed: `npm install`
- [ ] Backend URL updated in `App.js` with your IP
- [ ] Phone and computer on same WiFi
- [ ] Expo Go app installed on phone
- [ ] Expo dev server running: `npm start`

---

## 🔧 Troubleshooting

### "Network request failed"
- Check that backend is running: `docker-compose ps`
- Verify backend URL in `App.js` matches your IP
- Make sure phone and computer are on the SAME WiFi network
- Try accessing from phone browser: `http://YOUR_IP:4000/health`

### "Expo CLI not found"
```powershell
npm install -g expo-cli
```

### "Camera permission denied"
Go to phone Settings → Apps → Expo Go → Permissions → Enable Camera

### QR code not scanning
- Make sure phone has internet
- Try typing the URL manually in Expo Go app
- The URL format: `exp://YOUR_IP:8081`

### Port 8081 already in use
```powershell
# Kill the process using port 8081
npx expo start --port 8082
```

---

## 📖 Quick Commands

```powershell
# Start dev server
npm start

# Clear cache and restart
npx expo start -c

# View logs
# (Logs appear in terminal automatically)

# Stop server
# Press Ctrl+C in the terminal
```

---

## 🎯 Next Steps After Setup

1. Test with a real pill image
2. Add multiple pills to the database
3. Test verification with different images
4. Try voice feedback (will speak results)

---

## 📝 Important Notes

- **Backend must be running** before testing the app
- **Same WiFi** - Phone and computer must be on the same network
- **Firewall** - Windows Firewall might block port 4000. Allow Node.js if prompted.
- **IP Address** - If it changes, update `App.js` again

---

Need help? Check the error messages in:
1. Expo terminal (frontend errors)
2. Docker logs: `docker-compose logs -f backend` (backend errors)
