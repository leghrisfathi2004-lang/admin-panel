const mongoose = require('mongoose');

const hostSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    url: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
      validate: {
        validator: (v) => /^https?:\/\/.+/i.test(v),
        message: 'URL must start with http:// or https://',
      },
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 300,
      default: '',
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    priority: {
      type: Number,
      default: 100,
      min: 0,
      max: 9999,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

hostSchema.index({ url: 1 }, { unique: true });
hostSchema.index({ enabled: 1, priority: -1 });

module.exports = mongoose.model('Host', hostSchema);
