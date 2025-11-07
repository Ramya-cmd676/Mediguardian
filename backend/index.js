const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
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
const { connectDB, Pill } = require('./database');

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

    const userId = req.userId; // From verifyToken middleware
    const scheduleId = req.body.scheduleId || req.query.scheduleId; // Accept scheduleId
    
    let pillsQuery = {};
    let expectedPillId = null;
    let expectedPillName = null;

    // If scheduleId provided, verify against ONLY the scheduled pill
    if (scheduleId) {
      console.log(`[VERIFY] Schedule-based verification for scheduleId: ${scheduleId}`);
      
      const { Schedule } = require('./database');
      const schedule = await Schedule.findOne({ scheduleId });
      
      if (schedule) {
        expectedPillId = schedule.pillId;
        expectedPillName = schedule.medicationName;
        
        if (expectedPillId) {
          // Match against ONLY this specific pill
          pillsQuery.pillId = expectedPillId;
          console.log(`[VERIFY] Verifying against scheduled pill: ${expectedPillName} (ID: ${expectedPillId})`);
        } else if (expectedPillName) {
          // Fallback: match by medication name (case-insensitive)
          pillsQuery.name = new RegExp(`^${expectedPillName}$`, 'i');
          console.log(`[VERIFY] Verifying against pill named: ${expectedPillName}`);
        }
      } else {
        console.warn(`[VERIFY] Schedule ${scheduleId} not found, falling back to general verification`);
      }
    } else {
      // Optional: filter by userId for general verification
      if (req.query.filterByUser === 'true' && userId) {
        pillsQuery.userId = userId;
        console.log(`[VERIFY] Filtering pills for user ${userId}`);
      }
    }

    const pillsToCheck = await Pill.find(pillsQuery);
    
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

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`MediGuardian backend listening on port ${PORT}`);
});
