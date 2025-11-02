import React, { useState, useEffect } from 'react';
import { StatusBar } from 'react-native';
import * as Notifications from 'expo-notifications';
import AppNavigator from './src/navigation/AppNavigator';

// Notification handler behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({ 
    shouldShowAlert: true, 
    shouldPlaySound: true, 
    shouldSetBadge: true 
  })
});

export default function App() {
  const [user, setUser] = useState(null);
  const [pushToken, setPushToken] = useState(null);

  useEffect(() => {
    registerForPushNotifications();
  }, []);

  useEffect(() => {
    if (user && pushToken) {
      registerPushTokenWithBackend();
    }
  }, [user, pushToken]);

  const registerForPushNotifications = async () => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.warn('Push notification permission not granted');
        return;
      }

      const token = (await Notifications.getExpoPushTokenAsync()).data;
      setPushToken(token);
    } catch (error) {
      console.warn('Failed to register for push notifications:', error);
    }
  };

  const registerPushTokenWithBackend = async () => {
    const BACKEND_URL = 'https://mediguardian-backend-latest.onrender.com';
    
    try {
      await fetch(`${BACKEND_URL}/api/push/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          userId: user.id,
          expoPushToken: pushToken
        })
      });
    } catch (error) {
      console.warn('Failed to register push token with backend:', error);
    }
  };

  return (
    <>
      <StatusBar barStyle="light-content" />
      <AppNavigator user={user} setUser={setUser} />
    </>
  );
}
