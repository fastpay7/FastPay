const router = require('express').Router();
const { getAccounts, linkAccount, setDefault, removeAccount, lookupIfsc } = require('../controllers/bankController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.get('/ifsc/:ifsc',    lookupIfsc);      // free IFSC lookup
router.get('/',              getAccounts);
router.get('/accounts',      getAccounts);
router.post('/',             linkAccount);
router.post('/link',         linkAccount);
router.post('/set-default',  setDefault);
router.delete('/:id',        removeAccount);

module.exports = router;
