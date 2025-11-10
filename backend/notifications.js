// pushRoutes.js
const express = require('express');
const router = express.Router();
const { Expo } = require('expo-server-sdk');
const { PushToken, Schedule, User } = require('./database'); // adjust path if needed

const expo = new Expo();

/**
 * POST /api/push/register
 */
router.post('/push/register', async (req, res) => {
  try {
    console.log('[PUSH-REGISTER] ===== NEW REQUEST =====');
    console.log('[PUSH-REGISTER] Headers:', JSON.stringify(req.headers));
    console.log('[PUSH-REGISTER] Body:', JSON.stringify(req.body));

    const { userId, expoPushToken, deviceInfo } = req.body;
    if (!userId || !expoPushToken) {
      console.error('[PUSH-REGISTER] ❌ Missing userId or expoPushToken');
      return res.status(400).json({ error: 'userId and expoPushToken required' });
    }

    if (!Expo.isExpoPushToken(expoPushToken)) {
      console.error('[PUSH-REGISTER] ❌ Invalid Expo token format:', expoPushToken);
      return res.status(400).json({ error: 'Invalid Expo push token' });
    }

    const existing = await PushToken.findOne({ userId, expoPushToken });
    if (existing) {
      existing.deviceInfo = deviceInfo || existing.deviceInfo;
      existing.updatedAt = new Date();
      await existing.save();
      console.log('[PUSH-REGISTER] Token existed — updated');
    } else {
      const pushToken = new PushToken({ userId, expoPushToken, deviceInfo });
      await pushToken.save();
      console.log('[PUSH-REGISTER] Token saved');
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('[PUSH-REGISTER] Error:', err);
    return res.status(500).json({ error: 'server error' });
  }
});

/**
 * POST /api/push/send (single user)
 */
router.post('/push/send', async (req, res) => {
  try {
    const { userId, title, body, data = {} } = req.body;
    if (!userId || !title || !body)
      return res.status(400).json({ error: 'userId, title, body required' });

    const tokens = await PushToken.find({ userId });
    if (!tokens || tokens.length === 0)
      return res.status(404).json({ error: 'No tokens' });

    const messages = tokens
      .filter(t => Expo.isExpoPushToken(t.expoPushToken))
      .map(t => ({
        to: t.expoPushToken,
        sound: 'default',
        title,
        body,
        data,
        priority: 'high',
        channelId: 'medication-reminders',
      }));

    if (messages.length === 0)
      return res.status(400).json({ error: 'No valid tokens' });

    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
        console.log('[PUSH] ticketChunk:', JSON.stringify(ticketChunk));
      } catch (err) {
        console.error('[PUSH] send chunk error:', err);
      }
    }

    return res.json({
      success: true,
      sent: messages.length,
      ticketsCount: tickets.length,
      tickets,
    });
  } catch (err) {
    console.error('[PUSH] send error:', err);
    return res.status(500).json({ error: 'server error' });
  }
});

/**
 * GET /api/push/tokens - debug
 */
router.get('/push/tokens', async (req, res) => {
  try {
    const tokens = await PushToken.find({});
    const out = tokens.map(t => ({
      userId: t.userId,
      token: t.expoPushToken,
      platform: t.deviceInfo?.platform,
    }));
    return res.json(out);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server error' });
  }
});

/**
 * sendMedicationReminder(schedule)
 * keep this exported for your cron/scheduler
 */
async function sendMedicationReminder(schedule) {
  try {
    const { userId, medicationName, time, scheduleId } = schedule;

    const tokens = await PushToken.find({ userId });
    if (!tokens || tokens.length === 0) {
      console.log(`[REMINDER] No tokens for ${userId}`);
      return { success: false };
    }

    // ✅ FIXED: Proper message with all required fields
    const messages = tokens
      .filter(t => Expo.isExpoPushToken(t.expoPushToken))
      .map(t => ({
        to: t.expoPushToken,
        sound: 'default',
        title: 'Medication Reminder',
        body: `Time to take your medicine: ${medicationName}`,
        channelId: 'medication-reminders',
        priority: 'high',
        data: {
          type: 'reminder',
          scheduleId,
          medicationName,
          scheduledTime: time,
        },
      }));

    if (messages.length === 0)
      return { success: false, reason: 'no-valid' };

    console.log(
      '[REMINDER] Sending messages:',
      JSON.stringify(messages.map(m => ({
        to: m.to,
        title: m.title,
        body: m.body,
        channelId: m.channelId,
      })))
    );

    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
        console.log('[REMINDER] ticketChunk:', ticketChunk);
      } catch (err) {
        console.error('[REMINDER] send chunk error:', err);
      }
    }

    console.log(`[REMINDER] ✅ Sent reminder for ${medicationName} to ${userId}`);
    return { success: true, ticketsCount: tickets.length, tickets };
  } catch (err) {
    console.error('[REMINDER] Error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * POST /api/push/send-to-role
 * Sends a push notification to ALL users with a given role
 * Example: { role: 'caregiver', title, body, data }
 */
router.post('/push/send-to-role', async (req, res) => {
  try {
    const { role, title, body, data = {} } = req.body;
    if (!role || !title || !body) {
      return res.status(400).json({ error: 'role, title, and body are required' });
    }

    // Find all users with this role
    const { User, PushToken } = require('./database');
    const users = await User.find({ role });
    const userIds = users.map(u => u.userId);

    // Find all push tokens for those users
    const tokens = await PushToken.find({ userId: { $in: userIds } });
    if (tokens.length === 0) {
      console.log(`[PUSH] No tokens found for role: ${role}`);
      return res.json({ success: false, message: 'No tokens for this role' });
    }

    // Prepare messages
    const messages = tokens
      .filter(t => Expo.isExpoPushToken(t.expoPushToken))
      .map(t => ({
        to: t.expoPushToken,
        sound: 'default',
        title,
        body,
        data,
        channelId: 'medication-reminders',
        priority: 'high',
      }));

    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
        console.log('[PUSH-ROLE] ticketChunk:', ticketChunk);
      } catch (err) {
        console.error('[PUSH-ROLE] send chunk error:', err);
      }
    }

    console.log(`[PUSH-ROLE] ✅ Sent ${messages.length} notifications to all ${role}s`);
    return res.json({ success: true, sent: messages.length });
  } catch (err) {
    console.error('[PUSH-ROLE] Error:', err);
    return res.status(500).json({ error: 'server error' });
  }
});


module.exports = { router, sendMedicationReminder };
