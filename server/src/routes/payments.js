const router = require('express').Router();
const { sendMoney, getHistory, getTransaction, requestMoney, qrPay } = require('../controllers/paymentController');
const { generateUserQR } = require('../controllers/merchantController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.post('/send',          sendMoney);
router.post('/request',       requestMoney);
router.post('/qr-pay',        qrPay);
router.post('/generate-qr',   generateUserQR);
router.get('/history',        getHistory);
router.get('/:id',            getTransaction);

module.exports = router;
