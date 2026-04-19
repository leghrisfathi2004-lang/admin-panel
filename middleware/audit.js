const AuditLog = require('../models/AuditLog');

async function audit({ req, action, target, success = true, meta }) {
  try {
    await AuditLog.create({
      actor: req.user
        ? { userId: req.user._id, username: req.user.username }
        : { username: (req.body && req.body.username) || null },
      action,
      target,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      success,
      meta,
    });
  } catch (e) {
    console.error('Audit log failed:', e.message);
  }
}

module.exports = { audit };
