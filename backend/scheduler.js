const cron = require('node-cron');
const { sendMedicationReminder } = require('./notifications');
const { Schedule } = require('./database');

/**
 * Initialize medication reminder scheduler
 * Checks every minute for schedules that match the current time
 */
function initScheduler() {
  console.log('[SCHEDULER] Initializing medication reminder scheduler...');

  // Run every minute
  cron.schedule('* * * * *', async () => {
    const now = new Date();
    
    // Get current time in IST (UTC+5:30) since users are in India
    const istOffset = 5.5 * 60; // IST is UTC+5:30
    const istTime = new Date(now.getTime() + istOffset * 60 * 1000);
    const currentTime = `${String(istTime.getUTCHours()).padStart(2, '0')}:${String(istTime.getUTCMinutes()).padStart(2, '0')}`;
    
    console.log(`[SCHEDULER] Checking schedules at IST: ${currentTime} (UTC: ${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')})`);
    
    try {
      const schedules = await Schedule.find({ active: true });
      
      // Find schedules matching current time
      const matchingSchedules = schedules.filter(schedule => {
        // Check if schedule time matches current IST time
        if (schedule.time === currentTime) {
          // Check days of week if specified (using IST day)
          if (schedule.daysOfWeek && schedule.daysOfWeek.length > 0) {
            const currentDay = istTime.getUTCDay(); // Day in IST
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
          const result = await sendMedicationReminder({
            userId: schedule.userId,
            medicationName: schedule.medicationName,
            time: schedule.time,
            scheduleId: schedule.scheduleId
          });
          
          if (result.success) {
            console.log(`[SCHEDULER] Successfully sent reminder for schedule ${schedule.scheduleId}`);
          } else {
            console.error(`[SCHEDULER] Failed to send reminder for schedule ${schedule.scheduleId}:`, result.reason || result.error);
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
    active: true
  };

  console.log('[SCHEDULER] Sending test reminder:', testSchedule);
  return await sendMedicationReminder(testSchedule);
}

module.exports = {
  initScheduler,
  sendTestReminder
};
