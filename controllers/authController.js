const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const LoginAttempt = require('../models/LoginAttempt');
const { audit } = require('../middleware/audit');

const MAX_FAILED = 5;
const LOCK_MINUTES = 15;
const IP_BLOCK_THRESHOLD = 15;
const IP_BLOCK_WINDOW_MIN = 15;

const signToken = (user) =>
  jwt.sign(
    { id: user._id, role: user.role, v: user.passwordChangedAt ? user.passwordChangedAt.getTime() : 0 },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '2h' }
  );

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 2 * 60 * 60 * 1000,
  path: '/',
  signed: true,
});

exports.login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ ok: false, message: 'Invalid input', errors: errors.array() });
  }

  const since = new Date(Date.now() - IP_BLOCK_WINDOW_MIN * 60 * 1000);
  const recentFailures = await LoginAttempt.countDocuments({
    ip: req.ip,
    success: false,
    createdAt: { $gte: since },
  });
  if (recentFailures >= IP_BLOCK_THRESHOLD) {
    await audit({ req, action: 'login.blocked_ip', success: false });
    return res
      .status(429)
      .json({ ok: false, message: 'Too many failed attempts from your IP. Try later.' });
  }

  const { username, password } = req.body;

  const user = await User.findOne({ username: String(username).toLowerCase() }).select(
    '+password +failedLoginAttempts +lockUntil'
  );

  const genericFail = { ok: false, message: 'Invalid username or password' };

  const recordAttempt = (success) =>
    LoginAttempt.create({ ip: req.ip, username, success }).catch(() => {});

  if (!user) {
    await recordAttempt(false);
    await audit({ req, action: 'login.failed', success: false, meta: { reason: 'no_user' } });
    return res.status(401).json(genericFail);
  }

  if (user.isLocked()) {
    const minsLeft = Math.ceil((user.lockUntil - Date.now()) / 60000);
    await recordAttempt(false);
    await audit({ req, action: 'login.locked', success: false });
    return res
      .status(423)
      .json({ ok: false, message: `Account locked. Try again in ${minsLeft} min.` });
  }

  const match = await user.comparePassword(password);
  if (!match) {
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
    if (user.failedLoginAttempts >= MAX_FAILED) {
      user.lockUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
      user.failedLoginAttempts = 0;
    }
    await user.save();
    await recordAttempt(false);
    await audit({ req, action: 'login.failed', success: false, meta: { reason: 'bad_password' } });
    return res.status(401).json(genericFail);
  }

  user.failedLoginAttempts = 0;
  user.lockUntil = undefined;
  user.lastLoginAt = new Date();
  user.lastLoginIp = req.ip;
  await user.save();
  await recordAttempt(true);

  const token = signToken(user);
  res.cookie('token', token, cookieOptions());
  await audit({ req: { ...req, user }, action: 'login.success' });

  res.json({
    ok: true,
    user: { id: user._id, username: user.username, role: user.role },
  });
};

exports.logout = async (req, res) => {
  res.clearCookie('token', { path: '/' });
  if (req.user) await audit({ req, action: 'logout' });
  res.json({ ok: true });
};

exports.me = (req, res) => {
  res.json({
    ok: true,
    user: {
      id: req.user._id,
      username: req.user.username,
      role: req.user.role,
      lastLoginAt: req.user.lastLoginAt,
    },
    csrfToken: res.locals.csrfToken,
  });
};

exports.csrf = (req, res) => {
  res.json({ ok: true, csrfToken: res.locals.csrfToken });
};
