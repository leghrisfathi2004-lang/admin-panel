const list = (process.env.ADMIN_IP_ALLOWLIST || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const ipFilter = (req, res, next) => {
  if (list.length === 0) return next();
  const clientIp = (req.ip || '').replace(/^::ffff:/, '');
  const allowed = list.some((entry) => entry === clientIp || clientIp.startsWith(entry));
  if (!allowed) {
    return res.status(403).json({ ok: false, message: 'IP not allowed' });
  }
  next();
};

module.exports = ipFilter;
