const router = require('express').Router();
const { getBalance, createOrder, verifyPayment, razorpayWebhook, withdrawWallet } = require('../controllers/walletController');
const { authenticate } = require('../middleware/auth');

// Webhook — raw body required for HMAC verification; must be before authenticate
router.post('/webhook', razorpayWebhook);

// All other routes require auth
router.use(authenticate);
router.get('/balance',          getBalance);
router.post('/create-order',    createOrder);
router.post('/verify-payment',  verifyPayment);
router.post('/withdraw',        withdrawWallet);

// Keep /add and /load aliases pointing to create-order for compatibility
router.post('/add',  createOrder);
router.post('/load', createOrder);

module.exports = router;
