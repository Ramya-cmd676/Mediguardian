import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Camera } from 'expo-camera';
import { Picker } from '@react-native-picker/picker';

const BACKEND_URL = 'https://mediguardian-backend-latest.onrender.com';

export default function AddTabletScreen({ user }) {
  const [hasPermission, setHasPermission] = useState(null);
  const [cameraRef, setCameraRef] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [pillName, setPillName] = useState('');
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
    loadPatients();
  }, []);

  const loadPatients = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/auth/users`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const allUsers = await response.json();
      const patientList = allUsers.filter((u) => u.role === 'patient');
      setPatients(patientList);
      if (patientList.length > 0) {
        setSelectedPatientId(patientList[0].id);
      }
    } catch (error) {
      console.error('Failed to load patients:', error);
    }
  };

  const takePicture = async () => {
    if (cameraRef) {
      const photoData = await cameraRef.takePictureAsync({
        quality: 0.7,
        base64: true,
      });
      setPhoto(photoData);
    }
  };

  const registerTablet = async () => {
    if (!pillName.trim()) {
      Alert.alert('Missing Information', 'Please enter the medication name');
      return;
    }

    if (!selectedPatientId) {
      Alert.alert('Missing Information', 'Please select a patient');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('image', {
        uri: photo.uri,
        type: 'image/jpeg',
        name: 'pill.jpg',
      });
      formData.append('pill_name', pillName);
      formData.append('user_id', selectedPatientId);

      const response = await fetch(`${BACKEND_URL}/register-pill`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert(
          'Success',
          `Medication "${pillName}" registered for patient successfully!`,
          [
            {
              text: 'OK',
              onPress: () => {
                setPhoto(null);
                setPillName('');
              },
            },
          ]
        );
      } else {
        Alert.alert('Registration Failed', data.error || 'Failed to register medication');
      }
    } catch (error) {
      Alert.alert('Network Error', 'Could not connect to server');
    } finally {
      setLoading(false);
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

  if (photo) {
    return (
      <ScrollView style={styles.previewContainer}>
        <Image source={{ uri: photo.uri }} style={styles.previewImage} />

        <View style={styles.formContainer}>
          <Text style={styles.label}>Medication Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter medication name"
            value={pillName}
            onChangeText={setPillName}
          />

          <Text style={styles.label}>Assign to Patient</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedPatientId}
              onValueChange={(value) => setSelectedPatientId(value)}
              style={styles.picker}
            >
              {patients.map((patient) => (
                <Picker.Item
                  key={patient.id}
                  label={`${patient.email} (ID: ${patient.id})`}
                  value={patient.id}
                />
              ))}
            </Picker>
          </View>

          <TouchableOpacity
            style={[styles.registerButton, loading && styles.registerButtonDisabled]}
            onPress={registerTablet}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.registerButtonText}>Register Medication</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.retakeButton}
            onPress={() => setPhoto(null)}
          >
            <Text style={styles.retakeButtonText}>Retake Photo</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
          <View style={styles.instructionContainer}>
            <Text style={styles.instructionText}>Position the medication in the frame</Text>
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
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
  },
  instructionContainer: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 15,
    marginTop: 20,
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
    height: 300,
    resizeMode: 'cover',
  },
  formContainer: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 15,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  registerButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  registerButtonDisabled: {
    opacity: 0.6,
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  retakeButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  retakeButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
});
