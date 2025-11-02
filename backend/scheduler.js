const cron = require('node-cron');
const { sendMedicationReminder, loadSchedules } = require('./notifications');

/**
 * Initialize medication reminder scheduler
 * Checks every minute for schedules that match the current time
 */
function initScheduler() {
  console.log('[SCHEDULER] Initializing medication reminder scheduler...');

  // Run every minute
  cron.schedule('* * * * *', async () => {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    try {
      const schedules = loadSchedules();
      
      // Find schedules matching current time
      const matchingSchedules = schedules.filter(schedule => {
        if (!schedule.enabled) return false;
        
        // Check if schedule time matches current time
        if (schedule.time === currentTime) {
          // Check days of week if specified
          if (schedule.daysOfWeek && schedule.daysOfWeek.length > 0) {
            const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
            return schedule.daysOfWeek.includes(currentDay);
          }
          return true;
        }
        return false;
      });

      if (matchingSchedules.length > 0) {
        console.log(`[SCHEDULER] Found ${matchingSchedules.length} schedule(s) at ${currentTime}`);
        
        // Send reminders for all matching schedules
        for (const schedule of matchingSchedules) {
          console.log(`[SCHEDULER] Sending reminder: ${schedule.medicationName} to user ${schedule.userId}`);
          const result = await sendMedicationReminder(schedule);
          
          if (result.success) {
            console.log(`[SCHEDULER] Successfully sent reminder for schedule ${schedule.id}`);
          } else {
            console.error(`[SCHEDULER] Failed to send reminder for schedule ${schedule.id}:`, result.reason || result.error);
          }
        }
      }
    } catch (err) {
      console.error('[SCHEDULER] Error checking schedules:', err);
    }
  });

  console.log('[SCHEDULER] Medication reminder scheduler started');
}

/**
 * Send test reminder (for debugging)
 */
async function sendTestReminder(userId, medicationName) {
  const testSchedule = {
    id: 'test-' + Date.now(),
    userId: userId,
    medicationName: medicationName || 'Test Medication',
    time: new Date().toTimeString().substring(0, 5),
    enabled: true
  };

  console.log('[SCHEDULER] Sending test reminder:', testSchedule);
  return await sendMedicationReminder(testSchedule);
}

module.exports = {
  initScheduler,
  sendTestReminder
};
