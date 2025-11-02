import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';

const BACKEND_URL = 'https://mediguardian-backend-latest.onrender.com';

export default function ViewNotificationsScreen({ user }) {
  const [notifications, setNotifications] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      // This would be a real endpoint in production
      // For now, showing placeholder data
      setNotifications([
        {
          id: '1',
          type: 'success',
          patientEmail: 'patient@example.com',
          message: 'Patient successfully verified medication at 08:30 AM',
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success':
        return '✅';
      case 'fallback':
        return '⚠️';
      case 'missed':
        return '❌';
      default:
        return '📋';
    }
  };

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

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Patient Notifications</Text>
        <Text style={styles.headerSubtitle}>
          Monitor patient medication verification status
        </Text>
      </View>

      {notifications.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>🔔</Text>
          <Text style={styles.emptyStateText}>No notifications yet</Text>
          <Text style={styles.emptyStateSubtext}>
            You'll receive alerts when patients verify or miss their medications
          </Text>
        </View>
      ) : (
        <View style={styles.notificationsContainer}>
          {notifications.map((notification) => (
            <TouchableOpacity
              key={notification.id}
              style={[styles.notificationCard, getNotificationStyle(notification.type)]}
            >
              <Text style={styles.notificationIcon}>
                {getNotificationIcon(notification.type)}
              </Text>
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

      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>Notification Types</Text>
        
        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>✅</Text>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Success</Text>
            <Text style={styles.infoDescription}>
              Patient verified medication successfully
            </Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>⚠️</Text>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Fallback Alert</Text>
            <Text style={styles.infoDescription}>
              Patient failed verification - caregiver attention needed
            </Text>
          </View>
        </View>

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
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
    borderLeftWidth: 4,
  },
  notificationSuccess: {
    borderLeftColor: '#4CAF50',
  },
  notificationWarning: {
    borderLeftColor: '#FF9800',
  },
  notificationError: {
    borderLeftColor: '#f44336',
  },
  notificationInfo: {
    borderLeftColor: '#4A90E2',
  },
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
