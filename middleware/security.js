const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xssClean = require('xss-clean');
const hpp = require('hpp');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const crypto = require('crypto');

const isProd = process.env.NODE_ENV === 'production';

const cspNonce = (req, res, next) => {
  res.locals.cspNonce = crypto.randomBytes(16).toString('base64');
  next();
};

const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        'https://cdn.tailwindcss.com',
        (req, res) => `'nonce-${res.locals.cspNonce}'`,
      ],
      scriptSrcAttr: ["'none'"],
      styleSrc: ["'self'", 'https://fonts.googleapis.com', "'unsafe-inline'"],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
      baseUri: ["'self'"],
      upgradeInsecureRequests: isProd ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'same-origin' },
  referrerPolicy: { policy: 'no-referrer' },
  hsts: isProd
    ? { maxAge: 63072000, includeSubDomains: true, preload: true }
    : false,
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
  message: { ok: false, message: 'Too many login attempts. Try again later.' },
});

const loginSlowDown = slowDown({
  windowMs: 5 * 60 * 1000,
  delayAfter: 3,
  delayMs: (hits) => (hits - 3) * 500,
  maxDelayMs: 8000,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, message: 'Too many requests, slow down.' },
});

const publicLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, message: 'Too many requests' },
});

module.exports = {
  cspNonce,
  helmetMiddleware,
  mongoSanitize: mongoSanitize(),
  xss: xssClean(),
  hpp: hpp(),
  loginLimiter,
  loginSlowDown,
  apiLimiter,
  publicLimiter,
};
