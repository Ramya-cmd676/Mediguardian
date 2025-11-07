import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';

const BACKEND_URL = 'https://mediguardian-backend-latest.onrender.com';
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function ManageRemindersScreen({ user }) {
  const [schedules, setSchedules] = useState([]);
  const [patients, setPatients] = useState([]);
  const [pills, setPills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState(new Date());

  const [newSchedule, setNewSchedule] = useState({
    patientId: '',
    pillId: '',
    medicationName: '',
    time: '',
    daysOfWeek: [],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load patients
      const usersRes = await fetch(`${BACKEND_URL}/auth/users`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const allUsers = await usersRes.json();
      const patientList = allUsers.filter((u) => u.role === 'patient');
      setPatients(patientList);

      if (patientList.length > 0 && !newSchedule.patientId) {
        setNewSchedule((prev) => ({ ...prev, patientId: patientList[0].id }));
      }

      // Load registered pills
      const pillsRes = await fetch(`${BACKEND_URL}/pills`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const pillsData = await pillsRes.json();
      setPills(pillsData);

      // Load schedules
      const schedulesRes = await fetch(`${BACKEND_URL}/api/schedules`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const schedulesData = await schedulesRes.json();
      setSchedules(schedulesData);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const toggleDay = (dayIndex) => {
    setNewSchedule((prev) => {
      const days = prev.daysOfWeek.includes(dayIndex)
        ? prev.daysOfWeek.filter((d) => d !== dayIndex)
        : [...prev.daysOfWeek, dayIndex];
      return { ...prev, daysOfWeek: days.sort() };
    });
  };

  const onTimeChange = (event, selected) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    
    if (selected) {
      setSelectedTime(selected);
      const hours = String(selected.getHours()).padStart(2, '0');
      const minutes = String(selected.getMinutes()).padStart(2, '0');
      setNewSchedule((prev) => ({ ...prev, time: `${hours}:${minutes}` }));
    }
  };

  const openTimePicker = () => {
    setShowTimePicker(true);
  };

  const createSchedule = async () => {
    if (!newSchedule.medicationName.trim() && !newSchedule.pillId) {
      Alert.alert('Missing Information', 'Please enter medication name or select a registered pill');
      return;
    }

    if (!newSchedule.time.match(/^\d{2}:\d{2}$/)) {
      Alert.alert('Invalid Time', 'Please enter time in HH:MM format (e.g., 08:30)');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/schedules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          patientId: newSchedule.patientId,
          pillId: newSchedule.pillId || null,
          medicationName: newSchedule.medicationName,
          time: newSchedule.time,
          daysOfWeek: newSchedule.daysOfWeek.length > 0 ? newSchedule.daysOfWeek : null,
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Medication reminder created successfully!');
        setNewSchedule({
          patientId: patients[0]?.id || '',
          pillId: '',
          medicationName: '',
          time: '',
          daysOfWeek: [],
        });
        setShowAddForm(false);
        loadData();
      } else {
        const errorData = await response.json().catch(() => ({}));
        Alert.alert(
          'Failed to Create Schedule',
          errorData.error || `Server error (${response.status})`
        );
      }
    } catch (error) {
      Alert.alert('Network Error', 'Could not connect to server');
    } finally {
      setLoading(false);
    }
  };

  const toggleSchedule = async (scheduleId, currentStatus) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/schedules/${scheduleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ active: !currentStatus }),
      });

      if (response.ok) {
        loadData();
      } else {
        Alert.alert('Error', 'Failed to update schedule');
      }
    } catch (error) {
      Alert.alert('Network Error', 'Could not connect to server');
    }
  };

  const deleteSchedule = async (scheduleId) => {
    Alert.alert(
      'Delete Schedule',
      'Are you sure you want to delete this reminder?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${BACKEND_URL}/api/schedules/${scheduleId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${user.token}` },
              });

              if (response.ok) {
                Alert.alert('Success', 'Reminder deleted');
                loadData();
              } else {
                Alert.alert('Error', 'Failed to delete schedule');
              }
            } catch (error) {
              Alert.alert('Network Error', 'Could not connect to server');
            }
          },
        },
      ]
    );
  };

  const getPatientEmail = (patientId) => {
    const patient = patients.find((p) => p.id === patientId);
    return patient ? patient.email : patientId;
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddForm(!showAddForm)}
        >
          <Text style={styles.addButtonText}>
            {showAddForm ? '− Cancel' : '+ Add New Reminder'}
          </Text>
        </TouchableOpacity>
      </View>

      {showAddForm && (
        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>New Medication Reminder</Text>

          <Text style={styles.label}>Patient</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={newSchedule.patientId}
              onValueChange={(value) =>
                setNewSchedule((prev) => ({ ...prev, patientId: value }))
              }
              style={styles.picker}
            >
              {patients.map((patient) => (
                <Picker.Item
                  key={patient.id}
                  label={patient.email}
                  value={patient.id}
                />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>Link to Registered Pill (Optional)</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={newSchedule.pillId}
              onValueChange={(value) => {
                setNewSchedule((prev) => {
                  const selectedPill = pills.find(p => p.id === value);
                  return {
                    ...prev,
                    pillId: value,
                    medicationName: selectedPill ? selectedPill.name : prev.medicationName
                  };
                });
              }}
              style={styles.picker}
            >
              <Picker.Item label="-- No Pill Linked --" value="" />
              {pills.map((pill) => (
                <Picker.Item
                  key={pill.id}
                  label={pill.name}
                  value={pill.id}
                />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>Medication Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Aspirin"
            value={newSchedule.medicationName}
            onChangeText={(text) =>
              setNewSchedule((prev) => ({ ...prev, medicationName: text }))
            }
          />

          <Text style={styles.label}>Time</Text>
          <TouchableOpacity style={styles.timePickerButton} onPress={openTimePicker}>
            <Text style={styles.timePickerText}>
              {newSchedule.time || 'Select Time'}
            </Text>
            <Text style={styles.timePickerIcon}>🕐</Text>
          </TouchableOpacity>

          {showTimePicker && (
            <DateTimePicker
              value={selectedTime}
              mode="time"
              is24Hour={true}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onTimeChange}
            />
          )}

          <Text style={styles.label}>Days of Week (Optional)</Text>
          <View style={styles.daysContainer}>
            {DAYS.map((day, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dayButton,
                  newSchedule.daysOfWeek.includes(index) && styles.dayButtonActive,
                ]}
                onPress={() => toggleDay(index)}
              >
                <Text
                  style={[
                    styles.dayButtonText,
                    newSchedule.daysOfWeek.includes(index) && styles.dayButtonTextActive,
                  ]}
                >
                  {day}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.hint}>Leave empty for all days</Text>

          <TouchableOpacity
            style={[styles.createButton, loading && styles.createButtonDisabled]}
            onPress={createSchedule}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.createButtonText}>Create Reminder</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.schedulesContainer}>
        <Text style={styles.sectionTitle}>
          Active Reminders ({schedules.filter((s) => s.active).length})
        </Text>
        {schedules.filter((s) => s.active).length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No active reminders</Text>
          </View>
        ) : (
          schedules
            .filter((s) => s.active)
            .map((schedule) => (
              <View key={schedule.id} style={styles.scheduleCard}>
                <View style={styles.scheduleHeader}>
                  <Text style={styles.medicationName}>{schedule.medicationName}</Text>
                  <Text style={styles.scheduleStatus}>Active</Text>
                </View>
                <Text style={styles.patientEmail}>
                  Patient: {getPatientEmail(schedule.patientId)}
                </Text>
                <Text style={styles.scheduleTime}>
                  Time: {schedule.times?.join(', ') || schedule.time}
                </Text>
                {schedule.daysOfWeek && (
                  <Text style={styles.scheduleDays}>
                    Days: {schedule.daysOfWeek.map((d) => DAYS[d]).join(', ')}
                  </Text>
                )}
                <View style={styles.scheduleActions}>
                  <TouchableOpacity
                    style={styles.disableButton}
                    onPress={() => toggleSchedule(schedule.id, schedule.active)}
                  >
                    <Text style={styles.disableButtonText}>Disable</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => deleteSchedule(schedule.id)}
                  >
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
        )}
      </View>

      {schedules.filter((s) => !s.active).length > 0 && (
        <View style={styles.schedulesContainer}>
          <Text style={styles.sectionTitle}>
            Disabled Reminders ({schedules.filter((s) => !s.active).length})
          </Text>
          {schedules
            .filter((s) => !s.active)
            .map((schedule) => (
              <View key={schedule.id} style={[styles.scheduleCard, styles.disabledCard]}>
                <View style={styles.scheduleHeader}>
                  <Text style={styles.medicationName}>{schedule.medicationName}</Text>
                  <Text style={styles.scheduleStatusDisabled}>Disabled</Text>
                </View>
                <Text style={styles.patientEmail}>
                  Patient: {getPatientEmail(schedule.patientId)}
                </Text>
                <Text style={styles.scheduleTime}>
                  Time: {schedule.times?.join(', ') || schedule.time}
                </Text>
                <View style={styles.scheduleActions}>
                  <TouchableOpacity
                    style={styles.enableButton}
                    onPress={() => toggleSchedule(schedule.id, schedule.active)}
                  >
                    <Text style={styles.enableButtonText}>Enable</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => deleteSchedule(schedule.id)}
                  >
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  addButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  formContainer: {
    backgroundColor: '#fff',
    padding: 20,
    margin: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 10,
  },
  pickerContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  timePickerButton: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timePickerText: {
    fontSize: 16,
    color: '#333',
  },
  timePickerIcon: {
    fontSize: 20,
  },
  daysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  dayButton: {
    flex: 1,
    padding: 10,
    marginHorizontal: 2,
    borderRadius: 6,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  dayButtonActive: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  dayButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  dayButtonTextActive: {
    color: '#fff',
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  createButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  schedulesContainer: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
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
  disabledCard: {
    opacity: 0.6,
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  medicationName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  scheduleStatus: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  scheduleStatusDisabled: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  patientEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  scheduleTime: {
    fontSize: 15,
    color: '#333',
    marginBottom: 4,
  },
  scheduleDays: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  scheduleActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  disableButton: {
    flex: 1,
    backgroundColor: '#FF9800',
    borderRadius: 6,
    padding: 10,
    alignItems: 'center',
  },
  disableButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  enableButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    borderRadius: 6,
    padding: 10,
    alignItems: 'center',
  },
  enableButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#f44336',
    borderRadius: 6,
    padding: 10,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
