# 📱 MediGuardian Notification System API

## Overview

The notification system allows the app to send push notifications to users for medication reminders. It uses **Expo Push Notifications** service.

---

## 🔧 Backend Endpoints

### 1. **Register Push Token**

Register a user's device to receive push notifications.

**Endpoint:** `POST /api/push/register`

**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <JWT_TOKEN>" (optional)
}
```

**Body:**
```json
{
  "userId": "user-123",
  "expoPushToken": "ExponentPushToken[xxxxxxxxxxxxxx]",
  "deviceInfo": {
    "platform": "android"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Push token registered successfully"
}
```

**When it's called:** Automatically when user logs in (see frontend App.js lines 84-90)

---

### 2. **Send Notification to User**

Send a push notification to a specific user.

**Endpoint:** `POST /api/push/send`

**Headers:**
```json
{
  "Content-Type": "application/json"
}
```

**Body:**
```json
{
  "userId": "user-123",
  "title": "Medication Reminder",
  "body": "Time to take your medication",
  "data": {
    "type": "reminder",
    "medicationName": "Aspirin"
  }
}
```

**Response:**
```json
{
  "success": true,
  "ticketCount": 1,
  "tickets": [
    {
      "status": "ok",
      "id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
    }
  ]
}
```

---

### 3. **Send Notification to All Users (Broadcast)**

Send a notification to all registered users.

**Endpoint:** `POST /api/push/send-to-all`

**Body:**
```json
{
  "title": "System Announcement",
  "body": "App maintenance scheduled for tonight",
  "data": {
    "type": "announcement"
  }
}
```

**Response:**
```json
{
  "success": true,
  "deviceCount": 5,
  "ticketCount": 5
}
```

---

### 4. **Get All Push Tokens**

Get a list of all registered push tokens (for debugging).

**Endpoint:** `GET /api/push/tokens`

**Response:**
```json
[
  {
    "userId": "user-123",
    "tokenPreview": "ExponentPushToken[xxxxxxxx...",
    "platform": "android",
    "createdAt": "2025-11-02T10:30:00.000Z",
    "updatedAt": "2025-11-02T10:30:00.000Z"
  }
]
```

---

### 5. **Unregister Push Token**

Remove a user's push token.

**Endpoint:** `DELETE /api/push/unregister`

**Body:**
```json
{
  "userId": "user-123",
  "expoPushToken": "ExponentPushToken[xxxxxxxxxxxxxx]"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Push token unregistered successfully"
}
```

---

### 6. **Test Notification**

Send a test notification (for debugging).

**Endpoint:** `POST /test-notification`

**Headers:**
```json
{
  "Authorization": "Bearer <JWT_TOKEN>"
}
```

**Body:**
```json
{
  "userId": "user-123",
  "medicationName": "Test Medication"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Test notification sent",
  "result": {
    "success": true,
    "ticketCount": 1
  }
}
```

---

## 📅 Medication Schedules

### 1. **Create Schedule**

Create a medication reminder schedule.

**Endpoint:** `POST /api/schedules`

**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <JWT_TOKEN>"
}
```

**Body:**
```json
{
  "userId": "user-123",
  "medicationName": "Aspirin",
  "time": "08:00",
  "daysOfWeek": [1, 2, 3, 4, 5],
  "enabled": true
}
```

**Days of Week:**
- 0 = Sunday
- 1 = Monday
- 2 = Tuesday
- 3 = Wednesday
- 4 = Thursday
- 5 = Friday
- 6 = Saturday

**Response:**
```json
{
  "success": true,
  "id": "schedule-123"
}
```

---

### 2. **Get User Schedules**

Get all schedules for a user.

**Endpoint:** `GET /api/schedules?userId=user-123`

**Headers:**
```json
{
  "Authorization": "Bearer <JWT_TOKEN>"
}
```

**Response:**
```json
[
  {
    "id": "schedule-123",
    "userId": "user-123",
    "medicationName": "Aspirin",
    "time": "08:00",
    "daysOfWeek": [1, 2, 3, 4, 5],
    "enabled": true,
    "createdAt": "2025-11-02T10:00:00.000Z"
  }
]
```

---

### 3. **Update Schedule**

Update an existing schedule.

**Endpoint:** `PUT /api/schedules/:id`

**Body:**
```json
{
  "medicationName": "Updated Medication",
  "time": "09:00",
  "enabled": false
}
```

---

### 4. **Delete Schedule**

Delete a schedule.

**Endpoint:** `DELETE /api/schedules/:id`

**Response:**
```json
{
  "success": true
}
```

---

## 🤖 Automatic Scheduler

The backend runs a **cron job every minute** that:

1. Checks all enabled schedules
2. Finds schedules matching the current time
3. Sends push notifications to users

**File:** `backend/scheduler.js`

**How it works:**

```javascript
// Runs every minute: * * * * *
Current time: 08:00

// Finds schedule:
{
  userId: "user-123",
  medicationName: "Aspirin",
  time: "08:00",
  enabled: true
}

// Sends notification:
{
  title: "Medication Reminder",
  body: "Time to take Aspirin",
  data: {
    type: "reminder",
    scheduleId: "schedule-123",
    medicationName: "Aspirin"
  }
}
```

---

## 📂 Database Structure

### Push Tokens Database (`db/push_tokens.json`)

```json
[
  {
    "userId": "user-123",
    "expoPushToken": "ExponentPushToken[xxxxxxxxxxxxxx]",
    "deviceInfo": {
      "platform": "android"
    },
    "createdAt": "2025-11-02T10:00:00.000Z",
    "updatedAt": "2025-11-02T10:00:00.000Z"
  }
]
```

### Schedules Database (`db/schedules.json`)

```json
[
  {
    "id": "schedule-123",
    "userId": "user-123",
    "medicationName": "Aspirin",
    "time": "08:00",
    "daysOfWeek": [1, 2, 3, 4, 5],
    "enabled": true,
    "createdAt": "2025-11-02T10:00:00.000Z"
  }
]
```

---

## 🧪 Testing Guide

### Test 1: Register Push Token

```bash
curl -X POST https://mediguardian-backend-latest.onrender.com/api/push/register \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "expoPushToken": "ExponentPushToken[YOUR_TOKEN_HERE]",
    "deviceInfo": {"platform": "android"}
  }'
```

### Test 2: Send Test Notification

```bash
curl -X POST https://mediguardian-backend-latest.onrender.com/api/push/send \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "title": "Test Notification",
    "body": "This is a test from the backend",
    "data": {"type": "test"}
  }'
```

### Test 3: Create Medication Schedule

```bash
curl -X POST https://mediguardian-backend-latest.onrender.com/api/schedules \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "userId": "user-123",
    "medicationName": "Aspirin",
    "time": "08:00",
    "daysOfWeek": [1,2,3,4,5],
    "enabled": true
  }'
```

### Test 4: Manual Test Notification

```bash
curl -X POST https://mediguardian-backend-latest.onrender.com/test-notification \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "userId": "user-123",
    "medicationName": "Test Pill"
  }'
```

---

## 📱 Frontend Integration

The frontend automatically:

1. **Registers for notifications on app start** (App.js line 43)
2. **Sends push token to backend after login** (App.js line 84-90)
3. **Listens for notification taps** (App.js line 52-61)

**When user taps notification:**
- App opens to camera screen
- Ready to verify medication

---

## 🚀 Deployment Checklist

✅ Backend files created:
- `backend/notifications.js` - Push notification API
- `backend/scheduler.js` - Automatic reminder scheduler

✅ Backend updated:
- `backend/index.js` - Integrated notification routes
- `backend/index.js` - Added `/test-notification` endpoint
- `backend/index.js` - Fixed `/register-pill` to accept `pill_name` and `user_id`

✅ Dependencies installed:
- `expo-server-sdk` - For sending push notifications
- `node-cron` - For scheduling automatic reminders

✅ Docker backend rebuilt and running

---

## 🔔 How to Use in Production

### For Users (Patients):

1. Open app
2. Grant notification permission
3. Login to account
4. App automatically registers device

### For Caregivers/Admins:

1. Create medication schedules via API
2. Schedule sends reminder at specified times
3. Patient receives notification
4. Patient taps notification → Opens camera → Verifies pill

---

## 🐛 Troubleshooting

**Problem:** Notifications not received

**Solutions:**
1. Check if push token is registered: `GET /api/push/tokens`
2. Verify token format starts with `ExponentPushToken[`
3. Check notification permissions in phone settings
4. Test with `/test-notification` endpoint
5. Check backend logs for errors

**Problem:** Scheduler not running

**Solutions:**
1. Check backend logs: `docker logs ramya-major-backend-1`
2. Verify schedules exist: `GET /api/schedules`
3. Ensure `enabled: true` on schedule
4. Check time format is `HH:MM` (e.g., "08:00")

---

## 📊 Monitoring

**View backend logs:**
```bash
docker logs -f ramya-major-backend-1
```

**Expected log output:**
```
[SCHEDULER] Initializing medication reminder scheduler...
[SCHEDULER] Medication reminder scheduler started
[PUSH] Registered token for user user-123: ExponentPushToken[xxxxx...
[SCHEDULER] Found 1 schedule(s) at 08:00
[SCHEDULER] Sending reminder: Aspirin to user user-123
[REMINDER] Sent reminder for Aspirin to user user-123
[SCHEDULER] Successfully sent reminder for schedule schedule-123
```

---

## 🎉 Next Steps

1. **Build and deploy frontend APK** with all changes
2. **Test notification flow end-to-end**
3. **Create medication schedules** for testing
4. **Monitor scheduler logs** to verify automatic reminders

---

**Backend Status:** ✅ Fully Implemented and Running

**Notification Endpoints:** ✅ Ready

**Auto Scheduler:** ✅ Active (runs every minute)

**Ready for Testing:** ✅ Yes
