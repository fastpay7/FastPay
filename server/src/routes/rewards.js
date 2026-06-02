const router = require('express').Router();
const { getSummary, getHistory, applyReferral } = require('../controllers/rewardController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.get('/', async (req, res) => {
  // frontend: api.get('/rewards') → expects { rewards: [...] }
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  const rewards = await prisma.reward.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  res.json({ rewards });
});
router.get('/summary',    getSummary);
router.get('/history',    getHistory);
router.post('/referral',  applyReferral);

module.exports = router;
