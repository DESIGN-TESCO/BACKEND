const router = require('express').Router();
const c = require('../controllers/stats.controller');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/head', c.head);
router.get('/team', c.team);

module.exports = router;
