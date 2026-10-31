const router = require('express').Router();
const c = require('../controllers/designers.controller');
const { protect, restrictTo } = require('../middleware/auth');

router.use(protect);
router.get('/', c.list);
router.post('/', restrictTo('design_head'), c.create);
router.get('/:id/requests', c.requestsForDesigner);
router.get('/:id', c.getOne);
router.put('/:id', restrictTo('design_head'), c.update);
router.delete('/:id', restrictTo('design_head'), c.remove);

module.exports = router;
