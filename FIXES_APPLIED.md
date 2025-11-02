# Fixes Applied - November 2, 2025

## Backend Fixes (schedules.js)

### 1. Allow Patients to Create Schedules
**Before:** Only caregivers could create schedules (requireRole('caregiver'))
**After:** Any authenticated user can create their own schedules

### 2. Accept Frontend Schedule Format
**Before:** Required { patientId, pillId, times: [] }
**After:** Accepts simplified format from frontend:
```json
{
  "medicationName": "Aspirin 100mg",
  "time": "08:00",
  "daysOfWeek": [1,2,3,4,5],
  "enabled": true
}
```

### 3. Owner-Based Permissions
**Before:** Only caregivers could update/delete any schedule
**After:** 
- Caregivers can update/delete any schedule
- Patients can update/delete their own schedules (patientId === user.id)
- Returns 403 for unauthorized access

### 4. Better Field Support
**Before:** Only stored pillId and times
**After:** Stores:
- medicationName (for display)
- times (array, normalized from single time string)
- daysOfWeek (optional array)
- createdBy (tracks who created it)
- createdAt (timestamp)

---

## Frontend Fixes (App.js)

### 1. Better Login Error Messages
**Before:** Generic "Login failed" or "Invalid credentials"
**After:** Specific messages:
- "Invalid email or password. Please try again." (for invalid credentials)
- Shows actual server error message
- "Network Error" for connection issues

### 2. Better Schedule Creation Error Messages
**Before:** Generic "Failed to create schedule" or "Error"
**After:** 
- Shows server error message: "patientId and time(s) required"
- Shows HTTP status code
- "Network Error" for connection issues

---

## Deployment Status

### ✅ Backend
- Updated schedules.js pushed to Docker Hub
- Image: docker.io/nks21/mediguardian-backend:latest
- **Action Required:** Redeploy on Render dashboard to apply changes

### ✅ Frontend
- Improved error messages
- APK build in progress via EAS

---

## Testing Checklist

### Test Schedule Creation:
1. Login to app
2. Tap "Reminders" button
3. Create a reminder:
   - Medication: "Test Medicine"
   - Time: "14:30"
   - Days: Select Mon-Fri
4. Tap "Create Reminder"
5. **Expected:** "Medication reminder created!" success message

### Test Error Messages:
1. Try to login with wrong password
2. **Expected:** "Invalid email or password. Please try again."

### Test Schedule List:
1. After creating schedule, view "Your Reminders" list
2. **Expected:** Schedule appears with medication name, time, days, status

### Test Enable/Disable:
1. Tap "Disable" on a schedule
2. **Expected:** Status changes to "Disabled"

### Test Delete:
1. Tap "Delete" on a schedule
2. Confirm deletion
3. **Expected:** Schedule removed from list

---

## Backend API Changes

### POST /api/schedules
**Old Request:**
```json
{
  "patientId": "user-123",
  "pillId": "pill-456",
  "times": ["08:00", "20:00"],
  "label": "Take with food"
}
```

**New Request (also accepted):**
```json
{
  "medicationName": "Aspirin 100mg",
  "time": "08:00",
  "daysOfWeek": [1,2,3,4,5]
}
```

### PUT /api/schedules/:id
**Authorization:** Owner (patient) or caregiver
**Allowed Fields:** pillId, medicationName, times, daysOfWeek, active, label

### DELETE /api/schedules/:id
**Authorization:** Owner (patient) or caregiver

---

## Next Steps

1. **Redeploy Backend on Render:**
   - Go to Render dashboard
   - Select mediguardian-backend service
   - Click "Manual Deploy"
   - Wait for deployment

2. **Download APK:**
   - Check Expo dashboard for build completion
   - Download APK when ready

3. **Test Full Flow:**
   - Install new APK
   - Login
   - Create medication reminder
   - Wait for scheduled time
   - Receive notification
