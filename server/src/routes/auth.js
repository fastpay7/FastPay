const router = require('express').Router();
const { sendOtp, verifyOtp, register, verifyPin, changePin, resetPin } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.post('/send-otp',    sendOtp);
router.post('/verify-otp',  verifyOtp);
router.post('/register',    register);
router.post('/verify-pin',  authenticate, verifyPin);
router.post('/change-pin',  authenticate, changePin);
router.post('/reset-pin',   resetPin);

module.exports = router;
// Trigger restart
