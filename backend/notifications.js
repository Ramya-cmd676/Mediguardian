const express = require('express');
const router = express.Router();
const { Expo } = require('expo-server-sdk');
const fs = require('fs');
const path = require('path');

const expo = new Expo();

// Database paths
const PUSH_TOKENS_DB = path.join(__dirname, 'db', 'push_tokens.json');
const SCHEDULES_DB = path.join(__dirname, 'db', 'schedules.json');

// Ensure db directory exists
if (!fs.existsSync(path.dirname(PUSH_TOKENS_DB))) {
  fs.mkdirSync(path.dirname(PUSH_TOKENS_DB), { recursive: true });
}

// Helper: Load push tokens database
function loadPushTokens() {
  if (!fs.existsSync(PUSH_TOKENS_DB)) {
    return [];
  }
  const raw = fs.readFileSync(PUSH_TOKENS_DB, 'utf8');
  return JSON.parse(raw || '[]');
}

// Helper: Save push tokens database
function savePushTokens(tokens) {
  fs.writeFileSync(PUSH_TOKENS_DB, JSON.stringify(tokens, null, 2), 'utf8');
}

// Helper: Load schedules database
function loadSchedules() {
  if (!fs.existsSync(SCHEDULES_DB)) {
    return [];
  }
  const raw = fs.readFileSync(SCHEDULES_DB, 'utf8');
  return JSON.parse(raw || '[]');
}

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
router.post('/push/register', (req, res) => {
  try {
    const { userId, expoPushToken, deviceInfo } = req.body;

    if (!userId || !expoPushToken) {
      return res.status(400).json({ 
        error: 'userId and expoPushToken are required' 
      });
    }

    // Validate the token format
    if (!Expo.isExpoPushToken(expoPushToken)) {
      return res.status(400).json({ 
        error: 'Invalid Expo push token format' 
      });
    }

    const tokens = loadPushTokens();

    // Check if token already exists for this user
    const existingIndex = tokens.findIndex(
      t => t.userId === userId && t.expoPushToken === expoPushToken
    );

    if (existingIndex !== -1) {
      // Update existing token
      tokens[existingIndex].deviceInfo = deviceInfo;
      tokens[existingIndex].updatedAt = new Date().toISOString();
    } else {
      // Add new token
      tokens.push({
        userId,
        expoPushToken,
        deviceInfo,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    savePushTokens(tokens);

    console.log(`[PUSH] Registered token for user ${userId}:`, expoPushToken.substring(0, 30) + '...');

    return res.json({ 
      success: true, 
      message: 'Push token registered successfully' 
    });

  } catch (err) {
    console.error('[PUSH] Registration error:', err);
    return res.status(500).json({ error: 'Failed to register push token' });
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

    const tokens = loadPushTokens();
    const userTokens = tokens.filter(t => t.userId === userId);

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

    const tokens = loadPushTokens();

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
 * GET /api/push/tokens
 * Get all registered push tokens (for debugging)
 */
router.get('/push/tokens', (req, res) => {
  try {
    const tokens = loadPushTokens();
    
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
router.delete('/push/unregister', (req, res) => {
  try {
    const { userId, expoPushToken } = req.body;

    if (!userId || !expoPushToken) {
      return res.status(400).json({ 
        error: 'userId and expoPushToken are required' 
      });
    }

    const tokens = loadPushTokens();
    const filteredTokens = tokens.filter(
      t => !(t.userId === userId && t.expoPushToken === expoPushToken)
    );

    savePushTokens(filteredTokens);

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
    const { userId, medicationName, time, id } = schedule;

    const tokens = loadPushTokens();
    const userTokens = tokens.filter(t => t.userId === userId);

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
          scheduleId: id,
          medicationName: medicationName,
          scheduledTime: time
        },
        priority: 'high',
        badge: 1
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
  sendMedicationReminder,
  loadSchedules
};
