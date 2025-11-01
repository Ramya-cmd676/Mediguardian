import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput,
  Image,
  Alert,
  AppRegistry 
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
  const cameraRef = useRef(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  useEffect(() => {
    // Register for push notifications on mount
    registerForPushNotificationsAsync().then(token => {
      // save to state or send to backend after user logs in
      if (token) setPushToken(token);
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

  async function sendToBackend(endpoint) {
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
      formData.append('name', pillName.trim());
    }

    try {
      console.log('Sending request to:', url);
      console.log('Photo URI:', photo.uri);
      
      const res = await fetch(url, { 
        method: 'POST', 
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
          const message = `✓ Match Found: ${json.name}`;
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
          message: `✓ Registered: ${json.name}`,
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

  async function authRegister() {
    try {
      const res = await fetch(`${BACKEND_URL}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: authEmail, password: authPassword, role: 'patient' }) });
      const json = await res.json();
      if (res.ok) {
        Alert.alert('Registered', 'Please login');
        setAuthMode('login');
      } else {
        Alert.alert('Error', json.error || 'Register failed');
      }
    } catch (err) { Alert.alert('Error', err.message) }
  }

  async function authLogin() {
    try {
      const res = await fetch(`${BACKEND_URL}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: authEmail, password: authPassword }) });
      const json = await res.json();
      if (res.ok && json.token) {
        setUser({ id: json.user.id || json.user.id, email: json.user.email, token: json.token });
        // register push token now that we have user
        if (pushToken) {
          await fetch(`${BACKEND_URL}/api/push/register`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${json.token}` }, body: JSON.stringify({ userId: json.user.id, expoPushToken: pushToken, deviceInfo: { platform: Constants.platform } }) });
        }
      } else {
        Alert.alert('Login failed', json.error || 'Invalid credentials');
      }
    } catch (err) { Alert.alert('Error', err.message) }
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
        Alert.alert('Failed to get push token for push notification!');
        return null;
      }
      const tokenResp = await Notifications.getExpoPushTokenAsync();
      return tokenResp.data;
    } catch (err) {
      console.warn('registerForPushNotificationsAsync error', err);
      return null;
    }
  }


  if (hasPermission === null) {
    return <View style={styles.container}><Text style={styles.infoText}>Requesting camera permission...</Text></View>;
  }
  
  if (hasPermission === false) {
    return <View style={styles.container}><Text style={styles.errorText}>No access to camera</Text></View>;
  }
  // If authMode is set, show simple auth UI
  if (authMode) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{authMode === 'login' ? 'Patient Login' : 'Patient Register'}</Text>
        <TextInput style={[styles.textInput, { marginTop: 20 }]} placeholder="Email" value={authEmail} onChangeText={setAuthEmail} />
        <TextInput style={[styles.textInput, { marginTop: 8 }]} placeholder="Password" secureTextEntry value={authPassword} onChangeText={setAuthPassword} />
        <View style={{ marginTop: 12 }}>
          <TouchableOpacity style={[styles.actionButton, styles.registerButton]} onPress={authMode==='login'?authLogin:authRegister}>
            <Text style={styles.buttonText}>{authMode==='login' ? 'Login' : 'Register'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.retakeButton, { marginTop: 8 }]} onPress={() => setAuthMode(null)}>
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  if (photo) {
    return (
      <View style={styles.previewContainer}>
        <Text style={styles.title}>MediGuardian</Text>
        <Text style={styles.subtitle}>Review & Identify Pill</Text>
        
        <Image source={{ uri: photo.uri }} style={styles.preview} />
        
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
              {loading ? 'Checking...' : '🔍 Verify Pill'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => sendToBackend('/register-pill')}
            style={[styles.actionButton, styles.registerButton]}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Saving...' : '➕ Register Pill'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={retakePicture} 
            style={[styles.actionButton, styles.retakeButton]}
            disabled={loading}
          >
            <Text style={styles.buttonText}>🔄 Retake Photo</Text>
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

  return (
    <View style={styles.container}>
      <Camera 
        style={styles.camera} 
        ref={cameraRef}
        type={Camera.Constants.Type.back}
      >
        <View style={styles.cameraOverlay}>
          <Text style={styles.title}>MediGuardian</Text>
          <Text style={styles.subtitle}>AI-Powered Pill Identification</Text>
          
          <View style={styles.spacer} />
          
          <TouchableOpacity 
            style={styles.captureButton} 
            onPress={takePicture}
            disabled={loading}
          >
            <Text style={styles.captureText}>
              {loading ? 'Processing...' : '📷 Capture Pill'}
            </Text>
          </TouchableOpacity>
        </View>
      </Camera>
      <View style={{ padding: 12 }}>
        <TouchableOpacity style={[styles.actionButton, styles.registerButton]} onPress={() => setAuthMode('login')}>
          <Text style={styles.buttonText}>Patient Login</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.verifyButton, { marginTop: 8 }]} onPress={() => setAuthMode('register')}>
          <Text style={styles.buttonText}>Patient Register</Text>
        </TouchableOpacity>
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
});
