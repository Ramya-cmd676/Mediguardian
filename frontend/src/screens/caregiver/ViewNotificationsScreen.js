import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';

// ✅ Base URL of your backend server
const BACKEND_URL = 'https://mediguardian-backend-latest.onrender.com';

export default function ViewNotificationsScreen({ user }) {
  // ===== STATE VARIABLES =====
  const [notifications, setNotifications] = useState([]); // Stores all notification objects
  const [refreshing, setRefreshing] = useState(false);    // Used for pull-to-refresh UI

  // ===== LIFECYCLE =====
  // Load notifications when the component mounts
  useEffect(() => {
    loadNotifications();
  }, []);

  // ===== LOAD NOTIFICATIONS =====
  const loadNotifications = async () => {
    try {
      // In production, replace this with:
      // const res = await fetch(`${BACKEND_URL}/api/notifications`, { headers: { Authorization: `Bearer ${user.token}` } });
      // const data = await res.json();
      // setNotifications(data);

      // Placeholder demo data for now
      setNotifications([
        {
          id: '1',
          type: 'success', // notification type: success, fallback, or missed
          patientEmail: 'patient@example.com',
          message: 'Patient successfully verified medication at 08:30 AM',
          timestamp: new Date().toISOString(), // current time as example
        },
      ]);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  // ===== REFRESH HANDLER =====
  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  // ===== ICONS BASED ON TYPE =====
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success':
        return '✅'; // Verified successfully
      case 'fallback':
        return '⚠️'; // Caregiver needed
      case 'missed':
        return '❌'; // Missed dose
      default:
        return '📋'; // Generic info
    }
  };

  // ===== STYLE MAPPING BASED ON TYPE =====
  const getNotificationStyle = (type) => {
    switch (type) {
      case 'success':
        return styles.notificationSuccess;
      case 'fallback':
        return styles.notificationWarning;
      case 'missed':
        return styles.notificationError;
      default:
        return styles.notificationInfo;
    }
  };

  // ===== RENDER =====
  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* --- HEADER --- */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Patient Notifications</Text>
        <Text style={styles.headerSubtitle}>
          Monitor patient medication verification status
        </Text>
      </View>

      {/* --- EMPTY STATE (No Notifications Yet) --- */}
      {notifications.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>🔔</Text>
          <Text style={styles.emptyStateText}>No notifications yet</Text>
          <Text style={styles.emptyStateSubtext}>
            You'll receive alerts when patients verify or miss their medications
          </Text>
        </View>
      ) : (
        // --- NOTIFICATIONS LIST ---
        <View style={styles.notificationsContainer}>
          {notifications.map((notification) => (
            <TouchableOpacity
              key={notification.id}
              style={[
                styles.notificationCard,
                getNotificationStyle(notification.type), // border color depends on type
              ]}
            >
              {/* Notification icon (✅, ⚠️, ❌) */}
              <Text style={styles.notificationIcon}>
                {getNotificationIcon(notification.type)}
              </Text>

              {/* Notification content area */}
              <View style={styles.notificationContent}>
                <Text style={styles.notificationPatient}>{notification.patientEmail}</Text>
                <Text style={styles.notificationMessage}>{notification.message}</Text>
                <Text style={styles.notificationTime}>
                  {new Date(notification.timestamp).toLocaleString()}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* --- INFO SECTION (LEGEND) --- */}
      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>Notification Types</Text>

        {/* ✅ Success */}
        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>✅</Text>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Success</Text>
            <Text style={styles.infoDescription}>
              Patient verified medication successfully
            </Text>
          </View>
        </View>

        {/* ⚠️ Fallback */}
        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>⚠️</Text>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Fallback Alert</Text>
            <Text style={styles.infoDescription}>
              Patient failed verification - caregiver attention needed
            </Text>
          </View>
        </View>

        {/* ❌ Missed */}
        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>❌</Text>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Missed Dose</Text>
            <Text style={styles.infoDescription}>
              Patient did not respond to reminder
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

//
// ===== STYLES =====
//
const styles = StyleSheet.create({
  // --- Main screen container ---
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },

  // --- Header section ---
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },

  // --- Empty state (when no notifications exist) ---
  emptyState: {
    backgroundColor: '#fff',
    margin: 15,
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 15,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },

  // --- Notifications list ---
  notificationsContainer: {
    padding: 15,
  },
  notificationCard: {
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
    borderLeftWidth: 4, // colored border to show type
  },

  // --- Border colors based on notification type ---
  notificationSuccess: { borderLeftColor: '#4CAF50' },
  notificationWarning: { borderLeftColor: '#FF9800' },
  notificationError: { borderLeftColor: '#f44336' },
  notificationInfo: { borderLeftColor: '#4A90E2' },

  // --- Notification content ---
  notificationIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationPatient: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
  },

  // --- Info section (legend at bottom) ---
  infoContainer: {
    padding: 15,
    marginTop: 10,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  infoCard: {
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
  infoIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 13,
    color: '#666',
  },
});
