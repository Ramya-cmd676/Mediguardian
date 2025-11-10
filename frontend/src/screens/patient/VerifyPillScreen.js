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

  const notifyCaregiver = async (eventType, medication) => {
    try {
      const message = eventType === 'verification_failed'
        ? `⚠️ Patient ${user.name || user.email} failed to verify ${medication} after 3 attempts`
        : `✅ Patient ${user.name || user.email} successfully took ${medication}`;

      // WORKAROUND: Send to all caregivers (until patient-caregiver linking is implemented)
      // In production, this should send ONLY to the patient's assigned caregiver
      const response = await fetch(`${BACKEND_URL}/api/push/send-to-role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          role: 'caregiver', // Send to all caregivers
          title: eventType === 'verification_failed' ? 'Medication Alert ⚠️' : 'Medication Taken ✅',
          body: message,
          data: {
            type: eventType,
            patientId: user.id,
            patientName: user.name || user.email,
            medicationName: medication,
            scheduleId: scheduleId,
          },
        }),
      });

      if (response.ok) {
        console.log(`[NOTIFY] Caregivers notified: ${eventType}`);
      } else {
        console.warn(`[NOTIFY] Failed to notify caregivers:`, await response.text());
      }
    } catch (error) {
      console.warn('Failed to notify caregiver:', error);
    }
  };

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

    // Include scheduleId to check correct scheduled pill
    if (scheduleId) {
      formData.append('scheduleId', scheduleId);
    }

    const response = await fetch(`${BACKEND_URL}/verify-pill`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${user.token}`,
      },
      body: formData,
    });

    const data = await response.json();

    if (response.ok && data.match && data.name) {
      // ✅ Correct pill
      await notifyCaregiver('verification_success', data.name);

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
      // ❌ Wrong pill or no match
      const newRetryCount = retryCount + 1;
      setRetryCount(newRetryCount);

      if (newRetryCount >= 3) {
        // 🚨 After 3 wrong attempts, notify all caregivers
        try {
          console.log('[VERIFICATION] 3 failed attempts — notifying caregivers...');
          const notifyRes = await fetch(`${BACKEND_URL}/api/push/send-to-role`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${user.token}`,
            },
            body: JSON.stringify({
              role: 'caregiver',
              title: 'Medication Alert ⚠️',
              body: `⚠️ Patient ${user.name || user.email} failed to verify ${medicationName || 'Unknown medication'} after 3 attempts`,
              data: {
                type: 'verification_failed',
                patientId: user.id,
                patientName: user.name || user.email,
                medicationName: medicationName,
                scheduleId,
              },
            }),
          });

          if (notifyRes.ok) {
            console.log('[VERIFICATION] ✅ Caregivers notified after 3 failed attempts');
          } else {
            console.warn('[VERIFICATION] ❌ Failed to notify caregivers:', await notifyRes.text());
          }
        } catch (err) {
          console.warn('[VERIFICATION] Error notifying caregivers:', err);
        }

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
      } else {
        // Allow retry
        const errorMessage =
          data.error === 'scheduled_pill_not_found'
            ? data.message
            : `This is not the correct medication (${medicationName || 'unknown'}). Please try again with the scheduled pill.`;

        Alert.alert('✗ Wrong Medication', errorMessage, [
          {
            text: 'Retry',
            onPress: () => setPhoto(null),
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => navigation.goBack(),
          },
        ]);
      }
    }
  } catch (error) {
    console.error('[VERIFY] Error:', error);
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
  const detectedName = data.name?.trim().toLowerCase();
  const expectedName = medicationName?.trim().toLowerCase();

  if (expectedName && detectedName === expectedName) {
    Alert.alert(
      '✅ Correct Pill',
      `Verified: ${data.name}\nYou can take your medication now.`,
      [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  } else {
    Alert.alert(
      '⚠️ Wrong Pill',
      `Expected: ${medicationName}\nDetected: ${data.name}\nPlease ensure you are verifying the correct medication.`,
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
} else {
  Alert.alert('Not Found', 'This medication could not be verified. Try again.');
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
