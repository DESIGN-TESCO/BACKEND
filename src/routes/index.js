const router = require('express').Router();

router.use('/auth', require('./auth.routes'));
router.use('/requests', require('./requests.routes'));
router.use('/designers', require('./designers.routes'));
router.use('/boqs', require('./boq.routes'));
router.use('/submittals', require('./submittals.routes'));
router.use('/drawings', require('./drawings.routes'));
router.use('/documents', require('./documents.routes'));
router.use('/revisions', require('./revisions.routes'));
router.use('/activities', require('./activities.routes'));
router.use('/notifications', require('./notifications.routes'));
router.use('/files', require('./files.routes'));
router.use('/stats', require('./stats.routes'));

module.exports = router;
