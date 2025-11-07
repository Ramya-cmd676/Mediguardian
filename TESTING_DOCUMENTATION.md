# MediGuardian - Testing Documentation

## Types of Testing Performed

### 1. Unit Testing
Tests individual components in isolation including authentication functions, AI model operations, notification handlers, and database CRUD operations. Verifies each function returns expected outputs for given inputs.

### 2. Integration Testing
Validates interaction between modules such as authentication with session management, scheduler with notifications, and AI recognition with pill verification to ensure proper data flow.

### 3. System Testing
Evaluates complete integrated system including end-to-end medication reminder flow, pill verification workflow, and multi-user scenarios with different roles.

### 4. Functional Testing
Verifies features work per specifications including user registration, pill registration, AI recognition, schedule management, push notifications, and session persistence.

### 5. Performance Testing
Assesses system behavior under load including AI model inference time, database query response times, notification delivery latency, and concurrent user handling.

### 6. Security Testing
Validates password hashing with bcrypt, JWT token authentication, authorization checks, input validation, injection prevention, and file upload security.

### 7. Usability Testing
Evaluates user experience including login flow simplicity, camera interface, notification clarity, error messages, and navigation for elderly patients.

---

## Module-wise Test Cases

### Module 1: Authentication & Authorization

Test No | Input | Output | Status
--------|-------|--------|-------
1.1 | Valid email, password, role "patient" | User created with unique ID, JWT token generated | Pass
1.2 | Existing email | Error: "User already exists" (409) | Pass
1.3 | Empty email or password | Error: "Email and password required" (400) | Pass
1.4 | Valid credentials for login | JWT token returned, valid for 12 hours | Pass
1.5 | Invalid credentials | Error: "Invalid credentials" (401) | Pass
1.6 | Valid JWT token in header | User ID and role attached to request | Pass
1.7 | Expired JWT token | Error: "Invalid or expired token" (401) | Pass
1.8 | Missing Authorization header | Error: "Missing token" (401) | Pass

### Module 2: Pill Registration

Test No | Input | Output | Status
--------|-------|--------|-------
2.1 | Valid image (JPEG, 2MB), pill name "Aspirin" | Pill registered with ID, embedding stored | Pass
2.2 | Missing image file | Error: "Image file required" (400) | Pass
2.3 | Valid image, empty pill name | Error: "Pill name required" (400) | Pass
2.4 | Valid image, invalid token | Error: "Unauthorized" (401) | Pass
2.5 | Very large image (15MB) | Image processed, pill registered (slower) | Pass
2.6 | Image with poor lighting | Brightness enhanced, pill registered | Pass

### Module 3: AI Image Recognition

Test No | Input | Output | Status
--------|-------|--------|-------
3.1 | 224x224 RGB image tensor | 1330-dimensional embedding vector | Pass
3.2 | Unnormalized image (0-255) | Normalized to 0-1 range, processed | Pass
3.3 | Two identical images | Cosine similarity = 1.0, Euclidean similarity = 1.0 | Pass
3.4 | Different images (Aspirin vs Ibuprofen) | Combined similarity < 0.5, confidence "VERY_LOW" | Pass
3.5 | Same pill different angles | Combined similarity > 0.65, confidence "MEDIUM/HIGH" | Pass
3.6 | High similarity (0.85) | Confidence level "HIGH" | Pass

### Module 4: Medication Reminder

Test No | Input | Output | Status
--------|-------|--------|-------
4.1 | Patient ID, pill ID, time "09:00", days ["Mon","Wed"] | Schedule created with unique ID | Pass
4.2 | Empty patient ID | Error: "Patient ID and medication details required" | Pass
4.3 | Time "9:00 AM" (12-hour) | Converted to "09:00" (24-hour format) | Pass
4.4 | Current IST "14:30", schedule "14:30", day matches | Notification sent to patient | Pass
4.5 | Current IST "14:30", schedule "14:31" | No notification (time mismatch) | Pass
4.6 | UTC server time vs IST schedule | Correctly converted, notification sent at IST time | Pass

### Module 5: Push Notification

Test No | Input | Output | Status
--------|-------|--------|-------
5.1 | Valid Expo token, user ID | Token registered in database | Pass
5.2 | Invalid token format | Error: "Invalid Expo push token format" | Pass
5.3 | Send notification to user with token | Notification delivered, ticket count = 1 | Pass
5.4 | Send to role "caregiver" (3 caregivers) | 3 notifications sent, ticket count = 3 | Pass
5.5 | Send 150 notifications (exceeds 100 limit) | Split into 2 chunks, all 150 sent | Pass
5.6 | Notification with priority "max" | Delivered with high priority | Pass

### Module 6: Pill Verification

Test No | Input | Output | Status
--------|-------|--------|-------
6.1 | Captured Aspirin image, scheduleId for Aspirin | Match = true, name = "Aspirin", score > 0.65 | Pass
6.2 | Captured Ibuprofen, scheduleId for Aspirin | Match = false, wrong medication detected | Pass
6.3 | Valid image, invalid scheduleId | Error: "Schedule not found" | Pass
6.4 | ScheduleId for unregistered pill | Error: "scheduled_pill_not_found" | Pass
6.5 | First verification fails | Retry allowed, retryCount = 1 | Pass
6.6 | Third verification fails | No retries, caregiver notified | Pass

### Module 7: Session Management

Test No | Input | Output | Status
--------|-------|--------|-------
7.1 | Save token and user info after login | Data stored in AsyncStorage | Pass
7.2 | Load session after app restart | Token and user info retrieved | Pass
7.3 | Load session when no data exists | Returns null | Pass
7.4 | Initialize app with valid saved session | User auto-logged in, navigated to home | Pass
7.5 | Initialize app with expired token | Session cleared, navigated to login | Pass

### Module 8: Integration Testing

Test No | Input | Output | Status
--------|-------|--------|-------
8.1 | Register -> Login -> Register pill -> Create schedule | All operations complete, schedule active | Pass
8.2 | Login -> Notification -> Tap -> Verify pill | Correct navigation to VerifyPill with scheduleId | Pass
8.3 | Scheduler -> Notification -> Verify -> Caregiver notified | Complete end-to-end flow works | Pass
8.4 | Patient fails 3 times | Caregiver receives alert with failure details | Pass
8.5 | Patient in IST timezone, UTC server | Notification arrives at correct IST time | Pass

### Module 9: Performance Testing

Test No | Input | Output | Status
--------|-------|--------|-------
9.1 | Process single pill image (2MB) | Time < 2 seconds for embedding extraction | Pass
9.2 | Verify pill against 50 registered pills | Time < 1 second for similarity calculations | Pass
9.3 | Send notification to 100 users | Time < 5 seconds with chunking | Pass
9.4 | Scheduler checks 200 schedules | Time < 500ms per cron execution | Pass
9.5 | 10 concurrent login requests | All processed within 3 seconds | Pass

### Module 10: Security Testing

Test No | Input | Output | Status
--------|-------|--------|-------
10.1 | Password "Pass123" hashed | Hash starts with "$2b$08$", 60 characters | Pass
10.2 | SQL injection attempt in email | Input sanitized, no database compromise | Pass
10.3 | XSS attempt in pill name | Script tags escaped, stored safely | Pass
10.4 | Access protected endpoint without token | 401 Unauthorized error | Pass
10.5 | Upload executable instead of image | File type validation rejects upload | Pass
10.6 | JWT token manipulation | Signature verification fails, token rejected | Pass

---

Summary: Total 60 Test Cases, Pass Rate: 100%
Document Version: 1.0
Last Updated: November 4, 2025
