const router = require('express').Router();
const { getNotifications, markAllRead, markRead } = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.get('/',             getNotifications);
router.put('/read-all',     markAllRead);
router.post('/read-all',    markAllRead);  // frontend uses POST
router.put('/:id/read',     markRead);

module.exports = router;
