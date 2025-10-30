# MediGuardian - Complete Setup Instructions

## Problem
Node.js is not properly installed or not in your system PATH.

## Solution - Follow these steps exactly:

### Step 1: Download and Install Node.js 18

1. **Download Node.js 18.20.1:**
   - Open your browser
   - Go to: https://nodejs.org/dist/v18.20.1/node-v18.20.1-x64.msi
   - Save the file to your Downloads folder

2. **Install Node.js:**
   - Double-click the downloaded `node-v18.20.1-x64.msi` file
   - Click "Next" through all steps
   - **Important**: Make sure "Add to PATH" is checked (it's checked by default)
   - Click "Install"
   - Wait for installation to complete
   - Click "Finish"

3. **Restart your computer** (important - this ensures PATH is updated)

### Step 2: Verify Node Installation

After restart, open a NEW PowerShell window and run:

```powershell
node -v
npm -v
```

You should see:
```
v18.20.1
9.x.x (or similar)
```

### Step 3: Install Backend Dependencies

```powershell
cd M:\Desktop\Ramya-major\backend
npm install
```

This should complete without errors (takes 2-5 minutes).

### Step 4: Start the Server

```powershell
node index.js
```

You should see:
```
MediGuardian backend listening on port 4000
```

### Step 5: Test (Open a SECOND PowerShell window)

```powershell
cd M:\Desktop\Ramya-major\backend
node scripts\test_flow.js
```

Expected output:
```
Wrote test image to ...
Register response: {"success":true,"id":"...","name":"testpill"}
Verify response: {"match":true,"id":"...","name":"testpill","score":...}
```

## If You Still Get Errors:

### Error: "canvas" fails to install
This means you need Visual Studio Build Tools. Instead, I'll create a simpler version without canvas.

### Error: Node command not found after install
1. Check if Node is in: `C:\Program Files\nodejs\`
2. Manually add to PATH:
   - Windows key → type "environment variables"
   - Edit system environment variables
   - Click "Environment Variables"
   - Under "System variables", find "Path"
   - Click "Edit"
   - Click "New"
   - Add: `C:\Program Files\nodejs`
   - Click OK on all dialogs
   - Restart PowerShell

## Alternative: Simple Test Without Installation

If installation keeps failing, let me know and I'll create a Docker version or a cloud-hosted version you can test immediately.

## Next Steps After Success:

1. Frontend setup (Expo React Native app)
2. Add real pill images and test
3. Deploy to production

## Need Help?

Paste the exact error message you see and I'll provide the specific fix.
