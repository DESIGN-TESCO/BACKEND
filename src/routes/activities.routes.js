const router = require('express').Router();
const c = require('../controllers/activities.controller');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/', c.list);
router.post('/', c.create);

module.exports = router;
