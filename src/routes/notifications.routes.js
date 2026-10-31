const router = require('express').Router();
const c = require('../controllers/notifications.controller');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/', c.list);
router.post('/', c.create);
router.put('/read-all', c.markAllRead);
router.put('/:id/read', c.setRead);
router.delete('/:id', c.remove);

module.exports = router;
