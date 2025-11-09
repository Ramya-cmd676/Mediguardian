// App.js (replace entire file with this)
import React, { useState, useEffect, useRef } from 'react';
import { StatusBar, ActivityIndicator, View, Platform, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppNavigator from './src/navigation/AppNavigator';

const USER_STORAGE_KEY = '@mediguardian_user';
const BACKEND_URL = 'https://mediguardian-backend-latest.onrender.com';
const PROJECT_ID = 'e3f7de51-4bbc-4f0e-8446-4eabf39ac9c5';

// Use a single place to create Android channel name constant
const ANDROID_CHANNEL_ID = 'medication-reminders';

export default function App() {
  console.log('[APP] Mounted');

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigationRef = useRef();

  const notificationListener = useRef();
  const responseListener = useRef();

  // -- create Android channel at startup (important before registering tokens) --
  useEffect(() => {
    (async () => {
      try {
        console.log('[INIT] Setting notification handler and channel...');
        Notifications.setNotificationHandler({
          handleNotification: async (notification) => {
            // When in foreground, present a visible notification as well (helps debugging)
            return {
              shouldShowAlert: true,
              shouldPlaySound: true,
              shouldSetBadge: true,
            };
          },
        });

        if (Platform.OS === 'android') {
          // Create channel with HIGH importance (valid value)
          await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
            name: 'Medication Reminders',
            importance: Notifications.AndroidImportance.HIGH, // use HIGH not MAX
            vibrationPattern: [0, 250, 250, 250],
            sound: 'default',
            lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          });
          console.log(`[INIT] Android channel ensured: ${ANDROID_CHANNEL_ID}`);
        }
      } catch (err) {
        console.warn('[INIT] Failed to set notification handler/channel:', err);
      }
    })();
  }, []);

  // --------------------------------------
  // 🔑 Load user session on app start
  // --------------------------------------
  useEffect(() => {
    const loadUserSession = async () => {
      try {
        const savedUser = await AsyncStorage.getItem(USER_STORAGE_KEY);
        console.log('[AUTH] Saved user raw:', savedUser);

        if (savedUser) {
          const parsedUser = JSON.parse(savedUser);
          console.log('[AUTH] ✅ Restored user session:', parsedUser?.email);
          setUser(parsedUser);
        } else {
          console.log('[AUTH] No saved user found');
        }
      } catch (error) {
        console.warn('[AUTH] ❌ Failed to load user session:', error);
      } finally {
        setLoading(false);
      }
    };
    loadUserSession();
  }, []);

  // --------------------------------------
  // 💾 Save / clear user when it changes
  // --------------------------------------
  useEffect(() => {
    const manageUserSession = async () => {
      try {
        if (user) {
          await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
          console.log('[AUTH] 💾 Saved user session');
        } else {
          await AsyncStorage.removeItem(USER_STORAGE_KEY);
          console.log('[AUTH] 🗑️ Cleared user session');
        }
      } catch (error) {
        console.warn('[AUTH] ❌ Failed to update session:', error);
      }
    };
    manageUserSession();
  }, [user]);

// --------------------------------------
// 🔔 Notification listeners + deep linking (robust, with retry + debug alert)
// --------------------------------------
const pendingNotificationRef = useRef(null); // store data until navigation ready
const NAV_RETRY_MAX = 10;
const NAV_RETRY_DELAY = 300; // ms

useEffect(() => {
  console.log('[NOTIF] Setting up notification listeners...');

  // Foreground notifications (when app is open)
  notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
    console.log('[NOTIF] Received (foreground):', notification);
  });

  // Handle when user taps on the notification (background -> foreground)
  responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
    try {
      const data = response.notification.request.content.data;
      console.log('[NOTIF] Notification tapped (response listener):', data);
      // keep a copy in case navigation isn't ready
      pendingNotificationRef.current = data;
      handleNotificationNavigationWithRetry(data);
    } catch (e) {
      console.error('[NOTIF] Error inside response listener:', e);
    }
  });

  // Also handle if the app was opened via notification (cold start)
  (async () => {
    try {
      const lastResponse = await Notifications.getLastNotificationResponseAsync();
      if (lastResponse?.notification) {
        const data = lastResponse.notification.request.content.data;
        console.log('[NOTIF] App opened from killed state with:', data);
        pendingNotificationRef.current = data;
        // small delay to give react tree a chance to mount
        setTimeout(() => handleNotificationNavigationWithRetry(data), 350);
      }
    } catch (e) {
      console.error('[NOTIF] getLastNotificationResponseAsync error:', e);
    }
  })();

  return () => {
    console.log('[NOTIF] Cleaning up notification listeners...');
    if (notificationListener.current)
      Notifications.removeNotificationSubscription(notificationListener.current);
    if (responseListener.current)
      Notifications.removeNotificationSubscription(responseListener.current);
  };
}, []);

// ---------------------------------------------------
// 🧭 Helper: try navigation with retry until nav is ready
// ---------------------------------------------------
const handleNotificationNavigationWithRetry = (data, attempt = 0) => {
  if (!data) return;

  // Only navigate for reminder-type messages
  if (data.type !== 'reminder' || !data.scheduleId) {
    console.log('[NAV] Not a reminder or missing scheduleId:', data);
    return;
  }

  const doNavigate = () => {
    try {
      // check navigationRef exists and (if possible) isReady
      const nav = navigationRef.current;
      const isReady = typeof nav?.isReady === 'function' ? nav.isReady() : !!nav;
      if (nav && isReady) {
        console.log(`[NAV] Navigating (attempt ${attempt + 1}) to VerifyPill with`, data);
        // If your VerifyPill is nested under PatientApp:
        nav.navigate('PatientApp', {
          screen: 'VerifyPill',
          params: {
            scheduleId: data.scheduleId,
            medicationName: data.medicationName,
            manual: false,
          },
        });

        // clear pending
        pendingNotificationRef.current = null;
        return true;
      } else {
        console.log(`[NAV] Navigation not ready (attempt ${attempt + 1})`, { navExists: !!nav, isReady });
        return false;
      }
    } catch (e) {
      console.error('[NAV] navigate() threw:', e);
      return false;
    }
  };

  // Try now
  const success = doNavigate();
  if (!success) {
    // If not succeeded, retry with backoff up to NAV_RETRY_MAX times
    if (attempt < NAV_RETRY_MAX - 1) {
      setTimeout(() => handleNotificationNavigationWithRetry(data, attempt + 1), NAV_RETRY_DELAY);
    } else {
      console.warn('[NAV] Failed to navigate after retries. Storing pending data.');
      // optionally you can surface an Alert to help debug on device
      try {
        Alert.alert('Notification', `Could not open VerifyPill automatically. Tap notifications list or open app.`, [{ text: 'OK' }]);
      } catch (e) { /* ignore if Alert fails in some env */ }
    }
  } else {
    // Success: optional debug toast/alert (remove in production)
    try {
      console.log('[NAV] Navigation success');
    } catch (e) {}
  }
};

// Optional: if user explicitly opens the notifications screen in-app, flush pending navigation
useEffect(() => {
  if (!pendingNotificationRef.current) return;
  // try once more when user returns to foreground
  const sub = Notifications.addNotificationResponseReceivedListener(() => {
    if (pendingNotificationRef.current) {
      handleNotificationNavigationWithRetry(pendingNotificationRef.current);
    }
  });
  return () => Notifications.removeNotificationSubscription(sub);
}, []);


  // --------------------------------------
  // 🚀 Initialize push registration
  // --------------------------------------
  useEffect(() => {
    const initPushFlow = async () => {
      if (!user) {
        console.log('[PUSH] Skipping push registration — no user yet');
        return;
      }

      console.log('[PUSH] User detected:', user.email);
      console.log('[PUSH] Starting registration flow...');

      const token = await registerForPushNotifications();
      if (!token) {
        console.warn('[PUSH] No token returned — skipping backend registration');
        return;
      }

      console.log('[PUSH] Token obtained:', token);
      await registerPushTokenWithBackend(token);
      console.log('[PUSH] ✅ Push token registration complete');
    };

    initPushFlow();
  }, [user]);

  // --------------------------------------
  // 📱 Register for push notifications
  // --------------------------------------
  const registerForPushNotifications = async () => {
    try {
      console.log('[PUSH] ===== Checking notification permissions =====');
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        console.log('[PUSH] Requesting permission...');
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('[PUSH] ❌ Permission denied');
        Alert.alert(
          'Notification Permission Required',
          'Please enable notifications in your device settings to receive medication reminders.',
          [{ text: 'OK' }]
        );
        return null;
      }

      console.log('[PUSH] ✅ Permission granted');

      if (Platform.OS === 'android') {
        // ensure the channel exists just before token generation
        try {
          await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
            name: 'Medication Reminders',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            sound: 'default',
            lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          });
          console.log('[PUSH] Ensured Android channel before token retrieval');
        } catch (e) {
          console.warn('[PUSH] Failed to ensure Android channel:', e);
        }
      }

      const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId: PROJECT_ID });
      const token = tokenResponse?.data;
      console.log('[PUSH] getExpoPushTokenAsync response:', tokenResponse);

      if (!token) {
        console.warn('[PUSH] ❌ getExpoPushTokenAsync returned no token');
        return null;
      }

      console.log('[PUSH] ✅ Expo Push Token:', token);
      return token;
    } catch (error) {
      console.error('[PUSH] ❌ Error during push registration:', error);
      return null;
    }
  };

  // --------------------------------------
  // 🌐 Send token to backend
  // --------------------------------------
  const registerPushTokenWithBackend = async (expoToken) => {
    try {
      if (!expoToken) {
        console.error('[PUSH] ❌ Missing Expo token, cannot register');
        return;
      }

      if (!user?.id || !user?.token) {
        console.error('[PUSH] ❌ Missing user ID or auth token');
        return;
      }

      console.log('[PUSH] Registering token with backend...', {
        userId: user.id,
        tokenPreview: expoToken?.substring(0, 25) + '...',
      });

      const response = await fetch(`${BACKEND_URL}/api/push/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          userId: user.id,
          expoPushToken: expoToken,
          deviceInfo: { platform: Platform.OS },
        }),
      });

      const resultText = await response.text().catch(() => null);
      let result;
      try { result = resultText ? JSON.parse(resultText) : null; } catch (e) { result = resultText; }

      if (response.ok) {
        console.log('[PUSH] ✅ Token registered successfully:', result);
      } else {
        console.error('[PUSH] ❌ Backend registration failed:', response.status, result);
      }
    } catch (error) {
      console.error('[PUSH] ❌ Error sending token to backend:', error);
    }
  };

  // --------------------------------------
  // 🎨 Render
  // --------------------------------------
  return (
    <>
      <StatusBar barStyle="light-content" />
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
          <ActivityIndicator size="large" color="#4A90E2" />
        </View>
      ) : (
        <AppNavigator user={user} setUser={setUser} navigationRef={navigationRef} />
      )}
    </>
  );
}
