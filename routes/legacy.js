const router = require('express').Router();
const { legacyAuth, legacyUpdate } = require('../controllers/hostController');
const { publicLimiter } = require('../middleware/security');

router.all('/auth', publicLimiter, legacyAuth);
router.all('/update', publicLimiter, legacyUpdate);
router.all('/auth.php', publicLimiter, legacyAuth);
router.all('/update.php', publicLimiter, legacyUpdate);

module.exports = router;
