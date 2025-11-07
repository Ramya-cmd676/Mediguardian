import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from '../screens/common/LoginScreen';
import SignupScreen from '../screens/common/SignupScreen';
import CaregiverNavigator from './CaregiverNavigator';
import PatientNavigator from './PatientNavigator';

const Stack = createStackNavigator();

export default function AppNavigator({ user, setUser, navigationRef }) {
  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <>
            <Stack.Screen name="Login">
              {(props) => <LoginScreen {...props} setUser={setUser} />}
            </Stack.Screen>
            <Stack.Screen name="Signup">
              {(props) => <SignupScreen {...props} setUser={setUser} />}
            </Stack.Screen>
          </>
        ) : user.role === 'caregiver' ? (
          <Stack.Screen name="CaregiverApp">
            {(props) => <CaregiverNavigator {...props} user={user} setUser={setUser} />}
          </Stack.Screen>
        ) : (
          <Stack.Screen name="PatientApp">
            {(props) => <PatientNavigator {...props} user={user} setUser={setUser} />}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
