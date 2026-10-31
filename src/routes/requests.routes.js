const router = require('express').Router();
const c = require('../controllers/requests.controller');
const { protect, restrictTo } = require('../middleware/auth');

router.use(protect);
router.get('/', c.list);
router.post('/', c.create);
router.get('/:id', c.getOne);
router.put('/:id', c.update);
router.delete('/:id', restrictTo('design_head'), c.remove);

router.post('/:id/assign', restrictTo('design_head'), c.assign);
router.put('/:id/designer', restrictTo('design_head'), c.directAssign);
router.put('/:id/status', c.setStatus);
router.post('/:id/comments', c.addComment);
router.put('/:id/requirement', c.saveRequirement);
router.post('/:id/attachments', c.addAttachment);

// Design Head approval workflow.
router.post('/:id/approve', restrictTo('design_head'), c.approve);
router.post('/:id/reject', restrictTo('design_head'), c.reject);
router.post('/:id/request-changes', restrictTo('design_head'), c.requestChanges);

module.exports = router;
