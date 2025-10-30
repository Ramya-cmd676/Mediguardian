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

// Backend URL - Using ngrok public URL (works from anywhere!)
const BACKEND_URL = 'https://subobscure-underage-stephan.ngrok-free.dev';

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

  if (hasPermission === null) {
    return <View style={styles.container}><Text style={styles.infoText}>Requesting camera permission...</Text></View>;
  }
  
  if (hasPermission === false) {
    return <View style={styles.container}><Text style={styles.errorText}>No access to camera</Text></View>;
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
