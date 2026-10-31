const router = require('express').Router();
const c = require('../controllers/auth.controller');
const { protect, restrictTo } = require('../middleware/auth');

router.post('/login', c.login);
router.get('/me', protect, c.me);
router.put('/me', protect, c.updateMe);
router.put('/password', protect, c.changePassword);

// Account management — Design Head only.
router.get('/users', protect, restrictTo('design_head'), c.listUsers);
router.post('/users', protect, restrictTo('design_head'), c.createUser);
router.put('/users/:id', protect, restrictTo('design_head'), c.updateUser);
router.put('/users/:id/password', protect, restrictTo('design_head'), c.resetUserPassword);
router.put('/users/:id/active', protect, restrictTo('design_head'), c.setUserActive);
router.delete('/users/:id', protect, restrictTo('design_head'), c.deleteUser);

module.exports = router;
