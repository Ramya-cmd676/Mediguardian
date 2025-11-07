import React, { useState, useEffect, useRef } from 'react';
import { StatusBar, ActivityIndicator, View, Platform, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppNavigator from './src/navigation/AppNavigator';

// Configure how notifications behave when received
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
});

const USER_STORAGE_KEY = '@mediguardian_user';
const BACKEND_URL = 'https://mediguardian-backend-latest.onrender.com';
const PROJECT_ID = 'e3f7de51-4bbc-4f0e-8446-4eabf39ac9c5';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigationRef = useRef();
  const notificationListener = useRef();
  const responseListener = useRef();

  /** ---------------------------------
   * 🔑 Load saved user on startup
   * --------------------------------- */
  useEffect(() => {
    const loadUserSession = async () => {
      try {
        const savedUser = await AsyncStorage.getItem(USER_STORAGE_KEY);
        console.log('[AUTH] Saved user raw:', savedUser);

        if (savedUser) {
          const parsedUser = JSON.parse(savedUser);
          console.log('[AUTH] ✅ Restored user:', parsedUser?.email);
          setUser(parsedUser);
        } else {
          console.log('[AUTH] No saved user found');
        }
      } catch (error) {
        console.warn('[AUTH] ❌ Failed to load user:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserSession();
  }, []);

  /** ---------------------------------
   * 💾 Save or clear user session
   * --------------------------------- */
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

  /** ---------------------------------
   * 🔔 Notification listeners
   * --------------------------------- */
  useEffect(() => {
    console.log('[NOTIF] Setting up notification listeners...');

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('[NOTIF] Notification received (foreground):', notification);
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

  /** ---------------------------------
   * 🚀 Initialize push flow when user loads
   * --------------------------------- */
  useEffect(() => {
    const initPushFlow = async () => {
      if (!user) {
        console.log('[PUSH] Skipping push registration — no user yet');
        return;
      }

      console.log('[PUSH] User detected, registering for push notifications...');

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

  /** ---------------------------------
   * 📱 Register for push notifications
   * --------------------------------- */
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
          'Please enable notifications in your device settings to receive reminders.',
          [{ text: 'OK' }]
        );
        return null;
      }

      console.log('[PUSH] ✅ Permission granted');

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('medication-reminders', {
          name: 'Medication Reminders',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          sound: 'default',
        });
      }

      const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId: PROJECT_ID });
      const token = tokenResponse.data;

      console.log('[PUSH] ✅ Expo Push Token:', token);
      return token;
    } catch (error) {
      console.error('[PUSH] ❌ Error registering push notifications:', error);
      return null;
    }
  };

  /** ---------------------------------
   * 🌐 Send push token to backend
   * --------------------------------- */
  const registerPushTokenWithBackend = async (expoToken) => {
    try {
      if (!user?.id || !user?.token) {
        console.error('[PUSH] ❌ Missing user ID or auth token');
        return;
      }

      console.log('[PUSH] Registering token with backend...', {
        userId: user.id,
        tokenPreview: expoToken?.substring(0, 30) + '...',
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

      const result = await response.json();

      if (response.ok) {
        console.log('[PUSH] ✅ Token registered successfully:', result);
      } else {
        console.error('[PUSH] ❌ Backend registration failed:', result);
      }
    } catch (error) {
      console.error('[PUSH] ❌ Error sending token to backend:', error);
    }
  };

  /** ---------------------------------
   * 🎨 Render
   * --------------------------------- */
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
