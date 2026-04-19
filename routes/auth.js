const router = require('express').Router();
const { body } = require('express-validator');
const { login, logout, me, csrf } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { loginLimiter, loginSlowDown } = require('../middleware/security');
const { verifyToken } = require('../middleware/csrf');

router.get('/csrf', csrf);

router.post(
  '/login',
  loginLimiter,
  loginSlowDown,
  verifyToken,
  [
    body('username').isString().trim().isLength({ min: 3, max: 32 }),
    body('password').isString().isLength({ min: 8, max: 200 }),
  ],
  login
);

router.post('/logout', verifyToken, logout);
router.get('/me', protect, me);

module.exports = router;
