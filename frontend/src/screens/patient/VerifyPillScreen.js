import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Camera } from 'expo-camera';

const BACKEND_URL = 'https://mediguardian-backend-latest.onrender.com';

export default function VerifyPillScreen({ route, navigation, user }) {
  const [hasPermission, setHasPermission] = useState(null);
  const [cameraRef, setCameraRef] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const scheduleId = route.params?.scheduleId;
  const medicationName = route.params?.medicationName;
  const isManual = route.params?.manual;

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const takePicture = async () => {
    if (cameraRef) {
      const photoData = await cameraRef.takePictureAsync({
        quality: 0.7,
        base64: true,
      });
      setPhoto(photoData);
      if (!isManual && scheduleId) {
        verifyPill(photoData);
      }
    }
  };

  const verifyPill = async (photoData) => {
    setVerifying(true);
    try {
      const formData = new FormData();
      formData.append('image', {
        uri: photoData.uri,
        type: 'image/jpeg',
        name: 'verification.jpg',
      });

      const response = await fetch(`${BACKEND_URL}/verify-pill`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.match && data.name) {
        // Success - correct pill
        Alert.alert(
          '✓ Correct Medication!',
          `Verified: ${data.name}\n\nPlease take your medication now.`,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        // Wrong pill or not found
        setRetryCount(retryCount + 1);
        
        if (retryCount >= 2) {
          // After 3 attempts, send fallback to caregiver
          Alert.alert(
            '✗ Verification Failed',
            'Unable to verify after multiple attempts. Your caregiver has been notified.',
            [
              {
                text: 'OK',
                onPress: () => navigation.goBack(),
              },
            ]
          );
          // TODO: Send fallback notification to caregiver
        } else {
          Alert.alert(
            '✗ Wrong Medication',
            'This is not the correct medication. Please try again with the scheduled pill.',
            [
              {
                text: 'Retry',
                onPress: () => setPhoto(null),
              },
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: () => navigation.goBack(),
              },
            ]
          );
        }
      }
    } catch (error) {
      Alert.alert('Network Error', 'Could not connect to server. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const handleManualVerify = async () => {
    if (!photo) return;
    setVerifying(true);

    try {
      const formData = new FormData();
      formData.append('image', {
        uri: photo.uri,
        type: 'image/jpeg',
        name: 'verification.jpg',
      });

      const response = await fetch(`${BACKEND_URL}/verify-pill`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.match && data.name) {
        Alert.alert(
          'Verification Result',
          `Verified: ${data.name}`,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        Alert.alert('Not Found', 'This medication is not registered in the system.');
      }
    } catch (error) {
      Alert.alert('Network Error', 'Could not connect to server');
    } finally {
      setVerifying(false);
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>Camera permission is required</Text>
      </View>
    );
  }

  if (verifying) {
    return (
      <View style={styles.verifyingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.verifyingText}>Verifying medication...</Text>
      </View>
    );
  }

  if (photo && isManual) {
    return (
      <View style={styles.previewContainer}>
        <Image source={{ uri: photo.uri }} style={styles.previewImage} />
        
        <View style={styles.previewActions}>
          <TouchableOpacity
            style={styles.verifyButton}
            onPress={handleManualVerify}
          >
            <Text style={styles.verifyButtonText}>Verify Medication</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.retakeButton}
            onPress={() => setPhoto(null)}
          >
            <Text style={styles.retakeButtonText}>Retake Photo</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={styles.camera}
        ref={(ref) => setCameraRef(ref)}
        type={Camera.Constants.Type.back}
      >
        <View style={styles.cameraOverlay}>
          {medicationName && (
            <View style={styles.medicationBanner}>
              <Text style={styles.medicationBannerText}>
                Time to take: {medicationName}
              </Text>
            </View>
          )}

          <View style={styles.instructionContainer}>
            <Text style={styles.instructionText}>
              {isManual
                ? 'Position the medication in the frame'
                : 'Capture the scheduled medication'}
            </Text>
          </View>

          <View style={styles.controlsContainer}>
            <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>
          </View>
        </View>
      </Camera>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  permissionText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  verifyingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  verifyingText: {
    fontSize: 18,
    color: '#333',
    marginTop: 20,
    fontWeight: '500',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
  },
  medicationBanner: {
    backgroundColor: '#4A90E2',
    padding: 20,
    marginTop: 20,
    marginHorizontal: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  medicationBannerText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  instructionContainer: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 15,
    marginHorizontal: 20,
    borderRadius: 8,
  },
  instructionText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  controlsContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#4A90E2',
  },
  captureButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4A90E2',
  },
  previewContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  previewImage: {
    width: '100%',
    height: '70%',
    resizeMode: 'cover',
  },
  previewActions: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  verifyButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginBottom: 12,
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  retakeButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4A90E2',
  },
  retakeButtonText: {
    color: '#4A90E2',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
