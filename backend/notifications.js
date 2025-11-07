const express = require('express');
const router = express.Router();
const { Expo } = require('expo-server-sdk');
const { PushToken, Schedule, User } = require('./database');

const expo = new Expo();

/**
 * POST /api/push/register
 * Register a user's push notification token
 * 
 * Body:
 * {
 *   "userId": "user-id",
 *   "expoPushToken": "ExponentPushToken[xxxxx]",
 *   "deviceInfo": { "platform": "android" }
 * }
 */
router.post('/push/register', async (req, res) => {
  try {
    console.log('[PUSH-REGISTER] ===== NEW REQUEST =====');
    console.log('[PUSH-REGISTER] Headers:', JSON.stringify(req.headers, null, 2));
    console.log('[PUSH-REGISTER] Body:', JSON.stringify(req.body, null, 2));
    
    const { userId, expoPushToken, deviceInfo } = req.body;

    if (!userId || !expoPushToken) {
      console.error('[PUSH-REGISTER] ❌ Missing fields - userId:', !!userId, 'expoPushToken:', !!expoPushToken);
      return res.status(400).json({ 
        error: 'userId and expoPushToken are required' 
      });
    }

    // Validate the token format
    if (!Expo.isExpoPushToken(expoPushToken)) {
      console.error('[PUSH-REGISTER] ❌ Invalid token format:', expoPushToken);
      return res.status(400).json({ 
        error: 'Invalid Expo push token format' 
      });
    }

    console.log('[PUSH-REGISTER] Valid token received for user:', userId);

    // Check if token already exists for this user
    const existing = await PushToken.findOne({ userId, expoPushToken });

    if (existing) {
      console.log('[PUSH-REGISTER] Token already exists, updating...');
      // Update existing token
      existing.deviceInfo = deviceInfo;
      existing.updatedAt = new Date();
      await existing.save();
      console.log('[PUSH-REGISTER] ✅ Token updated successfully');
    } else {
      console.log('[PUSH-REGISTER] Creating new push token entry...');
      // Add new token
      const pushToken = new PushToken({
        userId,
        expoPushToken,
        deviceInfo
      });
      await pushToken.save();
      console.log('[PUSH-REGISTER] ✅ Token saved successfully');
    }

    console.log(`[PUSH-REGISTER] SUCCESS for user ${userId}: ${expoPushToken.substring(0, 30)}...`);

    return res.json({ 
      success: true, 
      message: 'Push token registered successfully' 
    });

  } catch (err) {
    console.error('[PUSH-REGISTER] ❌❌❌ EXCEPTION:', err);
    console.error('[PUSH-REGISTER] Stack:', err.stack);
    return res.status(500).json({ error: 'Failed to register push token' });
  }
});

// TEST ROUTE (no auth) - register push token (useful for debugging from curl/Postman)
router.post('/push/register-test', async (req, res) => {
  try {
    const { userId, expoPushToken, deviceInfo } = req.body;
    console.log('[PUSH-TEST] Request received:', { userId, tokenPreview: expoPushToken?.substring(0, 30), deviceInfo });

    if (!userId || !expoPushToken) {
      console.error('[PUSH-TEST] Missing required fields');
      return res.status(400).json({ error: 'userId and expoPushToken required' });
    }

    if (!Expo.isExpoPushToken(expoPushToken)) {
      return res.status(400).json({ error: 'Invalid Expo push token format' });
    }

    const existing = await PushToken.findOne({ userId, expoPushToken });
    if (existing) {
      existing.deviceInfo = deviceInfo || existing.deviceInfo;
      existing.updatedAt = new Date();
      await existing.save();
      console.log('[PUSH-TEST] Token already existed - updated');
      return res.json({ success: true, message: 'Token updated' });
    }

    const pushToken = new PushToken({ userId, expoPushToken, deviceInfo: deviceInfo || null });
    await pushToken.save();
    console.log('[PUSH-TEST] ✅ Token saved successfully for user:', userId);
    return res.json({ success: true });
  } catch (err) {
    console.error('[PUSH-TEST] ❌ Error:', err);
    return res.status(500).json({ error: 'server error' });
  }
});

/**
 * POST /api/push/send
 * Send a push notification to a specific user
 * 
 * Body:
 * {
 *   "userId": "user-id",
 *   "title": "Notification title",
 *   "body": "Notification message",
 *   "data": { "type": "reminder", "scheduleId": "123" }
 * }
 */
router.post('/push/send', async (req, res) => {
  try {
    const { userId, title, body, data } = req.body;

    if (!userId || !title || !body) {
      return res.status(400).json({ 
        error: 'userId, title, and body are required' 
      });
    }

    const userTokens = await PushToken.find({ userId });

    if (userTokens.length === 0) {
      return res.status(404).json({ 
        error: 'No push tokens found for this user' 
      });
    }

    // Create messages for all user's devices
    const messages = [];
    for (const tokenEntry of userTokens) {
      if (!Expo.isExpoPushToken(tokenEntry.expoPushToken)) {
        console.warn(`[PUSH] Invalid token for user ${userId}:`, tokenEntry.expoPushToken);
        continue;
      }

      messages.push({
        to: tokenEntry.expoPushToken,
        sound: 'default',
        title: title,
        body: body,
        data: data || {},
        priority: 'high',
        channelId: 'default'
      });
    }

    if (messages.length === 0) {
      return res.status(400).json({ 
        error: 'No valid push tokens available' 
      });
    }

    // Send notifications in chunks
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error('[PUSH] Error sending chunk:', error);
      }
    }

    console.log(`[PUSH] Sent ${messages.length} notification(s) to user ${userId}`);

    return res.json({ 
      success: true, 
      ticketCount: tickets.length,
      tickets: tickets
    });

  } catch (err) {
    console.error('[PUSH] Send error:', err);
    return res.status(500).json({ error: 'Failed to send push notification' });
  }
});

/**
 * POST /api/push/send-to-all
 * Send a notification to all registered users
 * 
 * Body:
 * {
 *   "title": "Notification title",
 *   "body": "Notification message",
 *   "data": { "type": "announcement" }
 * }
 */
router.post('/push/send-to-all', async (req, res) => {
  try {
    const { title, body, data } = req.body;

    if (!title || !body) {
      return res.status(400).json({ 
        error: 'title and body are required' 
      });
    }

    const tokens = await PushToken.find({});

    if (tokens.length === 0) {
      return res.status(404).json({ 
        error: 'No push tokens registered' 
      });
    }

    // Create messages for all tokens
    const messages = tokens
      .filter(t => Expo.isExpoPushToken(t.expoPushToken))
      .map(t => ({
        to: t.expoPushToken,
        sound: 'default',
        title: title,
        body: body,
        data: data || {},
        priority: 'default'
      }));

    // Send notifications in chunks
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error('[PUSH] Error sending chunk:', error);
      }
    }

    console.log(`[PUSH] Broadcast sent to ${messages.length} device(s)`);

    return res.json({ 
      success: true, 
      deviceCount: messages.length,
      ticketCount: tickets.length
    });

  } catch (err) {
    console.error('[PUSH] Broadcast error:', err);
    return res.status(500).json({ error: 'Failed to send broadcast notification' });
  }
});

/**
 * POST /api/push/send-to-role
 * Send a notification to all users with a specific role
 * 
 * Body:
 * {
 *   "role": "caregiver",
 *   "title": "Notification title",
 *   "body": "Notification message",
 *   "data": { "type": "alert", "patientId": "123" }
 * }
 */
router.post('/push/send-to-role', async (req, res) => {
  try {
    const { role, title, body, data } = req.body;

    if (!role || !title || !body) {
      return res.status(400).json({ 
        error: 'role, title, and body are required' 
      });
    }

    // Get userIds with the specified role
    const users = await User.find({ role });
    const roleUserIds = users.map(u => u.userId);

    if (roleUserIds.length === 0) {
      return res.status(404).json({ 
        error: `No users found with role: ${role}` 
      });
    }

    console.log(`[PUSH] Sending to ${roleUserIds.length} user(s) with role "${role}"`);

    // Load push tokens and filter by role userIds
    const roleTokens = await PushToken.find({ userId: { $in: roleUserIds } });

    if (roleTokens.length === 0) {
      return res.status(404).json({ 
        error: `No push tokens found for users with role: ${role}` 
      });
    }

    // Create messages
    const messages = roleTokens
      .filter(t => Expo.isExpoPushToken(t.expoPushToken))
      .map(t => ({
        to: t.expoPushToken,
        sound: 'default',
        title: title,
        body: body,
        data: data || {},
        priority: 'high',
        channelId: 'medication-alerts'
      }));

    if (messages.length === 0) {
      return res.status(400).json({ 
        error: 'No valid push tokens available' 
      });
    }

    // Send notifications in chunks
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error('[PUSH] Error sending chunk:', error);
      }
    }

    console.log(`[PUSH] Sent ${messages.length} notification(s) to role "${role}"`);

    return res.json({ 
      success: true, 
      role: role,
      userCount: roleUserIds.length,
      deviceCount: messages.length,
      ticketCount: tickets.length
    });

  } catch (err) {
    console.error('[PUSH] Send-to-role error:', err);
    return res.status(500).json({ error: 'Failed to send role-based notification' });
  }
});

/**
 * GET /api/push/tokens
 * Get all registered push tokens (for debugging)
 */
router.get('/push/tokens', async (req, res) => {
  try {
    const tokens = await PushToken.find({});
    
    // Don't expose full tokens in production
    const sanitized = tokens.map(t => ({
      userId: t.userId,
      tokenPreview: t.expoPushToken.substring(0, 30) + '...',
      platform: t.deviceInfo?.platform || 'unknown',
      createdAt: t.createdAt,
      updatedAt: t.updatedAt
    }));

    return res.json(sanitized);
  } catch (err) {
    console.error('[PUSH] Tokens list error:', err);
    return res.status(500).json({ error: 'Failed to get tokens' });
  }
});

/**
 * DELETE /api/push/unregister
 * Remove a user's push token
 * 
 * Body:
 * {
 *   "userId": "user-id",
 *   "expoPushToken": "ExponentPushToken[xxxxx]"
 * }
 */
router.delete('/push/unregister', async (req, res) => {
  try {
    const { userId, expoPushToken } = req.body;

    if (!userId || !expoPushToken) {
      return res.status(400).json({ 
        error: 'userId and expoPushToken are required' 
      });
    }

    await PushToken.deleteOne({ userId, expoPushToken });

    console.log(`[PUSH] Unregistered token for user ${userId}`);

    return res.json({ 
      success: true, 
      message: 'Push token unregistered successfully' 
    });

  } catch (err) {
    console.error('[PUSH] Unregister error:', err);
    return res.status(500).json({ error: 'Failed to unregister push token' });
  }
});

/**
 * Send medication reminder based on schedule
 * This is called by the cron job
 */
async function sendMedicationReminder(schedule) {
  try {
    const { userId, medicationName, time, scheduleId } = schedule;

    const userTokens = await PushToken.find({ userId });

    if (userTokens.length === 0) {
      console.log(`[REMINDER] No tokens found for user ${userId}`);
      return { success: false, reason: 'No tokens found' };
    }

    const messages = userTokens
      .filter(t => Expo.isExpoPushToken(t.expoPushToken))
      .map(t => ({
        to: t.expoPushToken,
        sound: 'default',
        title: 'Medication Reminder',
        body: `Time to take ${medicationName}`,
        data: { 
          type: 'reminder',
          scheduleId: scheduleId,
          medicationName: medicationName,
          scheduledTime: time
        },
        priority: 'max',
        badge: 1,
        vibrate: [0, 250, 250, 250],
        channelId: 'medication-reminders'
      }));

    if (messages.length === 0) {
      return { success: false, reason: 'No valid tokens' };
    }

    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error('[REMINDER] Error sending chunk:', error);
      }
    }

    console.log(`[REMINDER] Sent reminder for ${medicationName} to user ${userId}`);

    return { success: true, ticketCount: tickets.length };

  } catch (err) {
    console.error('[REMINDER] Error:', err);
    return { success: false, error: err.message };
  }
}

module.exports = { 
  router, 
  sendMedicationReminder
};
