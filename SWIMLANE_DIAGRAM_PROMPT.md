# Swimlane Diagram Generation Prompts

## Instructions
Copy and paste these prompts into diagram generation tools like:
- **Mermaid Live Editor** (https://mermaid.live)
- **PlantUML** (https://plantuml.com)
- **Lucidchart** (https://lucid.app)
- **Draw.io / diagrams.net** (https://app.diagrams.net)
- **AI Tools** (ChatGPT, Claude, etc. with diagram capabilities)

---

## Prompt 1: Complete Medication Reminder Flow

```
Create a detailed swimlane diagram for a medication reminder system with the following components and flow:

SWIMLANES (5 vertical columns):
1. Patient Mobile App
2. Backend API Server
3. AI/TensorFlow Module
4. Expo Push Notification Service
5. Caregiver Mobile App

FLOW SEQUENCE:

**Phase 1: App Initialization**
- Patient App: App starts → Load session from AsyncStorage → Auto-login
- Patient App → Backend API: Send JWT token for verification
- Backend API: Validate JWT token (check expiry < 12 hours)
- Backend API → Patient App: Return authentication status
- Patient App: Register push notification token
- Patient App → Backend API: Send Expo push token
- Backend API: Store token in push_tokens.json database
- Patient App: Display home screen

**Phase 2: Schedule Creation (by Caregiver)**
- Caregiver App: Login → Navigate to "Manage Reminders"
- Caregiver App: Create new schedule with:
  * Patient selection
  * Pill/medication name
  * Time (e.g., "09:00" IST)
  * Days of week
- Caregiver App → Backend API: POST /api/schedules with schedule data
- Backend API: Save schedule to schedules.json with fields:
  * id, userId (patientId), pillId, medicationName, time, daysOfWeek, active: true

**Phase 3: Automated Reminder (Cron Scheduler)**
- Backend API: Cron job runs every minute
- Backend API: Get current UTC time
- Backend API: Convert UTC to IST (add 5 hours 30 minutes)
- Backend API: Format as "HH:MM" (e.g., "09:00")
- Backend API: Load all active schedules from schedules.json
- Backend API: Match current IST time with schedule.time AND current day with schedule.daysOfWeek
- Backend API: When match found → Prepare notification with scheduleId

**Phase 4: Push Notification Delivery**
- Backend API → AI/TensorFlow: Get medication details
- AI/TensorFlow: Create notification message:
  * Title: "Time for your medication"
  * Body: "Please take [MedicationName]"
  * Data: {scheduleId: "xxx"}
- AI/TensorFlow → Expo Push Service: Send notification with patient's push token
- Expo Push Service → Patient App: Deliver notification with MAX priority on "medication-reminders" channel
- Patient App: Display notification on device

**Phase 5: User Interaction & Verification**
- Patient App: User taps notification
- Patient App: Navigate to VerifyPillScreen with params (scheduleId, medicationName)
- Patient App: Open camera for pill capture
- Patient App: User captures photo of pill
- Patient App → Backend API: POST /verify-pill with image file + scheduleId
- Backend API: Load schedule by scheduleId from schedules.json
- Backend API: Extract pillId from schedule
- Backend API → AI/TensorFlow: Send image for processing
- AI/TensorFlow: Preprocess image (resize to 224x224, normalize 0-1, enhance brightness)
- AI/TensorFlow: Load MobileNetV2 model (if not loaded)
- AI/TensorFlow: Extract multi-layer embeddings:
  * Global pooling layer: 1024 features
  * Intermediate layer: 50 features
  * Prediction layer: 256 features
  * Total: 1330-dimensional embedding vector
- AI/TensorFlow: Load registered pill embedding from pills.json (using pillId)
- AI/TensorFlow: Calculate similarity score:
  * Cosine similarity: 70% weight
  * Euclidean distance: 30% weight
  * Combined score threshold: 0.65
- AI/TensorFlow → Backend API: Return match result (true/false) + confidence score
- Backend API → Patient App: Return verification result

**Phase 6: Result Handling & Caregiver Alert**
- Patient App: Check if match = true
- IF MATCH = TRUE:
  * Patient App: Display "Medication verified successfully!" message
  * Patient App: Reset retry counter
- IF MATCH = FALSE:
  * Patient App: Increment retry counter
  * Patient App: Display "Wrong medication detected. Please try again."
  * Patient App: Check if retry counter < 3
    - IF retry < 3: Allow re-capture
    - IF retry >= 3: Trigger caregiver notification
      * Patient App → Backend API: POST /api/push/send-to-role with role="caregiver"
      * Backend API: Load all users with role="caregiver" from users.json
      * Backend API: Get push tokens for all caregivers
      * Backend API → Expo Push Service: Send alert notification
      * Expo Push Service → Caregiver App: Deliver alert "Patient failed to verify medication after 3 attempts"
      * Caregiver App: Display alert notification

VISUAL REQUIREMENTS:
- Use clear arrows showing data flow between components
- Label each arrow with data being transmitted (e.g., "JWT token", "image + scheduleId")
- Show decision points as diamonds (e.g., "Token Valid?", "Match = true?")
- Use different colors for each swimlane
- Include timestamps where relevant (e.g., "09:00 IST")
- Show database operations (schedules.json, pills.json, users.json, push_tokens.json)
- Highlight the IST timezone conversion step
- Mark retry logic clearly with counter (1, 2, 3)

TECHNICAL DETAILS TO INCLUDE:
- JWT expiry: 12 hours
- Image preprocessing: 224x224 resize, 0-1 normalization
- Embedding dimensions: 1330 features (1024 + 50 + 256)
- Similarity threshold: 0.65
- Timezone: UTC to IST (+5:30)
- Retry limit: 3 attempts
- Notification channel: "medication-reminders"
- Notification priority: MAX
```

---

## Prompt 2: User Registration and Pill Registration Flow

```
Create a swimlane diagram showing user registration and pill registration process:

SWIMLANES (4 vertical columns):
1. User Mobile App
2. Backend API Server
3. AI/TensorFlow Module
4. JSON Database

FLOW SEQUENCE:

**Part A: User Signup**
- User App: Display signup screen
- User App: Collect user input:
  * Name (text)
  * Email (text)
  * Password (text)
  * Role (dropdown: "patient" or "caregiver")
- User App → Backend API: POST /auth/register with user data
- Backend API: Validate input fields (non-empty, valid email format)
- Backend API → Database: Check if email already exists in users.json
- Database → Backend API: Return duplicate check result
- IF duplicate:
  * Backend API → User App: Return error "Email already registered"
  * User App: Display error message
- IF not duplicate:
  * Backend API: Hash password using bcrypt (8 salt rounds)
  * Backend API: Generate unique user ID (timestamp + random string)
  * Backend API: Create user object:
    - id, name, email, role, passwordHash, createdAt
  * Backend API → Database: Append user to users.json
  * Backend API → User App: Return success message
  * User App: Navigate to login screen

**Part B: User Login**
- User App: Display login screen
- User App: Collect credentials (email, password)
- User App → Backend API: POST /auth/login with credentials
- Backend API → Database: Find user by email in users.json
- Database → Backend API: Return user object (or null if not found)
- Backend API: Verify password using bcrypt.compare(inputPassword, user.passwordHash)
- IF password incorrect:
  * Backend API → User App: Return error "Invalid credentials"
  * User App: Display error
- IF password correct:
  * Backend API: Generate JWT token with payload:
    - userId, email, role, exp: 12 hours from now
  * Backend API → User App: Return {token, user: {id, name, email, role}}
  * User App: Save to AsyncStorage:
    - Key "userToken": JWT string
    - Key "userInfo": JSON.stringify(user)
  * User App: Navigate to home screen based on role:
    - role="patient" → PatientHomeScreen
    - role="caregiver" → CaregiverHomeScreen

**Part C: Pill Registration**
- User App: From home screen, tap "Register Pill" button
- User App: Open camera component (expo-camera)
- User App: User captures photo of pill
- User App: Display captured image preview
- User App: Prompt for pill name (text input)
- User App: User enters medication name (e.g., "Aspirin 500mg")
- User App → Backend API: POST /register-pill with:
  * FormData containing image file (JPEG/PNG)
  * Pill name (string)
  * Authorization header with JWT token
- Backend API: Verify JWT token (decode and check expiry)
- Backend API: Extract userId from token
- Backend API → AI/TensorFlow: Send image buffer for processing
- AI/TensorFlow: Check if MobileNetV2 model is loaded
  * IF not loaded: Load model from @tensorflow-models/mobilenet
  * Model configuration: version 2, alpha 1.0
- AI/TensorFlow: Preprocess image:
  * Decode image buffer to tensor
  * Resize to 224x224 pixels
  * Normalize pixel values to [0, 1] range
  * Apply brightness enhancement (+10%)
- AI/TensorFlow: Extract embeddings (3 image variations):
  * Variation 1: Original preprocessed image
  * Variation 2: Brightness +5%
  * Variation 3: Brightness +15%
- AI/TensorFlow: For each variation, extract multi-layer features:
  * Global average pooling layer → 1024 features
  * Intermediate convolutional layer → 50 features
  * Final prediction layer → 256 features
  * Concatenate: 1330 features per variation
- AI/TensorFlow: Average embeddings across 3 variations
- AI/TensorFlow → Backend API: Return averaged 1330-dimensional embedding vector
- Backend API: Generate unique pill ID (timestamp-random)
- Backend API: Save image file to disk:
  * Path: uploads/[pillId].jpg
  * Format: JPEG, quality 90%
- Backend API: Create pill record:
  * id: pillId
  * name: medication name
  * userId: from JWT
  * embedding: 1330-dimensional array
  * imagePath: "uploads/[pillId].jpg"
  * createdAt: ISO timestamp
- Backend API → Database: Append pill record to pills.json
- Backend API → User App: Return success {id: pillId, name: medication name}
- User App: Display success message "Pill registered successfully!"
- User App: Navigate back to home screen

VISUAL REQUIREMENTS:
- Show image data flow as thick arrows
- Indicate file upload with FormData
- Show JWT token in request headers
- Display database schema for users.json and pills.json
- Highlight the 3-variation embedding extraction
- Show the 1330-feature composition (1024 + 50 + 256)
- Mark bcrypt hashing operation
- Indicate AsyncStorage operations

TECHNICAL DETAILS:
- Bcrypt rounds: 8
- JWT expiry: 12 hours
- Image format: JPEG, quality 90%
- Image size: 224x224 pixels
- Embedding dimensions: 1330 (averaged from 3 variations)
- MobileNet version: 2, alpha: 1.0
```

---

## Prompt 3: Schedule Management and Cron Scheduler Flow

```
Create a swimlane diagram for medication schedule creation and automated reminder triggering:

SWIMLANES (4 vertical columns):
1. Caregiver Mobile App
2. Backend API Server
3. JSON Database
4. Cron Scheduler (Background Process)

FLOW SEQUENCE:

**Part A: Caregiver Creates Schedule**
- Caregiver App: Login with caregiver credentials
- Caregiver App: Navigate to "Manage Reminders" screen
- Caregiver App → Backend API: GET /users?role=patient
- Backend API → Database: Load users.json and filter by role="patient"
- Backend API → Caregiver App: Return list of patients [{id, name, email}]
- Caregiver App: Display patient dropdown
- Caregiver App → Backend API: GET /pills
- Backend API → Database: Load all pills from pills.json
- Backend API → Caregiver App: Return pill list [{id, name, userId}]
- Caregiver App: Display pill dropdown (filtered by selected patient's pills)
- Caregiver App: Display schedule creation form:
  * Patient selector (dropdown)
  * Medication selector (dropdown)
  * Time picker (12/24 hour format)
  * Days of week (multi-select checkboxes: Mon, Tue, Wed, Thu, Fri, Sat, Sun)
- Caregiver App: User fills form:
  * Example: Patient "John Doe", Medication "Aspirin", Time "09:00", Days [Mon, Wed, Fri]
- Caregiver App → Backend API: POST /api/schedules with:
  * userId: patient's ID
  * pillId: selected pill ID
  * medicationName: "Aspirin"
  * time: "09:00"
  * daysOfWeek: ["Mon", "Wed", "Fri"]
- Backend API: Validate input:
  * Check userId exists
  * Check pillId exists
  * Validate time format (HH:MM)
  * Validate daysOfWeek is non-empty array
- Backend API: Normalize time to HH:MM format (pad with zeros if needed)
- Backend API: Generate unique schedule ID
- Backend API: Create schedule object:
  * id: scheduleId
  * userId: patient ID
  * pillId: pill ID
  * medicationName: "Aspirin"
  * time: "09:00"
  * daysOfWeek: ["Mon", "Wed", "Fri"]
  * active: true
  * createdAt: ISO timestamp
- Backend API → Database: Append schedule to schedules.json
- Backend API → Caregiver App: Return {success: true, scheduleId}
- Caregiver App: Display confirmation "Reminder created successfully!"

**Part B: Automated Scheduler (Runs Continuously)**
- Cron Scheduler: Initialize with cron pattern "* * * * *" (every minute)
- Cron Scheduler: Trigger at minute boundary (e.g., 09:00:00)
- Cron Scheduler: Get current UTC timestamp from system clock
- Cron Scheduler: Convert UTC to IST:
  * IST offset = 5.5 hours = 5 * 60 + 30 = 330 minutes
  * istTime = new Date(utcTime.getTime() + 330 * 60 * 1000)
- Cron Scheduler: Extract IST time components:
  * currentTime = format as "HH:MM" (e.g., "09:00")
  * currentDay = get day name (e.g., "Mon")
- Cron Scheduler: Log: "Checking schedules at IST: 09:00 (UTC: 03:30)"
- Cron Scheduler → Database: Load all schedules from schedules.json
- Database → Cron Scheduler: Return schedule array
- Cron Scheduler: For each schedule in array:
  * Check if schedule.active === true
  * Check if currentDay is in schedule.daysOfWeek array
  * Check if currentTime === schedule.time
- Cron Scheduler: IF all conditions match:
  * Log: "Match found for schedule [scheduleId]"
  * Prepare notification data:
    - userId: schedule.userId
    - medicationName: schedule.medicationName
    - scheduleId: schedule.id
- Cron Scheduler → Backend API: Call sendMedicationReminder(userId, medicationName, scheduleId)
- Backend API → Database: Load push tokens for userId from push_tokens.json
- Backend API: Construct Expo push notification:
  * to: user's push token
  * title: "Time for your medication"
  * body: "Please take [medicationName]"
  * data: {scheduleId, medicationName}
  * sound: "default"
  * priority: "high"
  * channelId: "medication-reminders"
- Backend API → Expo Push Service: Send notification via Expo SDK
- Expo Push Service: Return ticket {id, status: "ok"}
- Backend API: Log notification sent successfully
- Cron Scheduler: Continue to next schedule or wait for next minute

**Part C: Schedule Editing/Deletion (Optional)**
- Caregiver App: View list of active schedules
- Caregiver App: Select schedule to edit/delete
- FOR EDIT:
  * Caregiver App → Backend API: PUT /api/schedules/:id with updated data
  * Backend API → Database: Update schedule in schedules.json
- FOR DELETE:
  * Caregiver App → Backend API: DELETE /api/schedules/:id
  * Backend API → Database: Set schedule.active = false in schedules.json
  * (Soft delete - keeps record but won't trigger)

VISUAL REQUIREMENTS:
- Show cron scheduler as continuous loop in separate swimlane
- Highlight the UTC to IST conversion with formula
- Show time matching logic clearly (time AND day)
- Display schedules.json structure
- Mark the difference between UTC and IST times
- Show notification payload structure
- Use clock icons for time-related steps

TECHNICAL DETAILS:
- Cron pattern: "* * * * *" (every minute)
- IST offset: UTC + 5 hours 30 minutes (+330 minutes)
- Time format: "HH:MM" (24-hour, zero-padded)
- Days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
- Notification channel: "medication-reminders"
- Notification priority: "high"
- Soft delete: active flag set to false
```

---

## Prompt 4: Session Persistence and Auto-Login Flow

```
Create a swimlane diagram for app session management and auto-login:

SWIMLANES (3 vertical columns):
1. Mobile App (React Native)
2. AsyncStorage (Local Storage)
3. Backend API Server

FLOW SEQUENCE:

**Part A: App Launch and Auto-Login**
- Mobile App: App launches (user opens app)
- Mobile App: Initialize React Navigation
- Mobile App → AsyncStorage: Request getItem("userToken")
- AsyncStorage → Mobile App: Return token value or null
- Mobile App → AsyncStorage: Request getItem("userInfo")
- AsyncStorage → Mobile App: Return user JSON string or null
- Mobile App: Check if token exists
- IF token is NULL:
  * Mobile App: Navigate to LoginScreen
  * Display login form
  * STOP
- IF token EXISTS:
  * Mobile App: Parse userInfo JSON to object
  * Mobile App → Backend API: POST /auth/verify with token in Authorization header
  * Backend API: Extract token from "Bearer [token]"
  * Backend API: Decode JWT using jsonwebtoken library
  * Backend API: Check token signature (validate with secret key)
  * Backend API: Check expiry time (exp field in payload)
  * Backend API: Calculate if exp > current timestamp
  * IF expired OR invalid signature:
    - Backend API → Mobile App: Return {valid: false, error: "Token expired"}
    - Mobile App → AsyncStorage: Call removeItem("userToken")
    - Mobile App → AsyncStorage: Call removeItem("userInfo")
    - Mobile App: Navigate to LoginScreen
    - Display message "Session expired. Please login again."
  * IF valid:
    - Backend API → Mobile App: Return {valid: true, user: {id, name, email, role}}
    - Mobile App: Set global user context/state
    - Mobile App: Navigate based on user.role:
      * role === "patient" → PatientNavigator (PatientHomeScreen)
      * role === "caregiver" → CaregiverNavigator (CaregiverHomeScreen)

**Part B: User Login (Manual)**
- Mobile App: User on LoginScreen
- Mobile App: Display email and password input fields
- Mobile App: User enters credentials and taps "Login"
- Mobile App: Validate input (non-empty fields, email format)
- Mobile App → Backend API: POST /auth/login with {email, password}
- Backend API: Query users.json for user with matching email
- Backend API: Compare password with bcrypt.compare()
- IF invalid:
  * Backend API → Mobile App: Return {error: "Invalid credentials"}
  * Mobile App: Display error message
- IF valid:
  * Backend API: Generate new JWT with:
    - payload: {userId, email, role}
    - secret: from environment variable
    - expiresIn: "12h"
  * Backend API → Mobile App: Return {token: "jwt-string", user: {id, name, email, role}}
  * Mobile App → AsyncStorage: Call setItem("userToken", token)
  * Mobile App → AsyncStorage: Call setItem("userInfo", JSON.stringify(user))
  * AsyncStorage: Persist data to device storage
  * Mobile App: Set global user state
  * Mobile App: Navigate to role-based home screen

**Part C: User Logout**
- Mobile App: User taps "Logout" button
- Mobile App → AsyncStorage: Call removeItem("userToken")
- Mobile App → AsyncStorage: Call removeItem("userInfo")
- AsyncStorage: Delete stored data
- Mobile App: Clear global user state
- Mobile App: Navigate to LoginScreen
- Mobile App: Display message "Logged out successfully"

**Part D: Token Refresh (Optional - if implemented)**
- Mobile App: Detect token near expiry (check exp field)
- Mobile App → Backend API: POST /auth/refresh with current token
- Backend API: Validate current token
- Backend API: Generate new token with extended expiry
- Backend API → Mobile App: Return new token
- Mobile App → AsyncStorage: Update "userToken" with new value
- Mobile App: Continue session without interruption

VISUAL REQUIREMENTS:
- Show AsyncStorage as middle swimlane (local storage layer)
- Display JWT token structure (header.payload.signature)
- Show token expiry check logic
- Indicate navigation decisions based on role
- Mark data persistence operations
- Show clear difference between auto-login and manual login
- Display error handling paths

TECHNICAL DETAILS:
- Storage keys: "userToken", "userInfo"
- JWT expiry: 12 hours (43200 seconds)
- JWT algorithm: HS256
- Storage method: AsyncStorage (React Native)
- Password hashing: bcrypt with 8 rounds
- Navigation: React Navigation (stack navigator)
```

---

## Prompt 5: AI-Powered Pill Verification with Retry Logic

```
Create a detailed swimlane diagram focusing ONLY on the pill verification process with AI:

SWIMLANES (3 vertical columns):
1. Patient Mobile App
2. Backend API Server
3. AI/TensorFlow Module

FLOW SEQUENCE:

**Part A: Verification Initiation**
- Patient App: User taps notification → VerifyPillScreen opens
- Patient App: Receive params from navigation:
  * scheduleId: "sched_12345"
  * medicationName: "Aspirin 500mg"
- Patient App: Display camera view (expo-camera)
- Patient App: Initialize retry counter = 0
- Patient App: Display "Capture pill image to verify"

**Part B: Image Capture and Processing**
- Patient App: User taps "Capture" button
- Patient App: Take photo using camera
- Patient App: Get image URI from camera
- Patient App: Convert image to blob/FormData
- Patient App: Create FormData with:
  * Append file: image (key: "image", filename: "pill.jpg")
  * Append text: scheduleId (key: "scheduleId")
- Patient App → Backend API: POST /verify-pill with FormData + JWT token
- Backend API: Extract JWT and verify authentication
- Backend API: Extract scheduleId from request body
- Backend API: Load schedules.json and find schedule by scheduleId
- Backend API: Extract pillId from schedule object
- Backend API: Load pills.json and find registered pill by pillId
- Backend API: IF pill not found:
  * Backend API → Patient App: Return {error: "scheduled_pill_not_found"}
  * Patient App: Display "This medication is not registered. Please contact caregiver."
  * STOP
- Backend API: Extract pill.embedding (1330-dimensional array)
- Backend API: Decode uploaded image from FormData
- Backend API → AI/TensorFlow: Send image buffer for embedding extraction

**Part C: AI Processing**
- AI/TensorFlow: Receive image buffer
- AI/TensorFlow: Check if MobileNetV2 model is loaded in memory
  * IF not loaded:
    - Load @tensorflow-models/mobilenet
    - Version: 2, Alpha: 1.0
    - Wait for model ready
- AI/TensorFlow: Preprocess uploaded image:
  * Step 1: Decode buffer to tensor
  * Step 2: Resize to 224x224 using bilinear interpolation
  * Step 3: Normalize to [0, 1] by dividing by 255
  * Step 4: Enhance brightness by adding 0.1 (capped at 1.0)
  * Step 5: Expand dimensions for batch processing
- AI/TensorFlow: Extract embeddings from model:
  * Layer 1 - Global Average Pooling:
    - Get output from 'conv_pw_13_relu' layer
    - Apply global average pooling
    - Result: 1024 features
  * Layer 2 - Intermediate Features:
    - Get output from 'conv_pw_7_relu' layer
    - Apply global average pooling
    - Flatten to 50 features
  * Layer 3 - Prediction Layer:
    - Get model predictions (1000 classes)
    - Take top 256 values
    - Result: 256 features
  * Concatenate all layers: [1024, 50, 256] = 1330 features
- AI/TensorFlow: Create 2 more variations:
  * Variation 1: Original (brightness +10%)
  * Variation 2: Brightness +5%
  * Variation 3: Brightness +15%
- AI/TensorFlow: Extract embeddings for each variation (3x1330 features)
- AI/TensorFlow: Average embeddings across 3 variations
- AI/TensorFlow: Result = 1330-dimensional averaged embedding
- AI/TensorFlow: Load registered pill embedding (1330-dimensional)
- AI/TensorFlow: Calculate cosine similarity:
  * Formula: dot(A, B) / (norm(A) * norm(B))
  * Range: [-1, 1], where 1 = identical
- AI/TensorFlow: Calculate euclidean distance:
  * Formula: sqrt(sum((A[i] - B[i])^2))
  * Normalize by dividing by sqrt(1330)
  * Invert: similarity = 1 - normalized_distance
- AI/TensorFlow: Combine similarities:
  * finalScore = (cosineSimilarity * 0.7) + (euclideanSimilarity * 0.3)
- AI/TensorFlow: Apply adaptive threshold:
  * IF euclidean distance < 0.5: threshold = 0.50
  * ELSE IF distance < 1.0: threshold = 0.55
  * ELSE IF distance < 1.5: threshold = 0.60
  * ELSE: threshold = 0.65
- AI/TensorFlow: Determine match:
  * isMatch = (finalScore >= threshold)
- AI/TensorFlow → Backend API: Return {match: isMatch, confidence: finalScore, threshold}

**Part D: Result Handling and Retry Logic**
- Backend API → Patient App: Return verification result
- Patient App: Check result.match
- IF result.match === TRUE:
  * Patient App: Display success alert:
    - Title: "Medication Verified ✓"
    - Message: "Correct medication taken"
    - Confidence: "XX% match"
  * Patient App: Reset retryCount = 0
  * Patient App: Save verification record (optional)
  * Patient App: Navigate back to home screen
  * END
- IF result.match === FALSE:
  * Patient App: Increment retryCount = retryCount + 1
  * Patient App: Display error alert:
    - Title: "Wrong Medication ✗"
    - Message: "This doesn't match your scheduled medication"
    - Confidence: "XX% match"
    - Attempts: "Attempt X of 3"
  * Patient App: Check retryCount
  * IF retryCount < 3:
    - Patient App: Display "Try Again" button
    - Patient App: Keep camera open
    - Patient App: User can re-capture
    - GO TO Part B (Image Capture)
  * IF retryCount >= 3:
    - Patient App: Display "Maximum attempts reached. Notifying caregiver."
    - Patient App → Backend API: POST /api/push/send-to-role with:
      * role: "caregiver"
      * title: "Patient Medication Alert"
      * body: "Patient failed to verify medication after 3 attempts"
      * data: {scheduleId, patientName, medicationName}
    - Backend API: Load all users where role="caregiver"
    - Backend API: Get push tokens for caregivers
    - Backend API: Send notifications to all caregivers
    - Patient App: Navigate back to home screen
    - END

VISUAL REQUIREMENTS:
- Show embedding extraction process in detail
- Display the 3 image variations side by side
- Show the math formulas for similarity calculations
- Highlight the adaptive threshold logic
- Display retry counter incrementing (0 → 1 → 2 → 3)
- Show decision diamond for retry < 3
- Use different colors for success (green) and failure (red) paths
- Display the 1330-feature vector structure

TECHNICAL DETAILS:
- Model: MobileNetV2, version 2, alpha 1.0
- Input size: 224x224x3
- Embedding size: 1330 features (1024 + 50 + 256)
- Similarity weights: Cosine 70%, Euclidean 30%
- Base threshold: 0.65
- Adaptive thresholds: 0.50, 0.55, 0.60, 0.65
- Max retry attempts: 3
- Image variations: 3 (different brightness levels)
```

---

## General Formatting Instructions

For all diagrams, ensure:

1. **Visual Clarity**:
   - Use distinct colors for each swimlane
   - Add icons for different operations (camera, database, cloud, AI brain)
   - Use solid arrows for synchronous calls
   - Use dashed arrows for async operations
   - Make decision points (diamonds) prominent

2. **Labels and Annotations**:
   - Label every arrow with data being transmitted
   - Include HTTP methods (GET, POST, PUT, DELETE)
   - Show data structures in curly braces {field: value}
   - Add timestamps where relevant

3. **Technical Accuracy**:
   - Include exact API endpoint paths
   - Show database file names (users.json, pills.json, etc.)
   - Specify image dimensions (224x224)
   - Include exact threshold values (0.65, etc.)
   - Show calculation formulas

4. **Error Handling**:
   - Show error paths with dashed red lines
   - Include error messages in quotes
   - Display validation checks clearly

5. **Timing Information**:
   - Mark async operations
   - Show cron schedules ("* * * * *")
   - Include timeout values
   - Display JWT expiry (12 hours)

---

## Tool-Specific Format Suggestions

### For Mermaid:
Use `sequenceDiagram` with participants for swimlanes

### For PlantUML:
Use `@startuml` with `participant` and `actor` keywords

### For Lucidchart/Draw.io:
- Use "Swimlane Diagram" template
- Enable grid snapping
- Use connector routing

### For AI Tools:
Paste the prompt and specify: "Generate as Mermaid syntax" or "Generate as SVG" based on your needs

---

Document Version: 1.0
Created: November 4, 2025
Project: MediGuardian Medication Reminder System
