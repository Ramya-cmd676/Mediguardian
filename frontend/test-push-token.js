// Simulate push token registration from frontend
const fetch = require('node-fetch');

const BACKEND_URL = 'https://mediguardian-backend-latest.onrender.com';

async function registerPushToken() {
  const userId = 'test-sim-user';
  const expoPushToken = 'ExponentPushToken[simulated123456789]';
  const deviceInfo = { platform: 'android' };

  const res = await fetch(`${BACKEND_URL}/api/push/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, expoPushToken, deviceInfo })
  });

  const result = await res.json();
  console.log('Backend response:', result);
}

registerPushToken().catch(console.error);
