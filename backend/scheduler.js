const { VerificationLog } = require('./database');
const { v4: uuidv4 } = require('uuid');
const cron = require('node-cron');
const { sendMedicationReminder } = require('./notifications');
const { Schedule , User} = require('./database');
const MISSED_GRACE_MINUTES = 2;



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

    // ⏰ Missed-dose checker (every 5 minutes)
  cron.schedule('*/2 * * * *', async () => {
    try {
      console.log('[SCHEDULER] Checking missed doses...');
      await checkMissedDoses();
    } catch (err) {
      console.error('[MISSED DOSE ERROR]', err);
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
//not calling
async function checkMissedDoses() {
  const now = new Date();

  // IST time
  const istOffset = 5.5 * 60;
  const istTime = new Date(now.getTime() + istOffset * 60 * 1000);

  const currentMinutes =
    istTime.getUTCHours() * 60 + istTime.getUTCMinutes();

  const schedules = await Schedule.find({ active: true });

  for (const schedule of schedules) {
    if (!schedule.time) continue;

    const [hh, mm] = schedule.time.split(':').map(Number);
    const scheduleMinutes = hh * 60 + mm;

    // Has grace period passed?
    if (currentMinutes < scheduleMinutes + MISSED_GRACE_MINUTES) {
      continue;
    }

    // Already SUCCESS?
    const success = await VerificationLog.findOne({
      scheduleId: schedule.scheduleId,
      result: 'SUCCESS'
    });

    if (success) continue;

    // Already MISSED?
    const missed = await VerificationLog.findOne({
      scheduleId: schedule.scheduleId,
      result: 'MISSED'
    });

    if (missed) continue;
    console.log("[MISSED DOSE] Schedule ",schedule);
    const patient = await User.findOne({ userId: schedule.userId });
    console.log("Patient ",patient);
    // ✅ Log MISSED
    await VerificationLog.create({
      logId: uuidv4(),
      patientId: schedule.userId,
      caregiverId: patient?.userId,
      medicationName: schedule.medicationName,
      scheduleId: schedule.scheduleId,
      result: 'MISSED',
      createdAt: new Date(),
    });

    console.log(`[MISSED DOSE] Logged for ${schedule.medicationName}`);
  }
}



module.exports = {
  initScheduler,
  sendTestReminder,
  checkMissedDoses
};
