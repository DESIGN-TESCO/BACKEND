const router = require('express').Router();
const c = require('../controllers/files.controller');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/', c.listByEntity);
router.post('/', c.upload);
router.get('/:id', c.stream);
router.delete('/:id', c.remove);

module.exports = router;
