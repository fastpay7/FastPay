const router = require('express').Router();
const { getProfile, registerMerchant, getPayments, getSettlements, requestSettlement, generateQR } = require('../controllers/merchantController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.get('/profile',        getProfile);
router.post('/register',      registerMerchant);
router.get('/payments',       getPayments);
router.get('/settlements',    getSettlements);
router.post('/settle',        requestSettlement);
router.post('/qr/generate',   generateQR);

module.exports = router;
