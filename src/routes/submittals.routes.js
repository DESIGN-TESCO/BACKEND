const router = require('express').Router();
const c = require('../controllers/submittals.controller');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/', c.list);
router.post('/', c.create);
router.get('/:id', c.getOne);
router.put('/:id', c.update);
router.put('/:id/status', c.setStatus);
router.delete('/:id', c.remove);

module.exports = router;
