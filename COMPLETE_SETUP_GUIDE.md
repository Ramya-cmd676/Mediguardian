# 📱 MediGuardian - Complete Setup Guide

## ✅ What's Ready Now

### Backend (Working!)
- ✓ Docker container running
- ✓ Server at http://localhost:4000
- ✓ AI model loaded
- ✓ API endpoints ready

### Frontend (Ready to install)
- ✓ React Native Expo app
- ✓ Camera integration
- ✓ Voice feedback
- ✓ Setup scripts created

---

## 🚀 Quick Start (3 Steps)

### Step 1: Install Node.js (One-time setup)

**Download:** https://nodejs.org/dist/v18.20.1/node-v18.20.1-x64.msi

- Run the installer
- Click "Next" through all steps
- **Restart your computer after installation**

### Step 2: Setup Frontend

**Double-click:** `M:\Desktop\Ramya-major\frontend\setup-frontend.bat`

This will:
- Check if Node.js is installed
- Install all dependencies
- Show you next steps

### Step 3: Get Your IP and Start

1. **Find your IP address:**
   ```powershell
   ipconfig
   ```
   Look for "IPv4 Address" - example: `192.168.1.100`

2. **Update App.js:**
   - Open `frontend\App.js`
   - Line 9: Change `192.168.1.100` to YOUR IP address

3. **Start the app:**
   
   **Double-click:** `M:\Desktop\Ramya-major\frontend\start-frontend.bat`

---

## 📱 On Your Phone

1. **Install Expo Go:**
   - Android: https://play.google.com/store/apps/details?id=host.exp.exponent
   - iPhone: https://apps.apple.com/app/expo-go/id982107779

2. **Connect to SAME WiFi** as your computer

3. **Scan QR code** from the terminal

4. **App opens on your phone!**

---

## 🧪 Testing Flow

1. Open app on phone
2. Allow camera permissions
3. **Capture a pill image**
4. Choose action:
   - **Verify Pill** → Check if it's registered
   - **Register Pill** → Add new pill (type name)
   - **Retake** → Take another photo

---

## 📂 Project Structure

```
M:\Desktop\Ramya-major\
├── backend\              ← Running in Docker ✓
│   ├── index.js         ← API server
│   ├── model.js         ← AI engine
│   └── Dockerfile
├── frontend\            ← Mobile app
│   ├── App.js          ← Main app code
│   ├── package.json
│   ├── setup-frontend.bat    ← Run this first
│   └── start-frontend.bat    ← Then run this
├── docker-compose.yml
└── README.md
```

---

## ⚙️ All Commands

### Backend (already running)
```powershell
# Start backend
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop backend
docker-compose down

# Restart
docker-compose restart
```

### Frontend (after Node.js is installed)
```powershell
# Setup (once)
cd M:\Desktop\Ramya-major\frontend
npm install

# Start dev server
npm start
# or double-click: start-frontend.bat

# Clear cache
npx expo start -c
```

---

## 🔧 Troubleshooting

### "Node.js not found"
- Install Node.js from the link above
- **Restart your computer**
- Try again

### "Network request failed" on phone
- ✓ Backend running? `docker-compose ps`
- ✓ Same WiFi network?
- ✓ Updated IP in `App.js`?
- ✓ Test from phone browser: `http://YOUR_IP:4000/health`

### "Expo Go not working"
- Make sure app is up to date
- Try clearing Expo Go cache
- Use tunnel mode: `npx expo start --tunnel`

### Windows Firewall blocking
- Allow Node.js when prompted
- Or temporarily disable firewall for testing

---

## 📊 System Requirements

### Backend (Docker)
- ✓ Windows 10/11
- ✓ Docker Desktop
- ✓ 3GB RAM available

### Frontend (Phone)
- Android 5.0+ or iOS 11+
- Expo Go app
- Camera
- WiFi connection

### Development (Computer)
- Node.js 18
- 2GB free disk space

---

## 🎯 Current Status

| Component | Status | Location |
|-----------|--------|----------|
| Backend API | ✅ Running | Docker container |
| AI Model | ✅ Loaded | MobileNet v2 |
| Database | ✅ Ready | backend/db/pills.json |
| Frontend App | ⏳ Needs setup | Run setup-frontend.bat |
| Phone App | ⏳ Install | Expo Go from store |

---

## 📞 Next Steps After Setup

1. ✅ Backend running
2. ⏳ Install Node.js → restart computer
3. ⏳ Run `setup-frontend.bat`
4. ⏳ Update IP in `App.js`
5. ⏳ Run `start-frontend.bat`
6. ⏳ Install Expo Go on phone
7. ⏳ Scan QR code
8. 🎉 Test the app!

---

## 💡 Pro Tips

- Use good lighting when capturing pill images
- Capture from directly above the pill
- Make sure pill fills most of the frame
- Register multiple angles of the same pill for better accuracy
- Voice feedback helps elderly users

---

## 📝 Files Created for You

- ✅ `frontend/setup-frontend.bat` - One-click setup
- ✅ `frontend/start-frontend.bat` - One-click start
- ✅ `frontend/SETUP.md` - Detailed instructions
- ✅ `frontend/App.js` - Updated with better UI
- ✅ `frontend/app.json` - Expo configuration
- ✅ `STATUS.md` - Current project status
- ✅ `DOCKER_SETUP.md` - Docker guide

**Everything is ready! Just install Node.js and follow Step 2 above.**
