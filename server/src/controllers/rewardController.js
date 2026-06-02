const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /api/rewards/summary
const getSummary = async (req, res) => {
  const rewards = await prisma.reward.findMany({ where: { userId: req.user.id } });
  const total = rewards.reduce((s, r) => s + r.amount, 0);
  const cashback = rewards.filter(r => r.type === 'cashback').reduce((s, r) => s + r.amount, 0);
  const referral = rewards.filter(r => r.type === 'referral_bonus').reduce((s, r) => s + r.amount, 0);
  const welcome  = rewards.filter(r => r.type === 'welcome').reduce((s, r) => s + r.amount, 0);
  res.json({ total, cashback, referral, welcome, count: rewards.length });
};

// GET /api/rewards/history
const getHistory = async (req, res) => {
  const rewards = await prisma.reward.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json(rewards);
};

// POST /api/rewards/referral
const applyReferral = async (req, res) => {
  const { referralCode } = req.body;
  if (!referralCode) return res.status(400).json({ error: 'Referral code required' });

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (user.referredBy) return res.status(400).json({ error: 'Already applied a referral' });

  const referrer = await prisma.user.findUnique({ where: { referralCode } });
  if (!referrer) return res.status(404).json({ error: 'Invalid referral code' });
  if (referrer.id === req.user.id) return res.status(400).json({ error: 'Cannot use own referral code' });

  await prisma.$transaction([
    prisma.user.update({ where: { id: req.user.id }, data: { referredBy: referrer.id } }),
    prisma.reward.create({ data: { userId: referrer.id, amount: 25, type: 'referral_bonus', description: `${user.name} joined via your referral!` } }),
    prisma.user.update({ where: { id: referrer.id }, data: { walletBalance: { increment: 25 } } }),
  ]);
  res.json({ success: true, message: '₹25 referral bonus credited to referrer!' });
};

module.exports = { getSummary, getHistory, applyReferral };
