import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';

const BACKEND_URL = 'https://mediguardian-backend-latest.onrender.com';

export default function SignupScreen({ navigation, setUser }) {
  const [role, setRole] = useState('patient');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert('Missing Information', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Registration successful - now login automatically
        Alert.alert(
          'Success',
          'Account created successfully! Logging you in...',
          [
            {
              text: 'OK',
              onPress: async () => {
                // Auto-login after signup
                try {
                  const loginResponse = await fetch(`${BACKEND_URL}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password }),
                  });

                  const loginData = await loginResponse.json();

                  if (loginResponse.ok && loginData.token) {
                    setUser({
                      id: loginData.user.id,
                      email: loginData.user.email,
                      role: loginData.user.role,
                      token: loginData.token,
                    });
                  } else {
                    // If auto-login fails, redirect to login screen
                    Alert.alert('Success', 'Account created! Please login.', [
                      { text: 'OK', onPress: () => navigation.navigate('Login') }
                    ]);
                  }
                } catch (err) {
                  // If auto-login fails, redirect to login screen
                  Alert.alert('Success', 'Account created! Please login.', [
                    { text: 'OK', onPress: () => navigation.navigate('Login') }
                  ]);
                }
              }
            }
          ]
        );
      } else {
        Alert.alert('Registration Failed', data.error || `Server error (${response.status})`);
      }
    } catch (error) {
      Alert.alert(
        'Network Error',
        'Could not connect to server. Please check your connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Back to Login</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Create Account</Text>

        <View style={styles.roleSelector}>
          <Text style={styles.roleSelectorLabel}>I am a:</Text>
          <View style={styles.roleButtons}>
            <TouchableOpacity
              style={[
                styles.roleOptionButton,
                role === 'patient' && styles.roleOptionButtonActive,
              ]}
              onPress={() => setRole('patient')}
            >
              <Text
                style={[
                  styles.roleOptionText,
                  role === 'patient' && styles.roleOptionTextActive,
                ]}
              >
                Patient
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.roleOptionButton,
                role === 'caregiver' && styles.roleOptionButtonActive,
              ]}
              onPress={() => setRole('caregiver')}
            >
              <Text
                style={[
                  styles.roleOptionText,
                  role === 'caregiver' && styles.roleOptionTextActive,
                ]}
              >
                Caregiver
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#999"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#999"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TextInput
          style={styles.input}
          placeholder="Confirm Password"
          placeholderTextColor="#999"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.signupButton, loading && styles.signupButtonDisabled]}
          onPress={handleSignup}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.signupButtonText}>Create Account</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    paddingHorizontal: 30,
    paddingTop: 60,
    paddingBottom: 40,
  },
  backButton: {
    marginBottom: 20,
  },
  backButtonText: {
    fontSize: 16,
    color: '#4A90E2',
    fontWeight: '600',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 30,
  },
  roleSelector: {
    marginBottom: 25,
  },
  roleSelectorLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  roleOptionButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ddd',
  },
  roleOptionButtonActive: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  roleOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  roleOptionTextActive: {
    color: '#fff',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  signupButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  signupButtonDisabled: {
    opacity: 0.6,
  },
  signupButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
