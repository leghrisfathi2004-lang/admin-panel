const crypto = require('crypto');

const COOKIE = 'csrf_token';
const HEADER = 'x-csrf-token';

const issueToken = (req, res, next) => {
  let token = req.cookies && req.cookies[COOKIE];
  if (!token) {
    token = crypto.randomBytes(32).toString('hex');
    res.cookie(COOKIE, token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 4 * 60 * 60 * 1000,
    });
  }
  res.locals.csrfToken = token;
  next();
};

const verifyToken = (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const cookieToken = req.cookies && req.cookies[COOKIE];
  const headerToken = req.get(HEADER);
  if (!cookieToken || !headerToken) {
    return res.status(403).json({ ok: false, message: 'CSRF token missing' });
  }
  try {
    const a = Buffer.from(cookieToken, 'hex');
    const b = Buffer.from(headerToken, 'hex');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return res.status(403).json({ ok: false, message: 'CSRF token mismatch' });
    }
  } catch (_) {
    return res.status(403).json({ ok: false, message: 'CSRF token invalid' });
  }
  next();
};

module.exports = { issueToken, verifyToken, COOKIE, HEADER };
