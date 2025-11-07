const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://aymar5250_db_user:RamyaMongo%40123@cluster0.kwrwlhe.mongodb.net/mediguardian?retryWrites=true&w=majority&appName=Cluster0';

// User Schema
const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  name: String,
  email: { type: String, required: true, unique: true },
  role: { type: String, enum: ['patient', 'caregiver'], default: 'patient' },
  passwordHash: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Pill Schema
const pillSchema = new mongoose.Schema({
  pillId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  imagePath: String,
  embedding: [Number],
  featureCount: Number,
  registrationConfidence: Number,
  userId: String,
  createdAt: { type: Date, default: Date.now }
});

// Schedule Schema
const scheduleSchema = new mongoose.Schema({
  scheduleId: { type: String, required: true, unique: true },
  userId: String,
  patientId: String,
  pillId: String,
  medicationName: String,
  time: String,
  daysOfWeek: [Number],
  active: { type: Boolean, default: true },
  lastSentAt: Date,
  createdBy: String,
  createdAt: { type: Date, default: Date.now }
});

// Push Token Schema
const pushTokenSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  expoPushToken: { type: String, required: true },
  deviceInfo: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

pushTokenSchema.index({ userId: 1, expoPushToken: 1 }, { unique: true });

const User = mongoose.model('User', userSchema);
const Pill = mongoose.model('Pill', pillSchema);
const Schedule = mongoose.model('Schedule', scheduleSchema);
const PushToken = mongoose.model('PushToken', pushTokenSchema);

async function connectDB() {
  try {
    // Mongoose 6+ doesn't need these options, but adding for compatibility
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    });
    console.log('[MongoDB] ✅ Connected to Atlas database');
  } catch (err) {
    console.error('[MongoDB] ❌ Connection error:', err.message);
    console.error('[MongoDB] Full error:', err);
    process.exit(1);
  }
}

module.exports = {
  connectDB,
  User,
  Pill,
  Schedule,
  PushToken
};
