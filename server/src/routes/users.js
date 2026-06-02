const router = require('express').Router();
const { getProfile, updateProfile, searchUser, getBalance, lookupUser, verifyKyc } = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.get('/me',       getProfile);   // alias used by frontend
router.get('/profile',  getProfile);
router.put('/profile',  updateProfile);
router.get('/search',   searchUser);
router.get('/balance',  getBalance);
router.get('/lookup/:identifier', lookupUser);
router.post('/kyc',     verifyKyc);

module.exports = router;
