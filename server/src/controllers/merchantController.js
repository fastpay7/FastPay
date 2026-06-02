const { PrismaClient } = require('@prisma/client');
const QRCode = require('qrcode');
const prisma = new PrismaClient();

// GET /api/merchant/profile
const getProfile = async (req, res) => {
  const merchant = await prisma.merchant.findUnique({
    where: { userId: req.user.id },
    include: { user: { select: { name: true, upiId: true, phone: true, avatarUrl: true } } },
  });
  if (!merchant) return res.status(404).json({ error: 'Merchant profile not found' });
  res.json(merchant);
};

// POST /api/merchant/register
const registerMerchant = async (req, res) => {
  const { businessName, businessType } = req.body;
  if (!businessName) return res.status(400).json({ error: 'Business name required' });

  const existing = await prisma.merchant.findUnique({ where: { userId: req.user.id } });
  if (existing) return res.status(409).json({ error: 'Already registered as merchant' });

  const [merchant] = await prisma.$transaction([
    prisma.merchant.create({
      data: { userId: req.user.id, businessName, businessType: businessType || 'General', upiId: req.user.upiId },
    }),
    prisma.user.update({ where: { id: req.user.id }, data: { role: 'merchant' } }),
  ]);

  res.status(201).json({ success: true, merchant });
};

// GET /api/merchant/payments
const getPayments = async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [transactions, total] = await prisma.$transaction([
    prisma.transaction.findMany({
      where: { receiverId: req.user.id, type: 'qr_pay' },
      include: { sender: { select: { name: true, upiId: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit),
    }),
    prisma.transaction.count({ where: { receiverId: req.user.id, type: 'qr_pay' } }),
  ]);

  res.json({ transactions, total, page: parseInt(page) });
};

// GET /api/merchant/settlements
const getSettlements = async (req, res) => {
  const merchant = await prisma.merchant.findUnique({ where: { userId: req.user.id } });
  if (!merchant) return res.status(404).json({ error: 'Merchant not found' });

  const settlements = await prisma.settlement.findMany({
    where: { merchantId: merchant.id },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ settlements, pendingSettlement: merchant.pendingSettlement, totalEarnings: merchant.totalEarnings });
};

// POST /api/merchant/settle
const requestSettlement = async (req, res) => {
  const merchant = await prisma.merchant.findUnique({ where: { userId: req.user.id } });
  if (!merchant) return res.status(404).json({ error: 'Merchant not found' });
  if (merchant.pendingSettlement < 1) return res.status(400).json({ error: 'No balance to settle' });

  const [settlement] = await prisma.$transaction([
    prisma.settlement.create({ data: { merchantId: merchant.id, amount: merchant.pendingSettlement, status: 'processing' } }),
    prisma.merchant.update({ where: { id: merchant.id }, data: { pendingSettlement: 0 } }),
  ]);

  // Simulate settlement completion after 3s
  setTimeout(async () => {
    await prisma.settlement.update({ where: { id: settlement.id }, data: { status: 'completed', settledAt: new Date() } });
    console.log(`✅ Settlement ${settlement.id} completed`);
  }, 3000);

  res.json({ success: true, settlement });
};

// POST /api/merchant/qr/generate
const generateQR = async (req, res) => {
  const { amount, description } = req.body;
  const upiId = req.user.upiId;

  const qrData = JSON.stringify({ upiId, amount: amount || null, description: description || '' });
  const qrDataUrl = await QRCode.toDataURL(qrData, { width: 300, margin: 2, color: { dark: '#1A1D2E', light: '#FFFFFF' } });

  res.json({ success: true, qrDataUrl, upiId, amount, description });
};

// POST /api/payments/generate-qr (user QR)
const generateUserQR = async (req, res) => {
  const { amount } = req.body;
  const upiId = req.user.upiId;

  const qrData = JSON.stringify({ upiId, amount: amount || null, name: req.user.name });
  const qrDataUrl = await QRCode.toDataURL(qrData, { width: 280, margin: 2, color: { dark: '#6C63FF', light: '#FFFFFF' } });

  res.json({ success: true, qrDataUrl, upiId, amount });
};

module.exports = { getProfile, registerMerchant, getPayments, getSettlements, requestSettlement, generateQR, generateUserQR };
