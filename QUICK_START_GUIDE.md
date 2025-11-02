# MediGuardian - Quick Start Guide

## 🚀 What's New?

Your application has been completely redesigned with:
- **Separate Caregiver and Patient interfaces**
- **Professional navigation** with bottom tabs for caregivers
- **Role-based login** - Choose caregiver or patient at login
- **Patient assignment** - Caregivers can assign medications to specific patients
- **Improved UI/UX** - Clean, modern, user-friendly design

---

## 📱 Testing the Application

### Option 1: Run Locally (Recommended for Development)

```bash
# Start the containers
cd m:\Desktop\Ramya-major
docker-compose up -d

# The app will be available at:
# - Frontend: http://localhost:19006
# - Expo DevTools: http://localhost:19002
# - Backend: http://192.168.29.32:5002
```

### Option 2: Build New APK

```bash
# Build APK with new design
docker exec ramya-major-frontend-1 bash -c "cd /app && eas build --platform android --profile preview --non-interactive"

# Or if you need to login first:
docker exec -it ramya-major-frontend-1 bash
cd /app
eas login
eas build --platform android --profile preview --non-interactive
```

---

## 👥 User Workflows

### Creating Accounts

#### **Caregiver Account:**
1. Open app
2. Click **"Create New Account"**
3. Select **"Caregiver"** toggle
4. Enter email and password
5. Confirm password
6. Click **"Create Account"**

#### **Patient Account:**
1. Open app
2. Click **"Create New Account"**
3. Select **"Patient"** toggle
4. Enter email and password
5. Confirm password
6. Click **"Create Account"**

---

### Caregiver Workflow

#### **Login:**
1. Click **"Login as Caregiver"**
2. Enter email and password
3. Click **"Login"**

#### **Add Medication for Patient:**
1. Go to **"Add Tablet"** tab (bottom navigation)
2. Point camera at pill
3. Tap capture button
4. Enter medication name (e.g., "Aspirin")
5. **Select patient** from dropdown
6. Click **"Register Medication"**

#### **Set Medication Reminder:**
1. Go to **"Reminders"** tab
2. Click **"+ Add New Reminder"**
3. **Select patient** from dropdown
4. Enter medication name (e.g., "Aspirin")
5. Enter time in HH:MM format (e.g., "08:30")
6. (Optional) Select specific days of week
7. Click **"Create Reminder"**

#### **Manage Reminders:**
- **Disable:** Click "Disable" on any active reminder
- **Enable:** Click "Enable" on any disabled reminder
- **Delete:** Click "Delete" to remove permanently

#### **View Patient Notifications:**
1. Go to **"Alerts"** tab
2. See patient verification status
3. Receive fallback alerts when patients fail verification

---

### Patient Workflow

#### **Login:**
1. Click **"Login as Patient"**
2. Enter email and password
3. Click **"Login"**

#### **View Today's Medications:**
- Home screen shows:
  * Next medication and time (large card)
  * Today's full schedule
  * Step-by-step instructions

#### **Verify Medication (from Notification):**
1. Receive push notification at scheduled time
2. **Tap notification** → App opens automatically
3. Camera opens showing expected medication
4. Capture pill photo
5. System verifies:
   - ✅ **Correct pill:** "Please take your medication now"
   - ❌ **Wrong pill:** "This is not the correct medication. Please try again"
6. After 3 failed attempts → Caregiver receives fallback notification

#### **Manual Verification:**
1. Open app
2. Click **"Manual Verification"** button
3. Capture pill photo
4. Get verification result

---

## 🎯 Key Differences from Old Version

| Feature | Old Version | New Version |
|---------|------------|-------------|
| **Navigation** | State-based (one screen) | React Navigation (multi-screen) |
| **Login** | Simple login | Role-based login (Caregiver/Patient) |
| **Patient Assignment** | No assignment | Select patient from dropdown |
| **UI Design** | Basic | Professional cards & tabs |
| **Caregiver Interface** | No separate interface | 4-tab navigation (Home, Add, Reminders, Alerts) |
| **Patient Interface** | Same as caregiver | Simplified, notification-focused |
| **Reminders** | Basic | Full CRUD with patient selection |
| **Verification** | Simple | Retry logic + fallback to caregiver |

---

## 🔧 Backend Configuration

### Current Backend URL (Local):
```javascript
// In all screen files:
const BACKEND_URL = 'http://192.168.29.32:5002';
```

### To Change to Remote Backend:
Replace `http://192.168.29.32:5002` with:
```javascript
const BACKEND_URL = 'https://mediguardian-backend-latest.onrender.com';
```

**Files to update:**
- `src/screens/common/LoginScreen.js`
- `src/screens/common/SignupScreen.js`
- `src/screens/caregiver/CaregiverHomeScreen.js`
- `src/screens/caregiver/AddTabletScreen.js`
- `src/screens/caregiver/ManageRemindersScreen.js`
- `src/screens/patient/PatientHomeScreen.js`
- `src/screens/patient/VerifyPillScreen.js`
- `App.js` (push notification registration)

**Tip:** Create a `src/config.js` file:
```javascript
export const BACKEND_URL = 'http://192.168.29.32:5002';
```
Then import in all files: `import { BACKEND_URL } from '../config';`

---

## 📋 Testing Checklist

### ✅ Caregiver Tests:
- [ ] Create caregiver account
- [ ] Login as caregiver
- [ ] View dashboard with stats
- [ ] Add medication with patient assignment
- [ ] Create medication reminder for patient
- [ ] Edit reminder (enable/disable)
- [ ] Delete reminder
- [ ] View patient list
- [ ] Logout

### ✅ Patient Tests:
- [ ] Create patient account
- [ ] Login as patient
- [ ] View today's medications
- [ ] See next medication card
- [ ] Manual verification works
- [ ] Receive push notification (wait for scheduled time)
- [ ] Tap notification → Camera opens
- [ ] Verify correct pill → Success message
- [ ] Verify wrong pill → Retry message
- [ ] 3 failed attempts → Fallback to caregiver

### ✅ Integration Tests:
- [ ] Caregiver adds medication for Patient A
- [ ] Caregiver sets 2 reminders for Patient A
- [ ] Patient A sees both reminders in schedule
- [ ] Patient A receives notification at scheduled time
- [ ] Patient A verifies successfully
- [ ] Caregiver sees success notification

---

## 🐛 Troubleshooting

### Problem: "Cannot find module '@react-navigation/native'"
**Solution:** Dependencies are installed. Restart container:
```bash
docker-compose restart frontend
```

### Problem: "Push notifications not working"
**Solution:** 
1. Check if Expo push token is registered
2. Verify backend scheduler is running
3. Check time format matches (HH:MM in 24-hour format)

### Problem: "Patient dropdown is empty"
**Solution:** 
1. Create patient accounts first
2. Ensure backend `/auth/users` endpoint works
3. Check network connection

### Problem: "Camera not opening"
**Solution:**
1. Grant camera permissions
2. Test on physical device (camera doesn't work in web browser)
3. Use Expo Go app or build APK

---

## 📱 Screen Navigation Map

```
┌─────────────────────────────────────┐
│         Welcome Screen              │
│  ┌───────────────────────────────┐  │
│  │  Login as Caregiver           │  │
│  │  Login as Patient             │  │
│  │  Create New Account           │  │
│  └───────────────────────────────┘  │
└───────┬─────────────────────────────┘
        │
        ├─ Caregiver Login ────────────────────┐
        │                                       │
        │  ┌───────────────────────────────┐   │
        │  │ Bottom Tab Navigation         │   │
        │  ├───────────────────────────────┤   │
        │  │ 🏠 Home                       │   │
        │  │ ➕ Add Tablet                │   │
        │  │ ⏰ Reminders                 │   │
        │  │ 🔔 Alerts                    │   │
        │  └───────────────────────────────┘   │
        │                                       │
        └─ Patient Login ─────────────────────┐
                                               │
           ┌───────────────────────────────┐   │
           │ Stack Navigation              │   │
           ├───────────────────────────────┤   │
           │ Patient Home                  │   │
           │   ↓                          │   │
           │ Verify Pill                   │   │
           └───────────────────────────────┘   │
```

---

## 🎉 Success Metrics

Your application now has:
- **8 professional screens**
- **3-level navigation hierarchy**
- **Role-based access control**
- **Patient-specific medication management**
- **Comprehensive reminder system**
- **Verification workflow with fallback**

**Next:** Build APK and deploy to production! 🚀

---

## 📞 Need Help?

Common issues and solutions:
1. **Container not starting:** Run `docker-compose down` then `docker-compose up -d`
2. **Build errors:** Delete `node_modules` and reinstall: `npm install`
3. **Network errors:** Check backend URL configuration
4. **Camera not working:** Test on physical device, not web

For Phase 3 implementation (call-style notifications, backend enhancements), check `PHASE_2_COMPLETE.md` for detailed roadmap!
