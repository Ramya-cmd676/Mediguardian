# MediGuardian - Module-wise Pseudocode

## Table of Contents
1. [Authentication & Authorization Module](#1-authentication--authorization-module)
2. [Pill Registration Module](#2-pill-registration-module)
3. [AI Image Recognition Module](#3-ai-image-recognition-module)
4. [Medication Reminder Module](#4-medication-reminder-module)
5. [Push Notification Module](#5-push-notification-module)
6. [Pill Verification Module](#6-pill-verification-module)
7. [User Management Module](#7-user-management-module)
8. [Session Management Module](#8-session-management-module)

---

## 1. Authentication & Authorization Module

**Purpose**: Handle user registration, login, and token-based authorization

### 1.1 User Registration
```pseudocode
FUNCTION registerUser(name, email, password, role):
    // Input Validation
    IF email is empty OR password is empty THEN
        RETURN error "Email and password are required"
    END IF
    
    // Check Existing User
    users = loadUsersFromDatabase()
    IF user with email exists in users THEN
        RETURN error "User already exists"
    END IF
    
    // Create New User
    userId = generateUniqueId()
    passwordHash = hashPassword(password, saltRounds=8)
    
    newUser = {
        id: userId,
        name: name,
        email: email,
        role: role OR "patient",  // Default to patient
        passwordHash: passwordHash,
        createdAt: currentTimestamp()
    }
    
    // Save to Database
    users.add(newUser)
    saveUsersToDatabase(users)
    
    RETURN success {
        id: userId,
        email: email,
        role: newUser.role
    }
END FUNCTION
```

### 1.2 User Login
```pseudocode
FUNCTION loginUser(email, password):
    // Input Validation
    IF email is empty OR password is empty THEN
        RETURN error "Email and password are required"
    END IF
    
    // Find User
    users = loadUsersFromDatabase()
    user = findUserByEmail(users, email)
    
    IF user is null THEN
        RETURN error "Invalid credentials"
    END IF
    
    // Verify Password
    isPasswordValid = comparePassword(password, user.passwordHash)
    
    IF NOT isPasswordValid THEN
        RETURN error "Invalid credentials"
    END IF
    
    // Generate JWT Token
    payload = {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name
    }
    
    token = generateJWT(payload, secret, expiresIn="12h")
    
    RETURN success {
        token: token,
        user: payload
    }
END FUNCTION
```

### 1.3 Token Verification Middleware
```pseudocode
FUNCTION verifyToken(request):
    // Extract Token
    authHeader = request.headers.authorization
    
    IF authHeader is null OR NOT authHeader.startsWith("Bearer ") THEN
        RETURN error "Missing token"
    END IF
    
    token = authHeader.substring(7)  // Remove "Bearer "
    
    TRY
        // Verify JWT
        decoded = verifyJWT(token, secret)
        
        // Attach User Info to Request
        request.userId = decoded.id
        request.userEmail = decoded.email
        request.userRole = decoded.role
        
        RETURN success
    CATCH error
        RETURN error "Invalid or expired token"
    END TRY
END FUNCTION
```

---

## 2. Pill Registration Module

**Purpose**: Register pills with images and extract AI features

### 2.1 Register Pill with Image
```pseudocode
FUNCTION registerPill(imageFile, pillName, userId, token):
    // Validate Input
    IF imageFile is null THEN
        RETURN error "Image file is required"
    END IF
    
    IF pillName is empty THEN
        RETURN error "Pill name is required"
    END IF
    
    // Verify Authorization
    userInfo = verifyToken(token)
    IF userInfo is error THEN
        RETURN error "Unauthorized"
    END IF
    
    // Load AI Model
    ensureModelLoaded()
    
    // Extract Multiple Embeddings (for better accuracy)
    embeddings = []
    imageBuffer = readImageBuffer(imageFile)
    
    FOR i = 1 to 3 DO  // Multiple angles/variations
        embedding = extractMultiLayerEmbedding(imageBuffer)
        embeddings.add(embedding)
    END FOR
    
    // Average Embeddings
    finalEmbedding = averageEmbeddings(embeddings)
    
    // Save Image
    pillId = generateUniqueId()
    imagePath = saveImageToStorage(imageFile, pillId)
    
    // Create Pill Record
    pillRecord = {
        id: pillId,
        name: pillName,
        userId: userId,
        embedding: finalEmbedding,
        imagePath: imagePath,
        createdAt: currentTimestamp()
    }
    
    // Save to Database
    pills = loadPillsDatabase()
    pills.add(pillRecord)
    savePillsDatabase(pills)
    
    RETURN success {
        id: pillId,
        name: pillName,
        imagePath: imagePath
    }
END FUNCTION
```

---

## 3. AI Image Recognition Module

**Purpose**: Use TensorFlow MobileNet for pill image classification

### 3.1 Load AI Model
```pseudocode
FUNCTION loadModel():
    GLOBAL model, mobilenet
    
    IF model is already loaded THEN
        RETURN success
    END IF
    
    PRINT "Loading TensorFlow MobileNet model..."
    
    // Load MobileNetV2 (pretrained on ImageNet)
    mobilenet = loadMobileNet({
        version: 2,
        alpha: 1.0,  // Full model
        modelUrl: 'file://./mobilenet_model'
    })
    
    // Create feature extraction model
    // Extract from multiple layers for better features
    model = createSequentialModel([
        mobilenet.layers.globalAveragePooling,
        mobilenet.layers.intermediate_layer_1,
        mobilenet.layers.predictions
    ])
    
    PRINT "Model loaded successfully"
    RETURN success
END FUNCTION
```

### 3.2 Preprocess Image
```pseudocode
FUNCTION preprocessImage(imageBuffer):
    // Decode Image
    imageTensor = decodeImage(imageBuffer, channels=3)
    
    // Resize to MobileNet input size
    resized = resizeImage(imageTensor, targetSize=[224, 224])
    
    // Normalize pixel values to [0, 1]
    normalized = resized.div(255.0)
    
    // Enhance brightness (compensate for poor lighting)
    brightnessFactor = 1.05
    enhanced = normalized.mul(brightnessFactor)
    
    // Clip values to [0, 1] range
    clipped = clipValues(enhanced, min=0, max=1)
    
    // Expand dimensions for batch processing
    batched = expandDims(clipped, axis=0)
    
    RETURN batched
END FUNCTION
```

### 3.3 Extract Multi-layer Embedding
```pseudocode
FUNCTION extractMultiLayerEmbedding(imageBuffer):
    // Preprocess
    preprocessedImage = preprocessImage(imageBuffer)
    
    // Extract features from multiple layers
    globalFeatures = model.globalAveragePooling.predict(preprocessedImage)  // 1024 features
    intermediateFeatures = model.intermediateLayer.predict(preprocessedImage)  // 50 features
    predictionFeatures = model.predictions.predict(preprocessedImage)  // 256 features
    
    // Concatenate all features
    combinedEmbedding = concatenate([
        globalFeatures,
        intermediateFeatures,
        predictionFeatures
    ])  // Total: 1330 features
    
    // Normalize embedding (L2 normalization)
    normalizedEmbedding = l2Normalize(combinedEmbedding)
    
    RETURN normalizedEmbedding
END FUNCTION
```

### 3.4 Enhanced Similarity Calculation
```pseudocode
FUNCTION enhancedSimilarity(embedding1, embedding2):
    // Cosine Similarity (angle-based)
    dotProduct = sum(embedding1[i] * embedding2[i] for i in range)
    magnitude1 = sqrt(sum(embedding1[i]^2 for i in range))
    magnitude2 = sqrt(sum(embedding2[i]^2 for i in range))
    
    cosineSimilarity = dotProduct / (magnitude1 * magnitude2)
    
    // Euclidean Distance Similarity
    euclideanDistance = sqrt(sum((embedding1[i] - embedding2[i])^2 for i in range))
    maxDistance = sqrt(embedding1.length * 4)  // Theoretical max
    euclideanSimilarity = 1 - (euclideanDistance / maxDistance)
    
    // Combined Score (70% cosine + 30% euclidean)
    combinedScore = (cosineSimilarity * 0.7) + (euclideanSimilarity * 0.3)
    
    // Confidence Level
    IF combinedScore >= 0.8 THEN
        confidence = "HIGH"
    ELSE IF combinedScore >= 0.65 THEN
        confidence = "MEDIUM"
    ELSE IF combinedScore >= 0.50 THEN
        confidence = "LOW"
    ELSE
        confidence = "VERY_LOW"
    END IF
    
    RETURN {
        cosine: cosineSimilarity,
        euclidean: euclideanSimilarity,
        combined: combinedScore,
        confidence: confidence
    }
END FUNCTION
```

---

## 4. Medication Reminder Module

**Purpose**: Schedule and trigger medication reminders at specific times

### 4.1 Create Medication Schedule
```pseudocode
FUNCTION createMedicationSchedule(patientId, pillId, medicationName, time, daysOfWeek):
    // Validate Input
    IF patientId is empty OR (pillId is empty AND medicationName is empty) THEN
        RETURN error "Patient ID and medication details required"
    END IF
    
    // Normalize Time Format (HH:MM)
    normalizedTime = formatTime(time, format="HH:MM")
    
    // Create Schedule Record
    scheduleId = generateUniqueId()
    
    schedule = {
        id: scheduleId,
        userId: patientId,  // For notifications
        pillId: pillId OR null,
        medicationName: medicationName,
        time: normalizedTime,  // Single time string
        daysOfWeek: daysOfWeek OR ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        active: true,
        createdAt: currentTimestamp()
    }
    
    // Save to Database
    schedules = loadSchedulesDatabase()
    schedules.add(schedule)
    saveSchedulesDatabase(schedules)
    
    PRINT "Schedule created for", medicationName, "at", normalizedTime
    
    RETURN success {
        id: scheduleId,
        time: normalizedTime,
        medicationName: medicationName
    }
END FUNCTION
```

### 4.2 Scheduler Cron Job (Runs Every Minute)
```pseudocode
FUNCTION checkAndSendReminders():
    // Get Current Time in IST (India Standard Time)
    nowUTC = getCurrentUTCTime()
    istOffset = 5.5 * 60  // UTC + 5:30 hours in minutes
    
    istTime = new Date(nowUTC.getTime() + (istOffset * 60 * 1000))
    
    currentTime = formatTime(istTime, format="HH:MM")
    currentDay = getDayOfWeek(istTime)  // e.g., "Mon", "Tue"
    
    PRINT "[SCHEDULER] Checking schedules at IST:", currentTime, "(UTC:", formatTime(nowUTC), ")"
    
    // Load Schedules
    schedules = loadSchedulesDatabase()
    
    FOR each schedule in schedules DO
        // Check if schedule is active
        IF NOT schedule.active THEN
            CONTINUE
        END IF
        
        // Check if current day is included
        IF currentDay NOT in schedule.daysOfWeek THEN
            CONTINUE
        END IF
        
        // Check if time matches (EXACT MATCH)
        IF schedule.time == currentTime THEN
            PRINT "[SCHEDULER] ✓ Match found:", schedule.medicationName, "at", currentTime
            
            // Send Reminder Notification
            result = sendMedicationReminder(schedule.userId, schedule.medicationName, schedule.id)
            
            IF result.success THEN
                PRINT "[SCHEDULER] ✓ Notification sent to user", schedule.userId
            ELSE
                PRINT "[SCHEDULER] ✗ Failed to send notification"
            END IF
        END IF
    END FOR
END FUNCTION

// Cron Job Configuration
CRON_JOB = scheduleTask(checkAndSendReminders, interval="* * * * *")  // Every minute
```

---

## 5. Push Notification Module

**Purpose**: Manage push tokens and send notifications via Expo

### 5.1 Register Push Token
```pseudocode
FUNCTION registerPushToken(userId, expoPushToken, deviceInfo):
    // Validate Token
    IF NOT isValidExpoPushToken(expoPushToken) THEN
        RETURN error "Invalid Expo push token format"
    END IF
    
    // Load Existing Tokens
    tokens = loadPushTokensDatabase()
    
    // Check if token already exists for this user
    existingToken = findToken(tokens, userId, expoPushToken)
    
    IF existingToken exists THEN
        // Update existing token
        existingToken.deviceInfo = deviceInfo
        existingToken.updatedAt = currentTimestamp()
    ELSE
        // Create new token entry
        newToken = {
            userId: userId,
            expoPushToken: expoPushToken,
            deviceInfo: deviceInfo,
            createdAt: currentTimestamp(),
            updatedAt: currentTimestamp()
        }
        tokens.add(newToken)
    END IF
    
    // Save to Database
    savePushTokensDatabase(tokens)
    
    PRINT "[PUSH] ✓ Token registered for user", userId
    
    RETURN success {
        userId: userId,
        registered: true
    }
END FUNCTION
```

### 5.2 Send Medication Reminder
```pseudocode
FUNCTION sendMedicationReminder(userId, medicationName, scheduleId):
    // Load User's Push Tokens
    allTokens = loadPushTokensDatabase()
    userTokens = filterTokensByUserId(allTokens, userId)
    
    IF userTokens is empty THEN
        PRINT "[PUSH] No push tokens found for user", userId
        RETURN {success: false, message: "No tokens"}
    END IF
    
    // Create Notification Messages
    messages = []
    
    FOR each tokenEntry in userTokens DO
        IF NOT isValidExpoPushToken(tokenEntry.expoPushToken) THEN
            PRINT "[PUSH] Invalid token, skipping"
            CONTINUE
        END IF
        
        message = {
            to: tokenEntry.expoPushToken,
            sound: 'default',
            title: '💊 Time for your medication',
            body: 'Take your ' + medicationName,
            data: {
                type: 'medication_reminder',
                scheduleId: scheduleId,
                medicationName: medicationName,
                timestamp: currentTimestamp()
            },
            priority: 'max',  // Highest priority
            channelId: 'medication-reminders',
            vibrate: [0, 250, 250, 250]  // Vibration pattern
        }
        
        messages.add(message)
    END FOR
    
    IF messages is empty THEN
        RETURN {success: false, message: "No valid tokens"}
    END IF
    
    // Send in Chunks (Expo limitation: 100 per request)
    chunks = splitIntoChunks(messages, chunkSize=100)
    tickets = []
    
    FOR each chunk in chunks DO
        TRY
            ticketChunk = sendPushNotificationsViaExpo(chunk)
            tickets.addAll(ticketChunk)
        CATCH error
            PRINT "[PUSH] Error sending chunk:", error
        END TRY
    END FOR
    
    PRINT "[PUSH] Sent", messages.length, "notification(s) to user", userId
    
    RETURN {
        success: true,
        ticketCount: tickets.length
    }
END FUNCTION
```

### 5.3 Send Notification to Caregivers (Role-based)
```pseudocode
FUNCTION sendNotificationToRole(role, title, body, data):
    // Load Users with Specific Role
    allUsers = loadUsersDatabase()
    roleUsers = filterUsersByRole(allUsers, role)
    
    IF roleUsers is empty THEN
        RETURN error "No users found with role: " + role
    END IF
    
    roleUserIds = extractUserIds(roleUsers)
    
    PRINT "[PUSH] Sending to", roleUserIds.length, "user(s) with role", role
    
    // Load Push Tokens for These Users
    allTokens = loadPushTokensDatabase()
    roleTokens = filterTokensByUserIds(allTokens, roleUserIds)
    
    IF roleTokens is empty THEN
        RETURN error "No push tokens for users with role: " + role
    END IF
    
    // Create Messages
    messages = []
    
    FOR each tokenEntry in roleTokens DO
        IF NOT isValidExpoPushToken(tokenEntry.expoPushToken) THEN
            CONTINUE
        END IF
        
        message = {
            to: tokenEntry.expoPushToken,
            sound: 'default',
            title: title,
            body: body,
            data: data,
            priority: 'high',
            channelId: 'medication-alerts'
        }
        
        messages.add(message)
    END FOR
    
    // Send Notifications
    chunks = splitIntoChunks(messages, chunkSize=100)
    tickets = []
    
    FOR each chunk in chunks DO
        TRY
            ticketChunk = sendPushNotificationsViaExpo(chunk)
            tickets.addAll(ticketChunk)
        CATCH error
            PRINT "[PUSH] Error:", error
        END TRY
    END FOR
    
    RETURN {
        success: true,
        role: role,
        userCount: roleUserIds.length,
        deviceCount: messages.length,
        ticketCount: tickets.length
    }
END FUNCTION
```

---

## 6. Pill Verification Module

**Purpose**: Verify captured pill matches scheduled medication

### 6.1 Verify Pill Against Schedule
```pseudocode
FUNCTION verifyPill(imageFile, scheduleId, userId):
    // Validate Input
    IF imageFile is null THEN
        RETURN error "Image file required"
    END IF
    
    // Load AI Model
    ensureModelLoaded()
    
    // Extract Embedding from Captured Image
    capturedEmbedding = extractMultiLayerEmbedding(imageFile.buffer)
    
    // Load Pills Database
    allPills = loadPillsDatabase()
    pillsToCheck = []
    expectedPillName = null
    
    // If scheduleId provided, verify against SCHEDULED pill only
    IF scheduleId is not null THEN
        // Load Schedule
        schedules = loadSchedulesDatabase()
        schedule = findScheduleById(schedules, scheduleId)
        
        IF schedule is null THEN
            RETURN error "Schedule not found"
        END IF
        
        expectedPillId = schedule.pillId
        expectedPillName = schedule.medicationName
        
        IF expectedPillId is not null THEN
            // Match against specific pill by ID
            pillsToCheck = filterPillsById(allPills, expectedPillId)
        ELSE IF expectedPillName is not null THEN
            // Fallback: match by name
            pillsToCheck = filterPillsByName(allPills, expectedPillName)
        END IF
        
        IF pillsToCheck is empty THEN
            RETURN error {
                code: "scheduled_pill_not_found",
                message: "Medication '" + expectedPillName + "' not registered"
            }
        END IF
        
        PRINT "[VERIFY] Checking against scheduled pill:", expectedPillName
    ELSE
        // General verification (check all pills)
        pillsToCheck = allPills
    END IF
    
    // Compare with All Candidates
    bestMatch = {
        id: null,
        name: null,
        score: -1,
        metrics: null
    }
    
    allMatches = []
    
    FOR each pill in pillsToCheck DO
        metrics = enhancedSimilarity(capturedEmbedding, pill.embedding)
        score = metrics.combined
        
        allMatches.add({
            id: pill.id,
            name: pill.name,
            score: score,
            confidence: metrics.confidence
        })
        
        IF score > bestMatch.score THEN
            bestMatch = {
                id: pill.id,
                name: pill.name,
                score: score,
                metrics: metrics
            }
        END IF
    END FOR
    
    // Sort matches by score
    sortByScoreDescending(allMatches)
    topMatches = allMatches[0:3]  // Top 3
    
    PRINT "[VERIFY] Top 3 matches:"
    FOR i = 0 to min(3, topMatches.length) DO
        PRINT "  ", i+1, ".", topMatches[i].name, ":", topMatches[i].score, "(", topMatches[i].confidence, ")"
    END FOR
    
    // Adaptive Threshold
    BASE_THRESHOLD = 0.50
    HIGH_CONFIDENCE_THRESHOLD = 0.65
    
    threshold = (bestMatch.metrics.confidence > 0.7) ? HIGH_CONFIDENCE_THRESHOLD : BASE_THRESHOLD
    
    // Check if Match is Confident
    IF bestMatch.score >= threshold THEN
        // Check ambiguity (is it significantly better than 2nd best?)
        secondBestScore = (allMatches.length > 1) ? allMatches[1].score : 0
        scoreGap = bestMatch.score - secondBestScore
        isUnambiguous = (scoreGap > 0.1)  // 10% better
        
        RETURN success {
            match: true,
            id: bestMatch.id,
            name: bestMatch.name,
            score: bestMatch.score,
            confidence: bestMatch.metrics.confidence,
            isUnambiguous: isUnambiguous
        }
    ELSE
        RETURN {
            match: false,
            score: bestMatch.score,
            confidence: bestMatch.metrics.confidence,
            message: "No confident match (best: " + bestMatch.name + " at " + bestMatch.score + ")"
        }
    END IF
END FUNCTION
```

### 6.2 Frontend Verification Flow (with Retry Logic)
```pseudocode
FUNCTION verifyPillFlow(capturedPhoto, scheduleId, medicationName):
    GLOBAL retryCount = 0
    MAX_RETRIES = 3
    
    // Send Image to Backend
    formData = createFormData()
    formData.append("image", capturedPhoto)
    formData.append("scheduleId", scheduleId)
    
    response = sendToBackend("/verify-pill", formData)
    
    IF response.success AND response.match THEN
        // SUCCESS - Correct Pill
        showAlert("✓ Correct Medication!", "Verified: " + response.name)
        
        // Notify caregiver of success
        notifyCaregiver("verification_success", response.name)
        
        navigateBack()
    ELSE
        // FAILURE - Wrong Pill or No Match
        retryCount = retryCount + 1
        
        IF retryCount >= MAX_RETRIES THEN
            // After 3 failed attempts
            showAlert(
                "✗ Verification Failed",
                "Unable to verify after " + MAX_RETRIES + " attempts. Caregiver notified."
            )
            
            // Notify caregiver of failure
            notifyCaregiver("verification_failed", medicationName)
            
            navigateBack()
        ELSE
            // Allow Retry
            errorMessage = (response.error == "scheduled_pill_not_found") 
                ? response.message 
                : "This is not " + medicationName + ". Please try again."
            
            showAlertWithOptions(
                "✗ Wrong Medication",
                errorMessage,
                buttons = [
                    {text: "Retry", action: resetCameraForRetry},
                    {text: "Cancel", action: navigateBack}
                ]
            )
        END IF
    END IF
END FUNCTION

FUNCTION notifyCaregiver(eventType, medicationName):
    message = (eventType == "verification_failed")
        ? "⚠️ Patient failed to verify " + medicationName + " after 3 attempts"
        : "✅ Patient successfully took " + medicationName
    
    title = (eventType == "verification_failed") 
        ? "Medication Alert ⚠️" 
        : "Medication Taken ✅"
    
    // Send to all caregivers (workaround until patient-caregiver linking implemented)
    sendToBackend("/api/push/send-to-role", {
        role: "caregiver",
        title: title,
        body: message,
        data: {
            type: eventType,
            patientId: currentUser.id,
            patientName: currentUser.name,
            medicationName: medicationName,
            scheduleId: scheduleId
        }
    })
END FUNCTION
```

---

## 7. User Management Module

**Purpose**: Manage user profiles and relationships

### 7.1 Get Users List (with Role Filter)
```pseudocode
FUNCTION getUsersList(roleFilter):
    // Load All Users
    allUsers = loadUsersDatabase()
    
    // Apply Role Filter if Provided
    IF roleFilter is not null THEN
        filteredUsers = filterUsersByRole(allUsers, roleFilter)
    ELSE
        filteredUsers = allUsers
    END IF
    
    // Remove Sensitive Data (password hash)
    safeUsers = []
    
    FOR each user in filteredUsers DO
        safeUser = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt
        }
        safeUsers.add(safeUser)
    END FOR
    
    RETURN safeUsers
END FUNCTION
```

### 7.2 Link Patient to Caregiver (Future Enhancement)
```pseudocode
FUNCTION linkPatientToCaregiver(patientId, caregiverId):
    // Validate Users Exist
    users = loadUsersDatabase()
    
    patient = findUserById(users, patientId)
    caregiver = findUserById(users, caregiverId)
    
    IF patient is null OR caregiver is null THEN
        RETURN error "User not found"
    END IF
    
    // Validate Roles
    IF patient.role != "patient" THEN
        RETURN error "First user must be a patient"
    END IF
    
    IF caregiver.role != "caregiver" THEN
        RETURN error "Second user must be a caregiver"
    END IF
    
    // Update Patient Record
    patient.caregiverId = caregiverId
    patient.updatedAt = currentTimestamp()
    
    // Save to Database
    saveUsersDatabase(users)
    
    RETURN success {
        patientId: patientId,
        caregiverId: caregiverId,
        linked: true
    }
END FUNCTION
```

---

## 8. Session Management Module

**Purpose**: Persist user sessions across app restarts

### 8.1 Save Session (Frontend)
```pseudocode
FUNCTION saveSession(token, userInfo):
    TRY
        // Store in AsyncStorage (React Native)
        await AsyncStorage.setItem("userToken", token)
        await AsyncStorage.setItem("userInfo", JSON.stringify(userInfo))
        
        PRINT "[SESSION] ✓ Session saved"
        RETURN success
    CATCH error
        PRINT "[SESSION] ✗ Failed to save session:", error
        RETURN error
    END TRY
END FUNCTION
```

### 8.2 Load Session (Frontend)
```pseudocode
FUNCTION loadSession():
    TRY
        // Retrieve from AsyncStorage
        token = await AsyncStorage.getItem("userToken")
        userInfoString = await AsyncStorage.getItem("userInfo")
        
        IF token is null OR userInfoString is null THEN
            PRINT "[SESSION] No saved session found"
            RETURN null
        END IF
        
        userInfo = JSON.parse(userInfoString)
        
        PRINT "[SESSION] ✓ Session loaded for user:", userInfo.email
        
        RETURN {
            token: token,
            user: userInfo
        }
    CATCH error
        PRINT "[SESSION] ✗ Failed to load session:", error
        RETURN null
    END TRY
END FUNCTION
```

### 8.3 Clear Session (Logout)
```pseudocode
FUNCTION clearSession():
    TRY
        // Remove from AsyncStorage
        await AsyncStorage.removeItem("userToken")
        await AsyncStorage.removeItem("userInfo")
        
        PRINT "[SESSION] ✓ Session cleared"
        RETURN success
    CATCH error
        PRINT "[SESSION] ✗ Failed to clear session:", error
        RETURN error
    END TRY
END FUNCTION
```

### 8.4 Auto-Restore Session on App Start
```pseudocode
FUNCTION initializeApp():
    PRINT "[APP] Initializing..."
    
    // Try to restore session
    session = loadSession()
    
    IF session is not null THEN
        // Verify token is still valid
        isValid = await verifyTokenWithBackend(session.token)
        
        IF isValid THEN
            PRINT "[APP] ✓ Session restored"
            
            // Set current user
            setCurrentUser(session.user, session.token)
            
            // Navigate to appropriate screen based on role
            IF session.user.role == "patient" THEN
                navigateTo("PatientHome")
            ELSE IF session.user.role == "caregiver" THEN
                navigateTo("CaregiverHome")
            END IF
        ELSE
            PRINT "[APP] ✗ Session expired"
            clearSession()
            navigateTo("Login")
        END IF
    ELSE
        PRINT "[APP] No session found"
        navigateTo("Login")
    END IF
END FUNCTION
```

---

## Integration Flow

### Complete Medication Reminder Flow
```pseudocode
MAIN FLOW: Medication Reminder System

1. INITIALIZATION (Backend Startup)
   - Load TensorFlow MobileNet model
   - Start cron scheduler (runs every minute)
   - Initialize Expo push notification client

2. USER REGISTRATION & LOGIN (Patient/Caregiver)
   - User registers with email, password, role
   - System creates account with hashed password
   - User logs in, receives JWT token (12h expiry)
   - Frontend saves token + user info in AsyncStorage
   - Frontend registers Expo push token with backend

3. PILL REGISTRATION (Patient/Caregiver)
   - User captures pill image via camera
   - Frontend uploads image to backend
   - Backend processes image through MobileNet
   - Extracts 1330-dimensional multi-layer embedding
   - Saves pill record with embedding to database

4. SCHEDULE CREATION (Caregiver)
   - Caregiver selects patient, pill, time
   - Frontend sends schedule creation request
   - Backend saves schedule with:
     * userId (patient ID)
     * pillId (registered pill ID)
     * medicationName
     * time (HH:MM format)
     * daysOfWeek

5. SCHEDULER EXECUTION (Every Minute)
   - Cron job runs checkAndSendReminders()
   - Gets current time in IST (UTC + 5:30)
   - Loads all active schedules
   - For each schedule:
     * Checks if current day matches daysOfWeek
     * Checks if current time == schedule.time
     * If match → sends push notification to patient

6. NOTIFICATION DELIVERY (Expo)
   - Backend calls sendMedicationReminder()
   - Loads patient's push tokens
   - Creates notification with:
     * Title: "💊 Time for your medication"
     * Body: "Take your [medicationName]"
     * Data: {scheduleId, medicationName}
   - Sends via Expo Push Notification API
   - Patient's device receives notification

7. NOTIFICATION TAP (Patient)
   - Patient taps notification
   - Frontend notification handler extracts scheduleId
   - Navigates to VerifyPill screen with:
     * scheduleId
     * medicationName
     * manual: false

8. PILL CAPTURE (Patient)
   - VerifyPill screen opens camera
   - Patient captures pill image
   - Frontend sends image + scheduleId to backend

9. VERIFICATION (Backend AI)
   - Backend receives image + scheduleId
   - Loads schedule → Gets pillId
   - Filters pills database to ONLY scheduled pill
   - Extracts embedding from captured image
   - Calculates enhanced similarity score:
     * 70% cosine similarity
     * 30% euclidean similarity
   - Compares against adaptive threshold (0.50-0.65)
   - Returns match result

10. VERIFICATION RESULT (Patient)
    IF match == true:
      - Show "✓ Correct Medication!" alert
      - Send success notification to caregivers
      - Navigate back to home
    ELSE IF retryCount < 3:
      - Show "✗ Wrong Medication" alert
      - Offer "Retry" button
      - Increment retryCount
    ELSE (after 3 failures):
      - Show "✗ Verification Failed" alert
      - Send failure notification to caregivers
      - Navigate back to home

11. CAREGIVER NOTIFICATION (On Failure)
    - Backend receives notification request
    - Loads all users with role = "caregiver"
    - Gets their push tokens
    - Sends alert:
      * Title: "Medication Alert ⚠️"
      * Body: "Patient failed to verify [medication] after 3 attempts"
      * Data: {patientId, medicationName, eventType}

12. SESSION PERSISTENCE
    - On login success → Save token to AsyncStorage
    - On app restart → Load token and auto-login
    - On logout → Clear AsyncStorage
    - Token auto-expires after 12 hours

END FLOW
```

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND (React Native + Expo)       │
│  ┌────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ Authentication │  │  Pill Capture   │  │ Notifications│ │
│  │    Module      │  │     Module      │  │    Module    │ │
│  └────────────────┘  └─────────────────┘  └──────────────┘ │
│  ┌────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │    Session     │  │  Verification   │  │  Reminders   │ │
│  │  Management    │  │      Flow       │  │   Display    │ │
│  └────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              ↓↑ HTTPS/REST API
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (Node.js + Express)               │
│  ┌────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ Authentication │  │   AI/TensorFlow │  │  Push Notif  │ │
│  │   & JWT Auth   │  │  MobileNetV2    │  │  (Expo API)  │ │
│  └────────────────┘  └─────────────────┘  └──────────────┘ │
│  ┌────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   Scheduler    │  │  Pill Registry  │  │     User     │ │
│  │  (Cron Jobs)   │  │   Management    │  │  Management  │ │
│  └────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              ↓↑
┌─────────────────────────────────────────────────────────────┐
│                 DATABASE (JSON Files)                        │
│  • users.json        • pills.json        • schedules.json   │
│  • push_tokens.json  • embeddings        • images/          │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Algorithms Summary

1. **Password Hashing**: bcrypt (salt rounds = 8)
2. **Token Generation**: JWT with 12-hour expiry
3. **Image Preprocessing**: Resize → Normalize → Brightness enhancement → Batch
4. **Feature Extraction**: MobileNetV2 multi-layer (1330 features)
5. **Similarity**: 70% Cosine + 30% Euclidean
6. **Threshold**: Adaptive (0.50 base, 0.65 high confidence)
7. **Timezone**: UTC to IST conversion (+ 5.5 hours)
8. **Retry Logic**: Max 3 attempts before caregiver alert
9. **Notification**: Expo Push API with chunking (100 per request)

---

**Document Version**: 1.0  
**Last Updated**: November 4, 2025  
**System**: MediGuardian Medication Reminder with AI Pill Recognition
