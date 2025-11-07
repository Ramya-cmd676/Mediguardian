const express = require('express');
const { Schedule, PushToken } = require('./database');
const { Expo } = require('expo-server-sdk');

const router = express.Router();
const { verifyToken, requireRole } = require('./auth');

// CRUD for schedules (caregiver only for create/update/delete)
router.get('/schedules', verifyToken, async (req, res) => {
  try {
    const { patientId } = req.query;
    let query = {};
    if (patientId) query.patientId = patientId;
    
    const schedules = await Schedule.find(query);
    
    // Map to compatible format
    const mapped = schedules.map(s => ({
      id: s.scheduleId,
      userId: s.userId,
      patientId: s.patientId,
      pillId: s.pillId,
      medicationName: s.medicationName,
      time: s.time,
      daysOfWeek: s.daysOfWeek,
      active: s.active,
      lastSentAt: s.lastSentAt,
      createdBy: s.createdBy,
      createdAt: s.createdAt
    }));
    
    return res.json(mapped);
  } catch (err) {
    console.error('get schedules error', err);
    return res.status(500).json({ error: 'server error' });
  }
});

router.post('/schedules', verifyToken, async (req, res) => {
  try {
    const creatorId = req.user && req.user.id;
    const { patientId: bodyPatientId, pillId, times, label, medicationName, time, daysOfWeek } = req.body;

    const patientId = bodyPatientId || creatorId;

    // Normalize time
    let normalizedTime = '';
    if (typeof time === 'string' && time.trim()) {
      normalizedTime = time.trim();
    } else if (Array.isArray(times) && times.length > 0) {
      normalizedTime = times[0];
    }

    if (!patientId || !normalizedTime) return res.status(400).json({ error: 'patientId and time required' });

    const scheduleId = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,9);
    
    const schedule = new Schedule({
      scheduleId,
      userId: patientId,
      patientId,
      pillId: pillId || null,
      medicationName: medicationName || label || '',
      time: normalizedTime,
      daysOfWeek: Array.isArray(daysOfWeek) ? daysOfWeek : null,
      active: true,
      lastSentAt: null,
      createdBy: creatorId
    });
    
    await schedule.save();
    
    return res.json({ success: true, id: scheduleId });
  } catch (err) {
    console.error('create schedule', err);
    return res.status(500).json({ error: 'server error' });
  }
});

router.put('/schedules/:id', verifyToken, async (req, res) => {
  try {
    const id = req.params.id;
    const schedule = await Schedule.findOne({ scheduleId: id });
    if (!schedule) return res.status(404).json({ error: 'not found' });

    // Only caregivers or the owner can update
    const requester = req.user || {};
    if (requester.role !== 'caregiver' && requester.id !== schedule.patientId) {
      return res.status(403).json({ error: 'forbidden' });
    }

    // Merge allowed fields
    const allowed = ['pillId', 'medicationName', 'times', 'time', 'daysOfWeek', 'active', 'label'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) schedule[key] = req.body[key];
    }

    await schedule.save();
    return res.json({ success: true });
  } catch (err) {
    console.error('update schedule', err);
    return res.status(500).json({ error: 'server error' });
  }
});

router.delete('/schedules/:id', verifyToken, async (req, res) => {
  try {
    const id = req.params.id;
    const schedule = await Schedule.findOne({ scheduleId: id });
    if (!schedule) return res.status(404).json({ error: 'not found' });

    const requester = req.user || {};
    if (requester.role !== 'caregiver' && requester.id !== schedule.patientId) {
      return res.status(403).json({ error: 'forbidden' });
    }

    await Schedule.deleteOne({ scheduleId: id });
    return res.json({ success: true });
  } catch (err) {
    console.error('delete schedule', err);
    return res.status(500).json({ error: 'server error' });
  }
});

// NOTE: Scheduler is handled by scheduler.js to avoid duplicate cron jobs
// The cron job has been removed from this file to prevent sending notifications twice

module.exports = router;
