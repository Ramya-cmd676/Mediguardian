import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput,
  Image,
  Alert,
  AppRegistry,
  ScrollView
} from 'react-native';
import { Camera } from 'expo-camera';
import * as Speech from 'expo-speech';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

// Backend URL - Deployed on Render.com (works from anywhere!)
const BACKEND_URL = 'https://mediguardian-backend-latest.onrender.com';

// Notification handler behavior: when a notification is tapped, open the camera verification flow
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: false })
});

function App() {
  const [hasPermission, setHasPermission] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [pillName, setPillName] = useState('');
  const [screen, setScreen] = useState('welcome'); // welcome, auth, camera, preview, schedules
  const cameraRef = useRef(null);
  
  // Medication schedule states
  const [schedules, setSchedules] = useState([]);
  const [newSchedule, setNewSchedule] = useState({
    medicationName: '',
    time: '',
    daysOfWeek: [],
    enabled: true
  });

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  useEffect(() => {
    // Register for push notifications on mount - wrapped in try-catch to prevent Firebase crash
    registerForPushNotificationsAsync().then(token => {
      // save to state or send to backend after user logs in
      if (token) setPushToken(token);
    }).catch(err => {
      // Silently fail if Firebase not configured - app continues to work without notifications
      console.warn('Push notification registration failed (Firebase may not be configured):', err);
    });

    // Listener for when a notification is received while app is foregrounded
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data || {};
      // If notification contains type 'reminder', open camera view
      if (data.type === 'reminder') {
        // No-op here; when app is tapped, the notification response listener will fire
        // We can optionally navigate to camera verification screen — this app uses simple state, so we'll just ensure photo is null so user can capture
        setPhoto(null);
      }
    });

    return () => subscription.remove();
  }, []);

  const [pushToken, setPushToken] = useState(null);

  async function takePicture() {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });
      setPhoto(photo);
      setResult(null);
    }
  }

  // Load user's medication schedules
  async function loadSchedules() {
    if (!user || !user.id || !user.token) return;
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/schedules?userId=${user.id}`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSchedules(data);
      }
    } catch (error) {
      console.error('[ERROR] Failed to load schedules:', error);
    }
  }

  // Create new medication schedule
  async function createSchedule() {
    if (!user || !user.id || !user.token) {
      Alert.alert('Error', 'Please login to create schedules');
      return;
    }

    if (!newSchedule.medicationName.trim()) {
      Alert.alert('Error', 'Please enter medication name');
      return;
    }

    if (!newSchedule.time.match(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)) {
      Alert.alert('Error', 'Please enter time in HH:MM format (e.g., 08:00)');
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/schedules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          userId: user.id,
          medicationName: newSchedule.medicationName,
          time: newSchedule.time,
          daysOfWeek: newSchedule.daysOfWeek.length > 0 ? newSchedule.daysOfWeek : null,
          enabled: newSchedule.enabled
        })
      });

      if (response.ok) {
        Alert.alert('Success', 'Medication reminder created!');
        setNewSchedule({ medicationName: '', time: '', daysOfWeek: [], enabled: true });
        loadSchedules(); // Reload list
      } else {
        Alert.alert('Error', 'Failed to create schedule');
      }
    } catch (error) {
      console.error('[ERROR] Failed to create schedule:', error);
      Alert.alert('Error', 'Failed to create schedule');
    }
  }

  // Delete a schedule
  async function deleteSchedule(scheduleId) {
    if (!user || !user.token) return;

    try {
      const response = await fetch(`${BACKEND_URL}/api/schedules/${scheduleId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${user.token}` }
      });

      if (response.ok) {
        Alert.alert('Success', 'Reminder deleted');
        loadSchedules(); // Reload list
      }
    } catch (error) {
      console.error('[ERROR] Failed to delete schedule:', error);
    }
  }

  // Toggle schedule enabled/disabled
  async function toggleSchedule(scheduleId, currentEnabled) {
    if (!user || !user.token) return;

    try {
      const response = await fetch(`${BACKEND_URL}/api/schedules/${scheduleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({ enabled: !currentEnabled })
      });

      if (response.ok) {
        loadSchedules(); // Reload list
      }
    } catch (error) {
      console.error('[ERROR] Failed to toggle schedule:', error);
    }
  }

  // Toggle day selection for new schedule
  function toggleDay(day) {
    setNewSchedule(prev => {
      const days = prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter(d => d !== day)
        : [...prev.daysOfWeek, day].sort();
      return { ...prev, daysOfWeek: days };
    });
  }

  async function sendToBackend(endpoint) {
    // Extract token from user state
    const token = user?.token;
    
    // If we have a pushToken and logged-in user info, register it (patient flow)
    try {
      if (pushToken && user && user.id) {
        // send push token to backend
        fetch(`${BACKEND_URL}/api/push/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': user.token ? `Bearer ${user.token}` : '' },
          body: JSON.stringify({ userId: user.id, expoPushToken: pushToken, deviceInfo: { platform: Constants.platform } })
        }).catch(err => console.warn('push register failed', err));
      }
    } catch (e) { console.warn('push register flow error', e) }

    if (!photo) return;
    
    setLoading(true);
    setResult(null);
    const url = BACKEND_URL + endpoint;
    
    const formData = new FormData();
    // React Native FormData requires specific format for file uploads
    formData.append('image', {
      uri: photo.uri,
      type: 'image/jpeg',
      name: 'pill.jpg',
    });
    
    if (endpoint === '/register-pill') {
      if (!pillName.trim()) {
        Alert.alert('Error', 'Please enter a pill name');
        setLoading(false);
        return;
      }
      if (!user || !user.id) {
        Alert.alert('Error', 'Please login to register pills');
        setLoading(false);
        return;
      }
      formData.append('pill_name', pillName.trim());
      formData.append('user_id', user.id);
    }

    try {
      console.log('Sending request to:', url);
      console.log('Photo URI:', photo.uri);
      console.log('Using token:', token ? 'Yes (JWT present)' : 'No token!');
      
      const res = await fetch(url, { 
        method: 'POST', 
        headers: token ? { 
          'Authorization': `Bearer ${token}` 
        } : {},
        body: formData,
        // Don't set Content-Type manually - let fetch handle multipart boundary
      });
      
      console.log('Response status:', res.status);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Server error response:', errorText);
        throw new Error(`Server error: ${res.status}`);
      }
      
      const json = await res.json();
      
      if (endpoint === '/verify-pill') {
        if (json.match) {
          const message = `Match Found: ${json.name}`;
          const details = `Confidence: ${Math.round(json.score * 100)}%`;
          setResult({ 
            success: true, 
            message,
            details
          });
          Speech.speak(`Matched: ${json.name} with ${Math.round(json.score * 100)} percent confidence`);
        } else {
          setResult({ 
            success: false, 
            message: 'No match found',
            details: 'This pill is not registered. Please register it first.'
          });
          Speech.speak('No match found. Please register this pill first.');
        }
      } else {
        setResult({ 
          success: true, 
          message: `Registered: ${json.name}`,
          details: `Pill ID: ${json.id}`
        });
        Speech.speak(`Successfully registered ${json.name}`);
        setPillName(''); // Clear input after registration
      }
    } catch (err) {
      const errorMsg = `${err.message}. Make sure backend is running.`;
      setResult({ 
        error: true, 
        message: 'Network Error',
        details: errorMsg
      });
      Alert.alert('Error', errorMsg);
    } finally {
      setLoading(false);
    }
  }

  function retakePicture() {
    setPhoto(null);
    setResult(null);
    setPillName('');
  }

  // Minimal auth UI for patient: register/login so we can attach user.id and token for push registration
  const [authMode, setAuthMode] = useState(null); // 'login'|'register'
  const [user, setUser] = useState(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const authInProgress = useRef(false); // Use ref for immediate check

  async function authRegister() {
    if (authLoading || authInProgress.current) {
      console.log('[DEBOUNCE] Register already in progress, ignoring...');
      return; // Prevent multiple clicks
    }
    console.log('[AUTH] authRegister called with email:', authEmail);
    authInProgress.current = true;
    setAuthLoading(true);
    try {
      console.log('📤 Sending register request to:', `${BACKEND_URL}/auth/register`);
      const res = await fetch(`${BACKEND_URL}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: authEmail, password: authPassword, role: 'patient' }) });
      const json = await res.json();
      console.log('📥 Register response:', json);
      if (res.ok) {
        Alert.alert('Success!', 'Account created! Please login now.');
        setAuthMode('login'); // Switch to login mode
        setAuthPassword(''); // Clear password for security
      } else {
        Alert.alert('Error', json.error || 'Register failed');
      }
    } catch (err) { 
      console.log('[ERROR] Register error:', err.message);
      Alert.alert('Error', err.message);
    } finally {
      setAuthLoading(false);
      authInProgress.current = false;
    }
  }

  async function authLogin() {
    if (authLoading || authInProgress.current) {
      console.log('[DEBOUNCE] Login already in progress, ignoring...');
      return; // Prevent multiple clicks
    }
    console.log('[AUTH] authLogin called with email:', authEmail);
    authInProgress.current = true;
    setAuthLoading(true);
    try {
      console.log('📤 Sending login request to:', `${BACKEND_URL}/auth/login`);
      const res = await fetch(`${BACKEND_URL}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: authEmail, password: authPassword }) });
      const json = await res.json();
      console.log('📥 Login response:', json);
      if (res.ok && json.token) {
        const userData = { id: json.user.id, email: json.user.email, token: json.token };
        setUser(userData);
        setAuthMode(null); // Close auth modal after successful login
        setScreen('camera'); // Navigate to camera screen
        console.log('[SUCCESS] Login successful! User:', userData);
        Alert.alert('Welcome!', `Logged in as ${json.user.email}`);
        // register push token now that we have user
        if (pushToken) {
          await fetch(`${BACKEND_URL}/api/push/register`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${json.token}` }, body: JSON.stringify({ userId: json.user.id, expoPushToken: pushToken, deviceInfo: { platform: Constants.platform } }) });
        }
      } else {
        Alert.alert('Login failed', json.error || 'Invalid credentials');
      }
    } catch (err) {
      console.log('[ERROR] Login error:', err.message);
      Alert.alert('Network Error', 'Could not connect to server. Please check your connection.');
    } finally {
      setAuthLoading(false);
      authInProgress.current = false;
    }
  }

  async function registerForPushNotificationsAsync() {
    try {
      if (!Constants.isDevice) {
        // Push notifications require a physical device
        console.warn('Must use physical device for push notifications');
        return null;
      }
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        console.warn('Push notification permission not granted');
        return null;
      }
      // This may fail if Firebase is not configured - catch it gracefully
      const tokenResp = await Notifications.getExpoPushTokenAsync({
        projectId: '5e507070-2989-4934-8267-eb40a0f976c9' // Your Expo project ID
      });
      console.log('[SUCCESS] Push token obtained:', tokenResp.data);
      return tokenResp.data;
    } catch (err) {
      // Check if it's a Firebase error
      if (err.message && err.message.includes('FirebaseApp')) {
        console.warn('[WARNING] Firebase not configured. Notifications disabled. See FIREBASE-SETUP.md for instructions.');
      } else {
        console.warn('Push notification registration error:', err.message);
      }
      return null;
    }
  }


  if (hasPermission === null) {
    return <View style={styles.container}><Text style={styles.infoText}>Requesting camera permission...</Text></View>;
  }
  
  if (hasPermission === false) {
    return <View style={styles.container}><Text style={styles.errorText}>No access to camera</Text></View>;
  }

  // WELCOME SCREEN
  if (screen === 'welcome') {
    return (
      <View style={styles.welcomeContainer}>
        <View style={styles.welcomeContent}>
          <Text style={styles.logo}>MG</Text>
          <Text style={styles.appName}>MediGuardian</Text>
          <Text style={styles.tagline}>AI-Powered Pill Identification</Text>
          <Text style={styles.description}>
            Identify your medications instantly with AI technology
          </Text>
        </View>
        
        <View style={styles.welcomeButtons}>
          <TouchableOpacity 
            style={[styles.primaryButton]} 
            onPress={() => {
              setAuthMode('login');
              setScreen('auth');
            }}
          >
            <Text style={styles.primaryButtonText}>Login</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.secondaryButton]} 
            onPress={() => {
              setAuthMode('register');
              setScreen('auth');
            }}
          >
            <Text style={styles.secondaryButtonText}>Create Account</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // AUTHENTICATION SCREEN
  if (screen === 'auth') {
    return (
      <View style={styles.authContainer}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => setScreen('welcome')}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        <View style={styles.authContent}>
          <Text style={styles.authTitle}>
            {authMode === 'login' ? 'Welcome Back' : 'Create Account'}
          </Text>
          <Text style={styles.authSubtitle}>
            {authMode === 'login' ? 'Login to continue' : 'Sign up to get started'}
          </Text>
          
          <View style={styles.authForm}>
            <TextInput 
              style={styles.authInput} 
              placeholder="Email" 
              placeholderTextColor="#999"
              value={authEmail} 
              onChangeText={setAuthEmail} 
              editable={!authLoading}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            
            <TextInput 
              style={styles.authInput} 
              placeholder="Password" 
              placeholderTextColor="#999"
              secureTextEntry 
              value={authPassword} 
              onChangeText={setAuthPassword} 
              editable={!authLoading}
            />
            
            <TouchableOpacity 
              style={[styles.primaryButton, authLoading && styles.disabledButton]} 
              onPress={authMode==='login'?authLogin:authRegister}
              disabled={authLoading}
            >
              <Text style={styles.primaryButtonText}>
                {authLoading ? 'Please wait...' : (authMode==='login' ? 'Login' : 'Create Account')}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => {
                setAuthMode(authMode === 'login' ? 'register' : 'login');
                setAuthPassword('');
              }}
              disabled={authLoading}
            >
              <Text style={styles.switchAuthText}>
                {authMode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Login'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // MEDICATION SCHEDULES SCREEN
  if (screen === 'schedules') {
    const daysOfWeekLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    return (
      <View style={styles.schedulesContainer}>
        <View style={styles.schedulesHeader}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => setScreen('camera')}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Medication Reminders</Text>
          {user && (
            <Text style={styles.userBadge}>{user.email}</Text>
          )}
        </View>

        <ScrollView style={{ flex: 1 }}>
          {/* Create New Schedule Form */}
          <View style={styles.createScheduleBox}>
            <Text style={styles.sectionTitle}>Create New Reminder</Text>
            
            <TextInput
              style={styles.scheduleInput}
              placeholder="Medication Name (e.g., Aspirin 100mg)"
              placeholderTextColor="#999"
              value={newSchedule.medicationName}
              onChangeText={(text) => setNewSchedule({...newSchedule, medicationName: text})}
            />
            
            <TextInput
              style={styles.scheduleInput}
              placeholder="Time (HH:MM format, e.g., 08:00)"
              placeholderTextColor="#999"
              value={newSchedule.time}
              onChangeText={(text) => setNewSchedule({...newSchedule, time: text})}
              keyboardType="numbers-and-punctuation"
            />
            
            <Text style={styles.daysSelectorLabel}>Select Days (leave empty for every day):</Text>
            <View style={styles.daysSelector}>
              {daysOfWeekLabels.map((day, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dayButton,
                    newSchedule.daysOfWeek.includes(index) && styles.dayButtonSelected
                  ]}
                  onPress={() => toggleDay(index)}
                >
                  <Text style={[
                    styles.dayButtonText,
                    newSchedule.daysOfWeek.includes(index) && styles.dayButtonTextSelected
                  ]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <TouchableOpacity 
              style={styles.createScheduleButton}
              onPress={createSchedule}
            >
              <Text style={styles.createScheduleButtonText}>Create Reminder</Text>
            </TouchableOpacity>
          </View>

          {/* List of Existing Schedules */}
          <View style={styles.schedulesListBox}>
            <Text style={styles.sectionTitle}>Your Reminders ({schedules.length})</Text>
            
            {schedules.length === 0 ? (
              <Text style={styles.noSchedulesText}>No medication reminders set up yet</Text>
            ) : (
              schedules.map((schedule) => (
                <View key={schedule.id} style={styles.scheduleItem}>
                  <View style={styles.scheduleInfo}>
                    <Text style={styles.scheduleMedName}>{schedule.medicationName}</Text>
                    <Text style={styles.scheduleTime}>Time: {schedule.time}</Text>
                    {schedule.daysOfWeek && schedule.daysOfWeek.length > 0 && (
                      <Text style={styles.scheduleDays}>
                        Days: {schedule.daysOfWeek.map(d => daysOfWeekLabels[d]).join(', ')}
                      </Text>
                    )}
                    <Text style={[styles.scheduleStatus, schedule.enabled ? styles.statusEnabled : styles.statusDisabled]}>
                      {schedule.enabled ? 'Active' : 'Disabled'}
                    </Text>
                  </View>
                  
                  <View style={styles.scheduleActions}>
                    <TouchableOpacity 
                      style={[styles.toggleButton, schedule.enabled ? styles.disableButton : styles.enableButton]}
                      onPress={() => toggleSchedule(schedule.id, schedule.enabled)}
                    >
                      <Text style={styles.toggleButtonText}>
                        {schedule.enabled ? 'Disable' : 'Enable'}
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.deleteButton}
                      onPress={() => {
                        Alert.alert(
                          'Delete Reminder',
                          `Delete reminder for ${schedule.medicationName}?`,
                          [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Delete', onPress: () => deleteSchedule(schedule.id), style: 'destructive' }
                          ]
                        );
                      }}
                    >
                      <Text style={styles.deleteButtonText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </View>
    );
  }

  // PHOTO PREVIEW SCREEN
  if (photo) {
    return (
      <View style={styles.previewContainer}>
        <View style={styles.previewHeader}>
          <Text style={styles.title}>Review Pill Photo</Text>
          {user && (
            <Text style={styles.userBadge}>{user.email}</Text>
          )}
        </View>
        
        <Image source={{ uri: photo.uri }} style={styles.preview} />
        
        {!user && (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>Please login to save pills</Text>
          </View>
        )}
        
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Enter pill name (for registration)"
            placeholderTextColor="#999"
            value={pillName}
            onChangeText={setPillName}
          />
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            onPress={() => sendToBackend('/verify-pill')} 
            style={[styles.actionButton, styles.verifyButton]}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Checking...' : 'Verify Pill'}
            </Text>
          </TouchableOpacity>
          
          {user && (
            <TouchableOpacity 
              onPress={() => {
                if (!pillName.trim()) {
                  Alert.alert('Required', 'Please enter a pill name');
                  return;
                }
                sendToBackend('/register-pill');
              }}
              style={[styles.actionButton, styles.registerButton]}
              disabled={loading || !pillName.trim()}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Saving...' : 'Register Pill'}
              </Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            onPress={retakePicture} 
            style={[styles.actionButton, styles.retakeButton]}
            disabled={loading}
          >
            <Text style={styles.buttonText}>Retake Photo</Text>
          </TouchableOpacity>
        </View>

        {result && (
          <View style={[
            styles.resultBox, 
            result.error ? styles.errorBox : 
            result.success ? styles.successBox : styles.warningBox
          ]}>
            <Text style={styles.resultMessage}>{result.message}</Text>
            {result.details && (
              <Text style={styles.resultDetails}>{result.details}</Text>
            )}
          </View>
        )}
      </View>
    );
  }

  // CAMERA SCREEN (Main screen after login or guest mode)
  return (
    <View style={styles.container}>
      <Camera 
        style={styles.camera} 
        ref={cameraRef}
        type={Camera.Constants.Type.back}
      >
        <View style={styles.cameraOverlay}>
          <View style={styles.cameraHeader}>
            <Text style={styles.cameraTitle}>MediGuardian</Text>
            <Text style={styles.cameraSubtitle}>AI-Powered Pill Identification</Text>
            {user && (
              <View style={styles.userInfoBox}>
                <Text style={styles.userInfoText}>{user.email}</Text>
              </View>
            )}
          </View>
          
          <View style={styles.spacer} />
          
          <TouchableOpacity 
            style={styles.captureButton} 
            onPress={takePicture}
            disabled={loading}
          >
            <View style={styles.captureButtonInner}>
              <Text style={styles.captureIcon}>CAPTURE</Text>
            </View>
          </TouchableOpacity>
          
          {!user && (
            <View style={styles.guestWarning}>
              <Text style={styles.guestWarningText}>Login to save and verify pills</Text>
            </View>
          )}
        </View>
      </Camera>
      
      <View style={styles.bottomActions}>
        {!user ? (
          <>
            <TouchableOpacity 
              style={[styles.bottomButton, styles.loginButton]} 
              onPress={() => {
                setAuthMode('login');
                setScreen('auth');
              }}
            >
              <Text style={styles.bottomButtonText}>Login</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.bottomButton, styles.registerButton]} 
              onPress={() => {
                setAuthMode('register');
                setScreen('auth');
              }}
            >
              <Text style={styles.bottomButtonText}>Register</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={{ flexDirection: 'row', gap: 10, width: '90%' }}>
            <TouchableOpacity 
              style={[styles.bottomButton, { flex: 1, backgroundColor: '#4CAF50' }]} 
              onPress={() => {
                loadSchedules();
                setScreen('schedules');
              }}
            >
              <Text style={styles.bottomButtonText}>Reminders</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.bottomButton, styles.logoutButton, { flex: 1 }]} 
              onPress={() => {
                Alert.alert('Logout', 'Are you sure you want to logout?', [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'Logout', 
                    onPress: () => {
                      setUser(null);
                      setScreen('welcome');
                      Alert.alert('Logged Out', 'You have been logged out');
                    } 
                  }
                ]);
              }}
            >
              <Text style={styles.bottomButtonText}>Logout</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

// Register the component for React Native
AppRegistry.registerComponent('main', () => App);

export default App;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginTop: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginTop: 8,
  },
  spacer: {
    flex: 1,
  },
  captureButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 30,
    marginBottom: 20,
  },
  captureText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  previewContainer: {
    flex: 1,
    width: '100%',
    backgroundColor: '#000',
    paddingTop: 40,
    paddingHorizontal: 20,
  },
  preview: {
    width: '100%',
    height: 300,
    borderRadius: 10,
    marginVertical: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  textInput: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: '#000',
  },
  buttonContainer: {
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  verifyButton: {
    backgroundColor: '#34C759',
  },
  registerButton: {
    backgroundColor: '#007AFF',
  },
  retakeButton: {
    backgroundColor: '#666',
  },
  disabledButton: {
    backgroundColor: '#999',
    opacity: 0.6,
  },
  userInfoBox: {
    backgroundColor: '#34C759',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  userInfoText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  userEmailText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultBox: {
    padding: 16,
    borderRadius: 10,
    marginTop: 10,
  },
  successBox: {
    backgroundColor: '#34C759',
  },
  errorBox: {
    backgroundColor: '#FF3B30',
  },
  warningBox: {
    backgroundColor: '#FF9500',
  },
  resultMessage: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  resultDetails: {
    color: '#fff',
    fontSize: 14,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  infoText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  
  // Welcome Screen Styles
  welcomeContainer: {
    flex: 1,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  welcomeContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    letterSpacing: 2,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 18,
    color: '#E5F0FF',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#B8D9FF',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  welcomeButtons: {
    width: '100%',
    gap: 12,
    paddingBottom: 40,
  },
  primaryButton: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#007AFF',
    fontSize: 18,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  
  // Auth Screen Styles
  authContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  backButton: {
    padding: 16,
    paddingTop: 50,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  authContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  authTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  authSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
  },
  authForm: {
    gap: 16,
  },
  authInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  switchAuthText: {
    color: '#007AFF',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  
  // Preview Screen Styles
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  userBadge: {
    backgroundColor: '#34C759',
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '600',
  },
  warningText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  
  // Camera Screen Styles  
  cameraHeader: {
    alignItems: 'center',
    paddingTop: 20,
  },
  cameraTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  cameraSubtitle: {
    fontSize: 14,
    color: '#E5F0FF',
    marginTop: 4,
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  captureButtonInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#007AFF',
  },
  captureIcon: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  guestWarning: {
    backgroundColor: 'rgba(255,149,0,0.9)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  guestWarningText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  bottomActions: {
    backgroundColor: '#000',
    padding: 12,
    gap: 8,
  },
  bottomButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  loginButton: {
    backgroundColor: '#007AFF',
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
  },
  bottomButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Schedules Screen Styles
  schedulesContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  schedulesHeader: {
    padding: 20,
    backgroundColor: '#2a2a2a',
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  createScheduleBox: {
    backgroundColor: '#2a2a2a',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#444',
  },
  scheduleInput: {
    backgroundColor: '#3a3a3a',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    fontSize: 16,
  },
  daysSelectorLabel: {
    color: '#aaa',
    fontSize: 14,
    marginBottom: 8,
    marginTop: 5,
  },
  daysSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 15,
  },
  dayButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#3a3a3a',
    borderWidth: 1,
    borderColor: '#555',
  },
  dayButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  dayButtonText: {
    color: '#aaa',
    fontSize: 12,
    fontWeight: '600',
  },
  dayButtonTextSelected: {
    color: '#fff',
  },
  createScheduleButton: {
    backgroundColor: '#4CAF50',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  createScheduleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  schedulesListBox: {
    flex: 1,
    margin: 15,
    marginTop: 0,
  },
  noSchedulesText: {
    color: '#777',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  },
  scheduleItem: {
    backgroundColor: '#2a2a2a',
    padding: 15,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#444',
  },
  scheduleInfo: {
    marginBottom: 10,
  },
  scheduleMedName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  scheduleTime: {
    color: '#aaa',
    fontSize: 14,
    marginBottom: 3,
  },
  scheduleDays: {
    color: '#aaa',
    fontSize: 13,
    marginBottom: 3,
  },
  scheduleStatus: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 5,
  },
  statusEnabled: {
    color: '#4CAF50',
  },
  statusDisabled: {
    color: '#f44336',
  },
  scheduleActions: {
    flexDirection: 'row',
    gap: 10,
  },
  toggleButton: {
    flex: 1,
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  enableButton: {
    backgroundColor: '#4CAF50',
  },
  disableButton: {
    backgroundColor: '#FF9800',
  },
  toggleButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#f44336',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
