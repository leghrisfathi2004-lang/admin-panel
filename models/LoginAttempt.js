const mongoose = require('mongoose');

const loginAttemptSchema = new mongoose.Schema(
  {
    ip: { type: String, required: true, index: true },
    username: String,
    success: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

loginAttemptSchema.index({ ip: 1, createdAt: -1 });
loginAttemptSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 7 });

module.exports = mongoose.model('LoginAttempt', loginAttemptSchema);
