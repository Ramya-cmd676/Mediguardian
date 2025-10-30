# Deploy MediGuardian Backend to Render.com

## Step-by-Step Deployment Guide

### 1. Create GitHub Repository (5 minutes)

**First, push your code to GitHub:**

```powershell
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - MediGuardian MVP"

# Create a new repository on GitHub:
# - Go to: https://github.com/new
# - Name: mediguardian-mvp
# - Click "Create repository"

# Add remote and push
git remote add origin https://github.com/YOUR_USERNAME/mediguardian-mvp.git
git branch -M main
git push -u origin main
```

### 2. Deploy to Render.com (5 minutes)

1. **Sign up for Render.com**
   - Go to: https://render.com
   - Click "Get Started for Free"
   - Sign up with GitHub (easiest option)

2. **Create New Web Service**
   - Click "New +" button
   - Select "Web Service"
   - Click "Connect" next to your `mediguardian-mvp` repository
   - OR use "Public Git repository" and paste: your GitHub repo URL

3. **Configure the Service**
   - **Name:** `mediguardian-backend`
   - **Region:** Choose closest to you (e.g., Singapore)
   - **Branch:** `main`
   - **Root Directory:** `backend`
   - **Environment:** `Docker`
   - **Dockerfile Path:** `Dockerfile` (relative to root directory)
   - **Plan:** `Free`

4. **Click "Create Web Service"**
   - Render will start building and deploying
   - Takes about 2-3 minutes
   - You'll see build logs in real-time

5. **Get Your URL**
   - Once deployed, you'll see: `https://mediguardian-backend.onrender.com`
   - Copy this URL!

### 3. Update Frontend with Render URL

Once you have the Render URL, update `frontend/App.js`:

```javascript
const BACKEND_URL = 'https://mediguardian-backend.onrender.com';
```

Then rebuild the APK!

---

## Important Notes

### Free Tier Limitations:
- ✅ 750 hours/month (unlimited for single service)
- ✅ Automatic HTTPS
- ✅ Persistent storage
- ⚠️ **Sleeps after 15 minutes of inactivity**
  - First request after sleep takes ~30 seconds
  - Add loading message: "Waking up server..." in your app

### Keep Service Awake (Optional):
You can use a free cron job service to ping your backend every 10 minutes:
- Go to: https://cron-job.org
- Add job: `GET https://mediguardian-backend.onrender.com/health` every 10 minutes

---

## Quick Start Commands

```powershell
# 1. Initialize git and push to GitHub
cd M:\Desktop\Ramya-major
git init
git add .
git commit -m "MediGuardian MVP - Backend with AI pill recognition"

# Create repo on GitHub first, then:
git remote add origin https://github.com/YOUR_USERNAME/mediguardian-mvp.git
git branch -M main
git push -u origin main

# 2. Then go to render.com and deploy!
```

---

## Alternative: Deploy Without GitHub

If you don't want to use GitHub, you can deploy using Render's CLI:

```powershell
# Install Render CLI
npm install -g render

# Login
render login

# Deploy
render deploy
```

But GitHub deployment is easier and recommended!

---

## After Deployment

1. Test your Render URL:
   ```powershell
   curl https://YOUR-APP-NAME.onrender.com/health
   # Should return: {"status":"ok"}
   ```

2. Update `frontend/App.js` with the new URL

3. Rebuild APK one final time

4. Your app will work from **anywhere in the world**! 🎉

---

Need help with any step? Let me know!
