const router = require('express').Router();
const crypto = require('crypto');
const { body, param } = require('express-validator');
const { list, create, update, remove, publicList, legacyAuth, legacyUpdate } = require('../controllers/hostController');
const { protect } = require('../middleware/auth');
const { verifyToken } = require('../middleware/csrf');
const { publicLimiter } = require('../middleware/security');

const verifyHmac = (req, res, next) => {
  const secret = process.env.PUBLIC_API_HMAC_SECRET;
  if (!secret) return next();
  const sig = req.get('x-signature');
  const ts = req.get('x-timestamp');
  if (!sig || !ts) return res.status(401).json({ ok: false, message: 'Signature required' });
  const age = Math.abs(Date.now() - Number(ts));
  if (Number.isNaN(age) || age > 5 * 60 * 1000) {
    return res.status(401).json({ ok: false, message: 'Stale request' });
  }
  const expected = crypto.createHmac('sha256', secret).update(`${req.method}:${req.originalUrl}:${ts}`).digest('hex');
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'))) {
      return res.status(401).json({ ok: false, message: 'Bad signature' });
    }
  } catch (_) {
    return res.status(401).json({ ok: false, message: 'Bad signature' });
  }
  next();
};

router.get('/public', publicLimiter, verifyHmac, publicList);

router.use(protect, verifyToken);

const hostBodyRules = [
  body('name').isString().trim().isLength({ min: 1, max: 80 }),
  body('url').isString().trim().matches(/^https?:\/\/.+/i).isLength({ max: 500 }),
  body('notes').optional().isString().isLength({ max: 300 }),
  body('priority').optional().isInt({ min: 0, max: 9999 }),
  body('enabled').optional().isBoolean(),
];

router.get('/', list);
router.post('/', hostBodyRules, create);
router.put('/:id', [param('id').isMongoId(), ...hostBodyRules], update);
router.delete('/:id', [param('id').isMongoId()], remove);

module.exports = router;
