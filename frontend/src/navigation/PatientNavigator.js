import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import PatientHomeScreen from '../screens/patient/PatientHomeScreen';
import VerifyPillScreen from '../screens/patient/VerifyPillScreen';

const Stack = createStackNavigator();

export default function PatientNavigator({ user, setUser }) {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#4A90E2' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen
        name="PatientHome"
        options={{ title: 'My Medications' }}
      >
        {(props) => <PatientHomeScreen {...props} user={user} setUser={setUser} />}
      </Stack.Screen>
      
      <Stack.Screen
        name="VerifyPill"
        options={{ title: 'Verify Medication' }}
      >
        {(props) => <VerifyPillScreen {...props} user={user} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
