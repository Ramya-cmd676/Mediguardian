import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import CaregiverHomeScreen from '../screens/caregiver/CaregiverHomeScreen';
import AddTabletScreen from '../screens/caregiver/AddTabletScreen';
import ManageRemindersScreen from '../screens/caregiver/ManageRemindersScreen';
import ViewNotificationsScreen from '../screens/caregiver/ViewNotificationsScreen';

const Tab = createBottomTabNavigator();

export default function CaregiverNavigator({ user, setUser }) {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#4A90E2',
        tabBarInactiveTintColor: '#999',
        headerShown: true,
        headerStyle: { backgroundColor: '#4A90E2' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Tab.Screen
        name="Home"
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24, color }}>🏠</Text>,
        }}
      >
        {(props) => <CaregiverHomeScreen {...props} user={user} setUser={setUser} />}
      </Tab.Screen>
      
      <Tab.Screen
        name="AddTablet"
        options={{
          tabBarLabel: 'Add Tablet',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24, color }}>➕</Text>,
        }}
      >
        {(props) => <AddTabletScreen {...props} user={user} />}
      </Tab.Screen>
      
      <Tab.Screen
        name="Reminders"
        options={{
          tabBarLabel: 'Reminders',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24, color }}>⏰</Text>,
        }}
      >
        {(props) => <ManageRemindersScreen {...props} user={user} />}
      </Tab.Screen>
      
      <Tab.Screen
        name="Notifications"
        options={{
          tabBarLabel: 'Alerts',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24, color }}>🔔</Text>,
        }}
      >
        {(props) => <ViewNotificationsScreen {...props} user={user} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
