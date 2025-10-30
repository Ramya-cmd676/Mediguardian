# Make Backend Publicly Accessible

## Option 1: ngrok (Easiest - FREE)

### Setup:
1. Download ngrok: https://ngrok.com/download
2. Extract and run:
   ```powershell
   cd C:\ngrok  # or wherever you extracted it
   .\ngrok.exe http 4000
   ```

3. You'll see output like:
   ```
   Forwarding    https://abc123.ngrok.io -> http://localhost:4000
   ```

4. Update `frontend/App.js`:
   ```javascript
   const BACKEND_URL = 'https://abc123.ngrok.io';  // Replace with your ngrok URL
   ```

5. Rebuild APK with new URL

**Pros:** 
- ✅ Free tier available
- ✅ Works immediately
- ✅ HTTPS included
- ✅ Works from anywhere in the world

**Cons:**
- ❌ URL changes each time you restart (free tier)
- ❌ Requires ngrok running on your PC
- ❌ Rate limits on free tier

---

## Option 2: Deploy Backend to Cloud (Best for Production)

### A) Deploy to Render.com (FREE tier)

1. Create account at https://render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repo (or manual deploy)
4. Settings:
   - **Name:** mediguardian-backend
   - **Environment:** Docker
   - **Dockerfile path:** backend/Dockerfile
   - **Plan:** Free

5. You'll get a URL like: `https://mediguardian-backend.onrender.com`

6. Update `frontend/App.js`:
   ```javascript
   const BACKEND_URL = 'https://mediguardian-backend.onrender.com';
   ```

**Pros:**
- ✅ Completely free
- ✅ Permanent URL
- ✅ Always online
- ✅ Auto-scales

**Cons:**
- ❌ Free tier sleeps after 15 min inactivity (first request takes ~30 seconds to wake)
- ❌ 750 hours/month limit

---

### B) Deploy to Railway.app (FREE $5 credit)

1. Sign up at https://railway.app
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repo
4. Railway auto-detects Docker
5. You get: `https://mediguardian-backend.up.railway.app`

**Pros:**
- ✅ $5 free credit monthly
- ✅ Fast deployment
- ✅ No sleep mode
- ✅ Good free tier

**Cons:**
- ❌ After $5 credit, need to pay

---

### C) Deploy to fly.io (FREE tier)

1. Install flyctl: https://fly.io/docs/flyctl/install/
2. In backend folder:
   ```powershell
   cd backend
   fly launch
   fly deploy
   ```

3. You get: `https://mediguardian-backend.fly.dev`

**Pros:**
- ✅ Generous free tier
- ✅ Fast global CDN
- ✅ No sleep mode

**Cons:**
- ❌ Requires credit card (not charged unless you exceed free tier)

---

## Option 3: Port Forwarding (Your Home Router)

Make your home IP accessible from internet.

### Setup:
1. Find your public IP: https://whatismyipaddress.com
2. Login to your router (usually 192.168.1.1 or 192.168.2.1)
3. Find "Port Forwarding" settings
4. Add rule:
   - **External Port:** 4000
   - **Internal IP:** 192.168.2.116 (your PC)
   - **Internal Port:** 4000
   - **Protocol:** TCP

5. Update App.js:
   ```javascript
   const BACKEND_URL = 'http://YOUR_PUBLIC_IP:4000';
   ```

**Pros:**
- ✅ Free
- ✅ Full control

**Cons:**
- ❌ Security risk (exposing your home network)
- ❌ Public IP may change (need dynamic DNS)
- ❌ Not HTTPS (apps prefer HTTPS)
- ❌ ISP may block port 4000

---

## Quick Comparison

| Option | Cost | Setup Time | Best For |
|--------|------|------------|----------|
| **ngrok** | Free (with limits) | 2 minutes | Testing/MVP |
| **Render.com** | Free | 10 minutes | Production MVP |
| **Railway** | $5/month | 5 minutes | Production |
| **fly.io** | Free | 10 minutes | Production |
| **Port Forward** | Free | Varies | DIY/Learning |

---

## My Recommendation for Your MVP:

### For NOW (Testing):
**Use ngrok** - Get it working in 2 minutes while you test

### For LATER (Final MVP):
**Deploy to Render.com** - Free, permanent, always online

---

## Quick ngrok Setup (Do This Now)

```powershell
# 1. Download ngrok
# Visit: https://ngrok.com/download
# Extract ngrok.exe to M:\ngrok\

# 2. Make sure backend is running
docker-compose up -d

# 3. Start ngrok
cd M:\ngrok
.\ngrok.exe http 4000

# 4. Copy the https URL from ngrok output
# Example: https://abc-123-def.ngrok.io

# 5. Update frontend/App.js
# Change: const BACKEND_URL = 'http://192.168.2.116:4000';
# To:     const BACKEND_URL = 'https://abc-123-def.ngrok.io';

# 6. Rebuild APK
docker exec -it -e EAS_NO_VCS=1 -e EAS_PROJECT_ROOT=/app ramya-major-frontend-1 eas build --platform android --profile preview --non-interactive
```

---

Want me to help you set up ngrok right now? Or deploy to Render.com for a permanent solution?
