const mongoose = require('mongoose');

const auditSchema = new mongoose.Schema(
  {
    actor: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      username: String,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    target: {
      type: { type: String },
      id: String,
      name: String,
    },
    ip: String,
    userAgent: String,
    success: { type: Boolean, default: true },
    meta: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

auditSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditSchema);
