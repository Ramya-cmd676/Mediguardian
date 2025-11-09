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
  // 🔔 Notification listeners
  // --------------------------------------
  useEffect(() => {
    console.log('[NOTIF] Setting up notification listeners...');

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('[NOTIF] Notification received (foreground):', notification);

      // Foreground fallback: re-present as a system notification so we can visually confirm
      // This helps confirm whether device actually receives the push while app in foreground
      try {
        const content = {
          title: notification.request.content.title || 'Notification',
          body: notification.request.content.body || '',
          data: notification.request.content.data || {},
          // If Android, attach same channel
          ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : {}),
        };
        // present async but don't block
        Notifications.presentNotificationAsync(content);
      } catch (e) {
        console.warn('[NOTIF] presentNotificationAsync failed:', e);
      }
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      console.log('[NOTIF] Notification tapped:', data);

      if (data?.type === 'reminder' && data?.scheduleId && navigationRef.current) {
        console.log('[NOTIF] Navigating to VerifyPill...');
        setTimeout(() => {
          navigationRef.current?.navigate('PatientApp', {
            screen: 'VerifyPill',
            params: {
              scheduleId: data.scheduleId,
              medicationName: data.medicationName,
              manual: false,
            },
          });
        }, 200);
      }
    });

    return () => {
      console.log('[NOTIF] Cleaning up notification listeners...');
      if (notificationListener.current)
        Notifications.removeNotificationSubscription(notificationListener.current);
      if (responseListener.current)
        Notifications.removeNotificationSubscription(responseListener.current);
    };
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
