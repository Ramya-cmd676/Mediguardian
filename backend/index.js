const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const { User, PushToken } = require('./database');
const { 
  ensureModelLoaded, 
  imageBufferToEmbedding, 
  imageBufferToMultipleEmbeddings,
  cosineSimilarity, 
  enhancedSimilarity,
  getConfidenceLevel,
  loadDatabase, 
  saveDatabase 
} = require('./model');
const { v4: uuidv4 } = require('uuid');
const { connectDB, Pill, VerificationLog } = require('./database');

const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Connect to MongoDB
connectDB().catch(err => {
  console.error('[MONGODB] Connection failed:', err);
  process.exit(1);
});

// auth routes (register/login) and middleware
const { router: authRouter, verifyToken, requireRole } = require('./auth');
app.use('/auth', authRouter);

// mount schedules routes (protect create/update/delete for caregivers if needed)
const schedulesRouter = require('./schedules');
app.use('/api', schedulesRouter);

// mount notification routes
const { router: notificationsRouter } = require('./notifications');
app.use('/api', notificationsRouter);

// initialize scheduler for automatic medication reminders
const { initScheduler } = require('./scheduler');
initScheduler();

const upload = multer({ storage: multer.memoryStorage() });

// health
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// register a pill image and store embedding (accessible by patients and caregivers)
app.post('/register-pill', verifyToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'image file required (field name: image)' });
    
    // Accept both 'name' and 'pill_name' for backwards compatibility
    const name = req.body.pill_name || req.body.name || 'unknown';
    const userId = req.body.user_id || req.userId; // user_id from request body or token
    
    await ensureModelLoaded();

    // Use enhanced multi-embedding extraction for better registration
    console.log('[REGISTER] Extracting enhanced embeddings for:', name);
    const embeddingResult = await imageBufferToMultipleEmbeddings(req.file.buffer);

    const pillId = uuidv4();
    const filename = `${pillId}.jpg`;
    const filepath = path.join(UPLOAD_DIR, filename);
    fs.writeFileSync(filepath, req.file.buffer);

    const pill = new Pill({ 
      pillId, 
      name, 
      imagePath: `uploads/${filename}`, 
      embedding: embeddingResult.embedding,
      featureCount: embeddingResult.featureCount,
      registrationConfidence: embeddingResult.confidence,
      userId: userId
    });
    await pill.save();

    console.log(`[REGISTER] Successfully registered pill: ${name} (${embeddingResult.featureCount} features)`);
    
    return res.json({ 
      success: true, 
      id: pillId, 
      name,
      featureCount: embeddingResult.featureCount,
      quality: 'high'
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server error' });
  }
});

// verify pill
app.post('/verify-pill', verifyToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'image file required (field name: image)' });
    await ensureModelLoaded();

    console.log('[VERIFY] Starting pill verification...');
    const probe = await imageBufferToEmbedding(req.file.buffer);

    const userId = req.user.id; // From verifyToken middleware
    const scheduleId = req.body.scheduleId || req.query.scheduleId; // Accept scheduleId
    
    let pillsQuery = {};
    let expectedPillName = null;

    // If scheduleId provided, verify against ONLY the scheduled pill
    if (scheduleId) {
      const { Schedule } = require('./database');
      const schedule = await Schedule.findOne({ scheduleId });

      if (schedule) {
        expectedPillName = schedule.medicationName;
        console.log(`[VERIFY] Expected scheduled pill: ${expectedPillName}`);
      }
      
    } else {
      // Optional: filter by userId for general verification
      if (req.query.filterByUser === 'true' && userId) {
        pillsQuery.userId = userId;
        console.log(`[VERIFY] Filtering pills for user ${userId}`);
      }
    }

    const pillsToCheck = await Pill.find({});
    
    if (pillsToCheck.length === 0 && expectedPillName) {
      return res.status(404).json({ 
        error: 'scheduled_pill_not_found',
        message: `The scheduled medication "${expectedPillName}" is not registered in the system.`
      });
    }

    // Enhanced matching with multiple metrics
    let best = { id: null, name: null, score: -1, metrics: null };
    let allMatches = [];
    
    for (const entry of pillsToCheck) {
      const metrics = enhancedSimilarity(probe, entry.embedding);
      const score = metrics.combined;
      
      allMatches.push({
        id: entry.pillId,
        name: entry.name,
        score: score,
        cosine: metrics.cosine,
        confidence: metrics.confidence
      });
      
      if (score > best.score) {
        best = { 
          id: entry.pillId, 
          name: entry.name, 
          score: score,
          metrics: metrics
        };
      }
    }

    // Adaptive threshold based on confidence
    const BASE_THRESHOLD = 0.65; // Proper threshold to prevent false positives
    const HIGH_CONFIDENCE_THRESHOLD = 0.70; // For high confidence matches
    
    // Use stricter threshold if we have high confidence, otherwise use base
    const threshold = best.metrics && best.metrics.confidence > 0.75 
      ? HIGH_CONFIDENCE_THRESHOLD 
      : BASE_THRESHOLD;
    
    const confidenceLevel = getConfidenceLevel(best.score);
    
    // Sort matches by score for logging
    allMatches.sort((a, b) => b.score - a.score);
    const topMatches = allMatches.slice(0, 3);
    
    console.log(`[VERIFY] Top 3 matches:`);
    topMatches.forEach((m, i) => {
      console.log(`  ${i + 1}. ${m.name}: ${m.score.toFixed(3)} (cosine: ${m.cosine.toFixed(3)}, conf: ${m.confidence.toFixed(3)})`);
    });
    console.log(`[VERIFY] Best match: ${best.name} | Score: ${best.score.toFixed(3)} | Confidence: ${confidenceLevel} | Threshold: ${threshold.toFixed(2)}`);
    
    if (best.score >= threshold) {
      // Additional validation: check if score is significantly better than second best
      const secondBest = allMatches.length > 1 ? allMatches[1].score : 0;
      const scoreGap = best.score - secondBest;
      const isUnambiguous = scoreGap > 0.1; // At least 10% better than second match
      
//       const patient = await User.findOne({ userId });

// if (patient?.assignedCaregiverId) {
//   await VerificationLog.create({
//     logId: uuidv4(),
//     patientId: userId,
//     caregiverId: patient.assignedCaregiverId,
//     medicationName: best.name,
//     scheduleId: scheduleId || null,
//     result: 'SUCCESS',
//     score: best.score,
//     confidence: confidenceLevel,
//     createdAt: new Date(),
//   });
// }

    
  
      return res.json({ 
        match: true, 
        id: best.id, 
        name: best.name, 
        score: best.score,
        confidence: confidenceLevel,
        metrics: {
          cosine: best.metrics.cosine,
          euclidean: best.metrics.euclidean,
          combined: best.metrics.combined
        },
        isUnambiguous: isUnambiguous,
        alternatives: isUnambiguous ? [] : topMatches.slice(1, 3).map(m => ({
          name: m.name,
          score: m.score
        }))
      });
    } else {
      return res.json({ 
        match: false, 
        score: best.score, 
        confidence: confidenceLevel,
        message: `No confident match found (best: ${best.name} at ${best.score.toFixed(3)})`,
        suggestions: topMatches.map(m => ({
          name: m.name,
          score: m.score,
          confidence: getConfidenceLevel(m.score)
        }))
      });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server error' });
  }
});

// list pills (for admin UI)
app.get('/pills', verifyToken, async (req, res) => {
  try {
    const pills = await Pill.find({});
    const out = pills.map(e => ({ id: e.pillId, name: e.name, imagePath: e.imagePath }));
    return res.json(out);
  } catch (err) {
    console.error('pills list error', err);
    return res.status(500).json({ error: 'server error' });
  }
});

// routes or directly in app.js
app.get('/api/notifications', verifyToken, async (req, res) => {
  try {
    const caregiverId = req.userId;

    // 1. Fetch logs for this caregiver
    const logs = await VerificationLog.find({ caregiverId })
      .sort({ createdAt: -1 })
      .limit(50);

    // 2. Fetch patients once
    const patientIds = [...new Set(logs.map(l => l.patientId))];
    const patients = await User.find({ userId: { $in: patientIds } })
      .select('userId email');

    const patientMap = {};
    patients.forEach(p => {
      patientMap[p.userId] = p.email;
    });

    // 3. Convert logs → frontend format
    const notifications = logs.map(log => ({
      id: log._id.toString(),
      type: log.result === 'SUCCESS' ? 'success' : 'fallback',
      patientEmail: patientMap[log.patientId] || 'Unknown patient',
      message:
        log.result === 'SUCCESS'
          ? `Patient verified ${log.medicationName}`
          : `Patient failed to verify ${log.medicationName}`,
      timestamp: log.createdAt
    }));

    res.json(notifications);
  } catch (err) {
    console.error('[GET NOTIFICATIONS]', err);
    res.status(500).json({ error: 'server error' });
  }
});


// Test endpoint to send a notification manually (for debugging)
app.post('/test-notification', verifyToken, async (req, res) => {
  try {
    const { sendTestReminder } = require('./scheduler');
    const userId = req.body.userId || req.userId;
    const medicationName = req.body.medicationName || 'Test Medication';
    
    const result = await sendTestReminder(userId, medicationName);
    
    return res.json({ 
      success: result.success, 
      message: 'Test notification sent',
      result: result 
    });
  } catch (err) {
    console.error('test notification error', err);
    return res.status(500).json({ error: 'server error' });
  }
});

// lightweight users listing for admin (exposes users without passwords)
app.get('/users', verifyToken, async (req, res) => {
  try {
    const { User } = require('./database');
    const users = await User.find({}).select('userId name email role');
    const mapped = users.map(u => ({ id: u.userId, name: u.name, email: u.email, role: u.role }));
    return res.json(mapped);
  } catch (err) {
    console.error('users list error', err);
    return res.status(500).json({ error: 'server error' });
  }
});

// Assign caregiver to patient
app.put('/users/:patientId/assign-caregiver', verifyToken, async (req, res) => {
  const { caregiverId } = req.body;
  const { patientId } = req.params;

  // Ensure caregiver exists
  const caregiver = await User.findOne({ userId: caregiverId, role: 'caregiver' });
  if (!caregiver) {
    return res.status(404).json({ error: 'Caregiver not found' });
  }

  // Update patient
  const patient = await User.findOneAndUpdate(
    { userId: patientId, role: 'patient' },
    { assignedCaregiverId: caregiverId },
    { new: true }
  );

  if (!patient) {
    return res.status(404).json({ error: 'Patient not found' });
  }

  res.json({ success: true, assignedCaregiverId: caregiverId });
});

// Get patients for caregiver
app.get('/caregiver/patients', verifyToken, async (req, res) => {
  try {
    // Only caregivers allowed
    const caregiverId = req.userId;

    const patients = await User.find({
      role: 'patient',
      assignedCaregiverId: caregiverId
    }).select('userId name email');

    res.json(patients);
  } catch (err) {
    console.error('[GET CAREGIVER PATIENTS]', err);
    res.status(500).json({ error: 'server error' });
  }
});

app.post('/api/verification/log', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    console.log('[LOG VERIFICATION] User:', userId);
    console.log('[LOG VERIFICATION] user.id:', req.body);
    const { scheduleId, medicationName, detectedName, result } = req.body;

    const patient = await User.findOne({ userId });
    if (!patient?.assignedCaregiverId) {
      return res.json({ success: true });
    }

    await VerificationLog.create({
      logId: uuidv4(),
      patientId: userId,
      caregiverId: patient.assignedCaregiverId,
      medicationName: medicationName || detectedName || 'Unknown',
      detectedName,
      scheduleId: scheduleId || null,
      result, // "SUCCESS" or "FAILURE"
      createdAt: new Date(),
    });

    res.json({ success: true });
  } catch (err) {
    console.error('[LOG ERROR]', err);
    res.status(500).json({ error: 'server error' });
  }
});




const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`MediGuardian backend listening on port ${PORT}`);
});
