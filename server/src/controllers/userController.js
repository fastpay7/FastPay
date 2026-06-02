const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /api/users/profile
const getProfile = async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true, phone: true, name: true, upiId: true,
      avatarUrl: true, kycStatus: true, role: true,
      referralCode: true, walletBalance: true, createdAt: true,
      bankAccounts: { where: { isLinked: true } },
      merchantProfile: true,
    },
  });
  res.json(user);
};

// PUT /api/users/profile
const updateProfile = async (req, res) => {
  const { name, avatarUrl } = req.body;
  const updated = await prisma.user.update({
    where: { id: req.user.id },
    data: { ...(name && { name }), ...(avatarUrl && { avatarUrl }) },
    select: { id: true, name: true, avatarUrl: true, upiId: true },
  });
  res.json(updated);
};

// GET /api/users/search?q=
const searchUser = async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 3) return res.status(400).json({ error: 'At least 3 characters required' });

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { upiId: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q } },
        { name: { contains: q, mode: 'insensitive' } },
      ],
      NOT: { id: req.user.id },
    },
    select: { id: true, name: true, upiId: true, avatarUrl: true },
    take: 10,
  });
  res.json(users);
};

// GET /api/users/lookup/:identifier
// Finds exact user by phone or upiId, returns bank info if available
const lookupUser = async (req, res) => {
  const { identifier } = req.params;
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { phone: identifier },
        { upiId: identifier },
      ],
      NOT: { id: req.user.id }, // don't look up self
    },
    include: {
      bankAccounts: {
        where: { isLinked: true, isDefault: true, verificationStatus: 'verified' },
      }
    }
  });

  if (!user) {
    return res.status(404).json({ error: 'User not found. Check the phone number.' });
  }

  const primaryBank = user.bankAccounts[0];
  
  res.json({
    id: user.id,
    name: user.name,
    phone: user.phone,
    upiId: user.upiId,
    avatarUrl: user.avatarUrl,
    bankInfo: primaryBank ? {
      bankName: primaryBank.bankName,
      accountHolder: primaryBank.accountHolder,
      last4: primaryBank.accountNumber.slice(-4),
    } : null
  });
};

// GET /api/users/balance
const getBalance = async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { walletBalance: true },
  });
  res.json({ balance: user.walletBalance });
};

// POST /api/users/kyc
const verifyKyc = async (req, res) => {
  const { aadhaar } = req.body;
  if (!aadhaar || aadhaar.length !== 12) {
    return res.status(400).json({ error: 'Valid 12-digit Aadhaar number required' });
  }

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (user.kycStatus === 'verified') {
    return res.status(400).json({ error: 'KYC already verified' });
  }

  // Simulate DigiLocker approval and add ₹50 reward
  await prisma.$transaction([
    prisma.user.update({
      where: { id: req.user.id },
      data: {
        kycStatus: 'verified',
        walletBalance: { increment: 50 },
      }
    }),
    prisma.reward.create({
      data: {
        userId: req.user.id,
        amount: 50,
        type: 'cashback',
        description: 'DigiLocker KYC Bonus 🛡️',
      }
    })
  ]);

  res.json({ success: true, message: 'KYC verified successfully via DigiLocker' });
};

module.exports = { getProfile, updateProfile, searchUser, getBalance, lookupUser, verifyKyc };
