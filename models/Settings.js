const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  siteName: { type: String, default: 'SecureAdmin' },
  allowRegistration: { type: Boolean, default: true },
  maxUsersLimit: { type: Number, default: 100 },
  maintenanceMode: { type: Boolean, default: false },
  sessionTimeout: { type: Number, default: 24 }  // hours
}, { timestamps: true });

const Settings = mongoose.model('Settings', settingsSchema);
module.exports = Settings;
