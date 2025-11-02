# 🧪 Testing Notification System

## Step 1: Install APK & Login

1. Install the new APK (when build completes)
2. Open app and login
3. **Push token is registered automatically** ✅

---

## Step 2: Create a Test Schedule

After logging in, you need to **create a medication schedule**.

### Option A: Using curl (PowerShell)

Replace `YOUR_JWT_TOKEN` with the token from login:

```powershell
curl -X POST https://mediguardian-backend-latest.onrender.com/api/schedules `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer YOUR_JWT_TOKEN" `
  -d '{
    "userId": "YOUR_USER_ID",
    "medicationName": "Aspirin",
    "time": "14:30",
    "daysOfWeek": [0,1,2,3,4,5,6],
    "enabled": true
  }'
```

### Option B: Using Test Notification Endpoint

**Send a test notification RIGHT NOW** (no waiting):

```powershell
curl -X POST https://mediguardian-backend-latest.onrender.com/test-notification `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer YOUR_JWT_TOKEN" `
  -d '{
    "userId": "YOUR_USER_ID",
    "medicationName": "Test Medicine"
  }'
```

---

## Step 3: Verify Schedule Was Created

```powershell
curl https://mediguardian-backend-latest.onrender.com/api/schedules?userId=YOUR_USER_ID `
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Step 4: Wait for Scheduled Time

Once you create a schedule:
- **Scheduler checks every minute**
- **At the scheduled time** (e.g., 14:30), notification is sent
- **Phone receives notification** "Time to take Aspirin"

---

## 📱 How to Get Your JWT Token & User ID

### Method 1: From App Logs (ADB)

```powershell
M:\Downloads\platform-tools-latest-windows\platform-tools\adb.exe logcat -s ReactNativeJS:* | Select-String "token"
```

After login, you'll see:
```
[SUCCESS] Login successful! User: {id: "abc123", token: "eyJhbGc..."}
```

### Method 2: From Backend Response

When you login via app, check backend logs:
```powershell
docker logs ramya-major-backend-1 --tail 50 | Select-String "login"
```

---

## 🎯 Quick Test Flow

### Immediate Test (No Waiting):

1. **Install APK** ✅
2. **Login to app** ✅ (token auto-registered)
3. **Copy JWT token from logs**
4. **Send test notification**:
   ```powershell
   curl -X POST https://mediguardian-backend-latest.onrender.com/test-notification `
     -H "Content-Type: application/json" `
     -H "Authorization: Bearer YOUR_JWT" `
     -d '{"userId": "YOUR_ID", "medicationName": "Test Pill"}'
   ```
5. **Phone receives notification immediately** 🔔

---

### Scheduled Test (Automatic Reminders):

1. **Create schedule for 2 minutes from now**:
   - If current time is 14:28, set time to "14:30"
2. **Wait 2 minutes**
3. **Notification arrives automatically** 🔔

---

## 🔍 Troubleshooting

### Check if push token is registered:

```powershell
curl https://mediguardian-backend-latest.onrender.com/api/push/tokens
```

Expected:
```json
[
  {
    "userId": "user-123",
    "tokenPreview": "ExponentPushToken[xxxxxx...",
    "platform": "android"
  }
]
```

### Check backend scheduler logs:

```bash
# If using Render, check logs in dashboard
# If using local Docker:
docker logs ramya-major-backend-1 --tail 100 | Select-String "SCHEDULER"
```

Expected:
```
[SCHEDULER] Initializing medication reminder scheduler...
[SCHEDULER] Medication reminder scheduler started
[SCHEDULER] Found 0 schedule(s) at 14:28
[SCHEDULER] Found 1 schedule(s) at 14:30
[SCHEDULER] Sending reminder: Aspirin to user user-123
```

---

## 📊 Example: Full Working Schedule

```json
{
  "id": "schedule-abc123",
  "userId": "user-456",
  "medicationName": "Aspirin 100mg",
  "time": "08:00",
  "daysOfWeek": [1, 2, 3, 4, 5],
  "enabled": true,
  "createdAt": "2025-11-02T10:00:00.000Z"
}
```

**This will:**
- Send notification at 8:00 AM
- Only on weekdays (Monday-Friday)
- Notification says: "Time to take Aspirin 100mg"
- Tapping notification opens camera to verify pill

---

## ✅ Summary

**Already Working:**
- ✅ Backend scheduler (checks every minute)
- ✅ Push notification API endpoints
- ✅ Frontend auto-registers token on login

**You Need To Do:**
1. ⏳ Wait for APK build to complete
2. 📱 Install APK and login (token registers automatically)
3. 📅 Create a medication schedule via API
4. ⏰ Wait for scheduled time OR use `/test-notification` for instant test

**First notification will arrive when:**
- Schedule time matches current time
- OR you use the test endpoint
