const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    const token =
      (req.signedCookies && req.signedCookies.token) ||
      (req.cookies && req.cookies.token) ||
      (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')
        ? req.headers.authorization.split(' ')[1]
        : null);

    if (!token) {
      return res.status(401).json({ ok: false, message: 'Not authenticated' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ ok: false, message: 'Session no longer valid' });
    }
    if (
      decoded.v &&
      user.passwordChangedAt &&
      decoded.v < user.passwordChangedAt.getTime()
    ) {
      return res.status(401).json({ ok: false, message: 'Session invalidated' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ ok: false, message: 'Invalid or expired session' });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ ok: false, message: 'Forbidden' });
  }
  next();
};

module.exports = { protect, requireRole };
