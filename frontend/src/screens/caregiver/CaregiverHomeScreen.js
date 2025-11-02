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

export default function CaregiverHomeScreen({ user, setUser, navigation }) {
  const [patients, setPatients] = useState([]);
  const [stats, setStats] = useState({ totalPatients: 0, activeReminders: 0, todayDoses: 0 });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      // Load all users to find patients
      const usersRes = await fetch(`${BACKEND_URL}/auth/users`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const allUsers = await usersRes.json();
      const patientList = allUsers.filter((u) => u.role === 'patient');
      setPatients(patientList);

      // Load schedules
      const schedulesRes = await fetch(`${BACKEND_URL}/api/schedules`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const schedules = await schedulesRes.json();
      const activeSchedules = schedules.filter((s) => s.active);

      setStats({
        totalPatients: patientList.length,
        activeReminders: activeSchedules.length,
        todayDoses: activeSchedules.reduce((sum, s) => sum + (s.times?.length || 0), 0),
      });
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboard();
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

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome, Caregiver</Text>
          <Text style={styles.email}>{user.email}</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.totalPatients}</Text>
          <Text style={styles.statLabel}>Total Patients</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.activeReminders}</Text>
          <Text style={styles.statLabel}>Active Reminders</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.todayDoses}</Text>
          <Text style={styles.statLabel}>Today's Doses</Text>
        </View>
      </View>

      <View style={styles.quickActionsContainer}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('AddTablet')}
        >
          <Text style={styles.actionIcon}>💊</Text>
          <View style={styles.actionTextContainer}>
            <Text style={styles.actionTitle}>Add New Medication</Text>
            <Text style={styles.actionDescription}>Register a new pill for patients</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Reminders')}
        >
          <Text style={styles.actionIcon}>⏰</Text>
          <View style={styles.actionTextContainer}>
            <Text style={styles.actionTitle}>Manage Reminders</Text>
            <Text style={styles.actionDescription}>Set medication schedules for patients</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Notifications')}
        >
          <Text style={styles.actionIcon}>🔔</Text>
          <View style={styles.actionTextContainer}>
            <Text style={styles.actionTitle}>View Alerts</Text>
            <Text style={styles.actionDescription}>Check patient notifications and fallbacks</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.patientsContainer}>
        <Text style={styles.sectionTitle}>My Patients</Text>
        {patients.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No patients registered yet</Text>
          </View>
        ) : (
          patients.map((patient) => (
            <View key={patient.id} style={styles.patientCard}>
              <View style={styles.patientInfo}>
                <Text style={styles.patientIcon}>👤</Text>
                <View>
                  <Text style={styles.patientEmail}>{patient.email}</Text>
                  <Text style={styles.patientId}>ID: {patient.id}</Text>
                </View>
              </View>
            </View>
          ))
        )}
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
    fontSize: 20,
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
  statsContainer: {
    flexDirection: 'row',
    padding: 15,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
  },
  quickActionsContainer: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  actionButton: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  actionIcon: {
    fontSize: 36,
    marginRight: 15,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  actionDescription: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  patientsContainer: {
    padding: 15,
  },
  patientCard: {
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
  patientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  patientIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  patientEmail: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  patientId: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
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
});
