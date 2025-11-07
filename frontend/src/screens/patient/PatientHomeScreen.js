import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
} from 'react-native';

const BACKEND_URL = 'https://mediguardian-backend-latest.onrender.com';
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function PatientHomeScreen({ user, setUser, navigation }) {
  const [schedules, setSchedules] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadSchedules();
  }, []);

  const loadSchedules = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/schedules`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const allSchedules = await response.json();
      const mySchedules = allSchedules.filter(
        (s) => s.patientId === user.id && s.active
      );
      setSchedules(mySchedules);
    } catch (error) {
      console.error('Failed to load schedules:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSchedules();
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => setUser(null),
      },
    ]);
  };

  const getTodaySchedules = () => {
    const today = new Date().getDay();
    return schedules.filter((s) => {
      if (!s.daysOfWeek || s.daysOfWeek.length === 0) return true;
      return s.daysOfWeek.includes(today);
    });
  };

  const getNextMedication = () => {
    const todaySchedules = getTodaySchedules();
    if (todaySchedules.length === 0) return null;

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    for (const schedule of todaySchedules) {
      // Handle both 'time' (string) and 'times' (array) for backward compatibility
      const timeValue = schedule.time; // Backend uses singular 'time'
      if (timeValue && timeValue > currentTime) {
        return { medication: schedule.medicationName, time: timeValue };
      }
    }
    return null;
  };

  const nextMed = getNextMedication();
  const todaySchedules = getTodaySchedules();

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello!</Text>
          <Text style={styles.email}>{user.email}</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {nextMed ? (
        <View style={styles.nextMedicationCard}>
          <Text style={styles.nextMedicationLabel}>Next Medication</Text>
          <Text style={styles.nextMedicationName}>{nextMed.medication}</Text>
          <Text style={styles.nextMedicationTime}>at {nextMed.time}</Text>
          <View style={styles.nextMedicationIcon}>
            <Text style={styles.pillIcon}>💊</Text>
          </View>
        </View>
      ) : (
        <View style={styles.noMedicationCard}>
          <Text style={styles.noMedicationIcon}>✓</Text>
          <Text style={styles.noMedicationText}>No more medications today</Text>
        </View>
      )}

      <View style={styles.infoCard}>
        <Text style={styles.infoIcon}>📱</Text>
        <View style={styles.infoContent}>
          <Text style={styles.infoTitle}>Notification-Based System</Text>
          <Text style={styles.infoText}>
            You'll receive a notification when it's time to take your medication. Tap the
            notification to verify and confirm your dose.
          </Text>
        </View>
      </View>

      <View style={styles.quickVerifyContainer}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <TouchableOpacity
          style={styles.verifyButton}
          onPress={() => navigation.navigate('VerifyPill', { manual: true })}
        >
          <Text style={styles.verifyButtonIcon}>📷</Text>
          <Text style={styles.verifyButtonText}>Manual Verification</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.todayScheduleContainer}>
        <Text style={styles.sectionTitle}>Today's Schedule</Text>
        {todaySchedules.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              No medications scheduled for today
            </Text>
          </View>
        ) : (
          todaySchedules.map((schedule) => (
            <View key={schedule.id} style={styles.scheduleCard}>
              <View style={styles.scheduleIconContainer}>
                <Text style={styles.scheduleIcon}>💊</Text>
              </View>
              <View style={styles.scheduleInfo}>
                <Text style={styles.scheduleMedication}>{schedule.medicationName}</Text>
                <Text style={styles.scheduleTimes}>
                  {schedule.time || 'No time set'}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={styles.instructionsContainer}>
        <Text style={styles.sectionTitle}>How It Works</Text>
        
        <View style={styles.instructionStep}>
          <Text style={styles.stepNumber}>1</Text>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Receive Notification</Text>
            <Text style={styles.stepDescription}>
              Get a reminder when it's time to take your medication
            </Text>
          </View>
        </View>

        <View style={styles.instructionStep}>
          <Text style={styles.stepNumber}>2</Text>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Tap to Verify</Text>
            <Text style={styles.stepDescription}>
              Camera opens automatically to capture the pill
            </Text>
          </View>
        </View>

        <View style={styles.instructionStep}>
          <Text style={styles.stepNumber}>3</Text>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Confirm & Take</Text>
            <Text style={styles.stepDescription}>
              System verifies it's the correct medication
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  email: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  logoutButton: {
    backgroundColor: '#ff4444',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  logoutButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  nextMedicationCard: {
    backgroundColor: '#4A90E2',
    margin: 15,
    borderRadius: 16,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  nextMedicationLabel: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 8,
  },
  nextMedicationName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  nextMedicationTime: {
    fontSize: 18,
    color: '#fff',
    opacity: 0.9,
  },
  nextMedicationIcon: {
    marginTop: 15,
  },
  pillIcon: {
    fontSize: 48,
  },
  noMedicationCard: {
    backgroundColor: '#4CAF50',
    margin: 15,
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
  },
  noMedicationIcon: {
    fontSize: 64,
    marginBottom: 10,
  },
  noMedicationText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    margin: 15,
    marginTop: 0,
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  infoIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  quickVerifyContainer: {
    padding: 15,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  verifyButton: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    borderWidth: 2,
    borderColor: '#4A90E2',
  },
  verifyButtonIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  verifyButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  todayScheduleContainer: {
    padding: 15,
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 15,
    color: '#999',
  },
  scheduleCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  scheduleIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  scheduleIcon: {
    fontSize: 28,
  },
  scheduleInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  scheduleMedication: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  scheduleTimes: {
    fontSize: 14,
    color: '#666',
  },
  instructionsContainer: {
    padding: 15,
  },
  instructionStep: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  stepNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4A90E2',
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 36,
    marginRight: 12,
  },
  stepContent: {
    flex: 1,
    justifyContent: 'center',
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: '#666',
  },
});
