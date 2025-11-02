const express = require('express');
const fs = require('fs');
const path = require('path');
const { Expo } = require('expo-server-sdk');
const cron = require('node-cron');

const router = express.Router();
const { verifyToken, requireRole } = require('./auth');

const SCHEDULES_DB = path.join(__dirname, 'db', 'schedules.json');
const PUSH_DB = path.join(__dirname, 'db', 'pushTokens.json');

function ensureDb(file) {
  if (!fs.existsSync(file)) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify([]));
  }
}

function loadDb(file) {
  try {
    ensureDb(file);
    const raw = fs.readFileSync(file, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (err) {
    console.error('Failed to load DB', file, err);
    return [];
  }
}

function saveDb(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// Register push token for a user (authenticated)
router.post('/push/register', verifyToken, (req, res) => {
  try {
    const { userId, expoPushToken, deviceInfo } = req.body;
    if (!userId || !expoPushToken) return res.status(400).json({ error: 'userId and expoPushToken required' });

    const tokens = loadDb(PUSH_DB);
    const existing = tokens.find(t => t.userId === userId && t.expoPushToken === expoPushToken);
    if (!existing) {
      tokens.push({ userId, expoPushToken, deviceInfo: deviceInfo || null, createdAt: new Date().toISOString() });
      saveDb(PUSH_DB, tokens);
    }
    return res.json({ success: true });
  } catch (err) {
    console.error('push register error', err);
    return res.status(500).json({ error: 'server error' });
  }
});

// CRUD for schedules (caregiver only for create/update/delete)
// schedule model: { id, patientId, pillId, times: ['08:00','20:00'], active: true, lastSentAt }
router.get('/schedules', verifyToken, (req, res) => {
  const db = loadDb(SCHEDULES_DB);
  const { patientId } = req.query;
  if (patientId) return res.json(db.filter(s => s.patientId === patientId));
  return res.json(db);
});

router.post('/schedules', verifyToken, (req, res) => {
  try {
    // Allow patients to create their own schedules or caregivers to create for patients
    // Accept either: { patientId, pillId, times } OR simplified { medicationName, time, daysOfWeek }
    const creatorId = req.user && req.user.id;
    const { patientId: bodyPatientId, pillId, times, label, medicationName, time, daysOfWeek } = req.body;

    const patientId = bodyPatientId || creatorId;

    // Normalize times: allow single time string or array
    let timesArr = [];
    if (Array.isArray(times) && times.length > 0) timesArr = times;
    else if (typeof time === 'string' && time.trim()) timesArr = [time.trim()];

    if (!patientId || timesArr.length === 0) return res.status(400).json({ error: 'patientId and time(s) required' });

    const db = loadDb(SCHEDULES_DB);
    const id = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,9);
    const entry = {
      id,
      patientId,
      pillId: pillId || null,
      medicationName: medicationName || label || '',
      times: timesArr,
      daysOfWeek: Array.isArray(daysOfWeek) ? daysOfWeek : null,
      active: true,
      lastSentAt: null,
      createdBy: creatorId,
      createdAt: new Date().toISOString()
    };
    db.push(entry);
    saveDb(SCHEDULES_DB, db);
    return res.json({ success: true, id });
  } catch (err) {
    console.error('create schedule', err);
    return res.status(500).json({ error: 'server error' });
  }
});

router.put('/schedules/:id', verifyToken, (req, res) => {
  try {
    const id = req.params.id;
    const db = loadDb(SCHEDULES_DB);
    const idx = db.findIndex(s => s.id === id);
    if (idx === -1) return res.status(404).json({ error: 'not found' });

    // Only caregivers or the owner (patient) who the schedule belongs to can update
    const schedule = db[idx];
    const requester = req.user || {};
    if (requester.role !== 'caregiver' && requester.id !== schedule.patientId) {
      return res.status(403).json({ error: 'forbidden' });
    }

    // Merge allowed fields
    const allowed = ['pillId', 'medicationName', 'times', 'daysOfWeek', 'active', 'label'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) schedule[key] = req.body[key];
    }

    db[idx] = schedule;
    saveDb(SCHEDULES_DB, db);
    return res.json({ success: true });
  } catch (err) {
    console.error('update schedule', err);
    return res.status(500).json({ error: 'server error' });
  }
});

router.delete('/schedules/:id', verifyToken, (req, res) => {
  try {
    const id = req.params.id;
    const db = loadDb(SCHEDULES_DB);
    const idx = db.findIndex(s => s.id === id);
    if (idx === -1) return res.status(404).json({ error: 'not found' });

    const schedule = db[idx];
    const requester = req.user || {};
    if (requester.role !== 'caregiver' && requester.id !== schedule.patientId) {
      return res.status(403).json({ error: 'forbidden' });
    }

    db.splice(idx, 1);
    saveDb(SCHEDULES_DB, db);
    return res.json({ success: true });
  } catch (err) {
    console.error('delete schedule', err);
    return res.status(500).json({ error: 'server error' });
  }
});

// Scheduler: run every minute and send pushes for matching times
const expo = new Expo();

function sendPushToUser(userId, payload) {
  try {
    const tokens = loadDb(PUSH_DB).filter(t => t.userId === userId).map(t => t.expoPushToken);
    const messages = [];
    for (const pushToken of tokens) {
      if (!Expo.isExpoPushToken(pushToken)) {
        console.warn('Invalid expo push token', pushToken);
        continue;
      }
      messages.push({ to: pushToken, sound: 'default', title: payload.title || 'MediGuardian', body: payload.body || '', data: payload.data || {} });
    }
    if (messages.length === 0) return Promise.resolve([]);
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];
    return (async () => {
      for (const chunk of chunks) {
        try {
          const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
          tickets.push(...ticketChunk);
        } catch (err) {
          console.error('Expo send error', err);
        }
      }
      return tickets;
    })();
  } catch (err) {
    console.error('sendPush error', err);
    return Promise.resolve([]);
  }
}

// Helper: format current time HH:MM
function nowHHMM() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

// Run every minute
cron.schedule('* * * * *', async () => {
  try {
    const current = nowHHMM();
    const schedules = loadDb(SCHEDULES_DB).filter(s => s.active);
    if (!schedules.length) return;

    for (const s of schedules) {
      if (!s.times || !Array.isArray(s.times)) continue;
      // if schedule has time matching current minute
      if (s.times.includes(current)) {
        // avoid duplicate sends within same minute
        if (s.lastSentAt === new Date().toISOString().slice(0,16)) continue;
        // send push to patient
        const payload = { title: 'Medication Reminder', body: s.label || 'Time to take your medication', data: { type: 'reminder', scheduleId: s.id, pillId: s.pillId } };
        await sendPushToUser(s.patientId, payload);
        // update lastSentAt to minute precision
        const db = loadDb(SCHEDULES_DB);
        const idx = db.findIndex(x => x.id === s.id);
        if (idx !== -1) {
          db[idx].lastSentAt = new Date().toISOString().slice(0,16);
          saveDb(SCHEDULES_DB, db);
        }
      }
    }
  } catch (err) {
    console.error('Scheduler error', err);
  }
});

module.exports = router;
