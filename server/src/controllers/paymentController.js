const { PrismaClient } = require('@prisma/client');
const { emitToUser } = require('../socket');
const prisma = new PrismaClient();

const CASHBACK_PERCENT = parseFloat(process.env.CASHBACK_PERCENT || '1.5');

// POST /api/payments/send
const sendMoney = async (req, res) => {
  const { upiId, amount, description, pin } = req.body;
  const senderId = req.user.id;

  if (!upiId || !amount || amount <= 0) {
    return res.status(400).json({ error: 'UPI ID and valid amount required' });
  }
  if (amount > 100000) return res.status(400).json({ error: 'Max transfer ₹1,00,000' });

  // Verify PIN
  const bcrypt = require('bcryptjs');
  const sender = await prisma.user.findUnique({ where: { id: senderId } });
  if (!pin) return res.status(400).json({ error: 'Transaction PIN required' });
  const pinOk = await bcrypt.compare(pin, sender.pin);
  if (!pinOk) return res.status(400).json({ error: 'Incorrect PIN' });

  if (sender.walletBalance < amount) {
    return res.status(400).json({ error: 'Insufficient balance' });
  }

  // Find receiver by upiId or phone
  const receiver = await prisma.user.findFirst({
    where: {
      OR: [
        { upiId: upiId },
        { phone: upiId },
      ],
    }
  });
  if (!receiver) return res.status(404).json({ error: 'User not found. Check the phone number or UPI ID.' });
  if (receiver.id === senderId) return res.status(400).json({ error: 'Cannot pay yourself' });

  // Atomic balance update + transaction
  const cashbackAmount = parseFloat(((amount * CASHBACK_PERCENT) / 100).toFixed(2));

  const [tx] = await prisma.$transaction([
    prisma.transaction.create({
      data: {
        senderId,
        receiverId: receiver.id,
        amount,
        description,
        status: 'success',
        type: 'transfer',
        cashbackAmount,
      },
      include: { sender: { select: { name: true, upiId: true } }, receiver: { select: { name: true, upiId: true } } },
    }),
    prisma.user.update({ where: { id: senderId },   data: { walletBalance: { decrement: amount } } }),
    prisma.user.update({ where: { id: receiver.id }, data: { walletBalance: { increment: amount } } }),
  ]);

  // Cashback for sender
  await prisma.$transaction([
    prisma.reward.create({ data: { userId: senderId, amount: cashbackAmount, type: 'cashback', txId: tx.id, description: `${CASHBACK_PERCENT}% cashback on ₹${amount}` } }),
    prisma.user.update({ where: { id: senderId }, data: { walletBalance: { increment: cashbackAmount } } }),
  ]);

  // Notifications
  await prisma.notification.createMany({
    data: [
      { userId: senderId,     title: 'Money Sent ✓',    body: `₹${amount} sent to ${receiver.name || receiver.upiId}`, type: 'payment' },
      { userId: receiver.id, title: 'Money Received 💰', body: `₹${amount} received from ${sender.name || sender.upiId}`, type: 'payment' },
    ],
  });

  // Real-time push
  emitToUser(req.io, senderId,     'payment:sent',     { tx, amount, receiver: { name: receiver.name, upiId: receiver.upiId } });
  emitToUser(req.io, receiver.id,  'payment:received', { tx, amount, sender:   { name: sender.name,   upiId: sender.upiId } });

  const updatedSender = await prisma.user.findUnique({ where: { id: senderId }, select: { walletBalance: true } });

  res.json({ success: true, transaction: tx, cashback: cashbackAmount, newBalance: updatedSender.walletBalance });
};

// GET /api/payments/history
const getHistory = async (req, res) => {
  const { page = 1, limit = 20, type, status, withUser } = req.query;
  const userId = req.user.id;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  let where = {
    OR: [{ senderId: userId }, { receiverId: userId }],
    ...(type && { type }),
    ...(status && { status }),
  };

  if (withUser) {
    const otherUser = await prisma.user.findFirst({
      where: { OR: [{ upiId: withUser }, { phone: withUser }] }
    });
    if (!otherUser) return res.status(404).json({ error: 'User not found' });
    
    where = {
      OR: [
        { senderId: userId, receiverId: otherUser.id },
        { senderId: otherUser.id, receiverId: userId },
      ],
      ...(type && { type }),
      ...(status && { status }),
    };
  }

  const [transactions, total] = await prisma.$transaction([
    prisma.transaction.findMany({
      where,
      include: {
        sender:   { select: { name: true, upiId: true, avatarUrl: true } },
        receiver: { select: { name: true, upiId: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit),
    }),
    prisma.transaction.count({ where }),
  ]);

  res.json({ transactions, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
};

// GET /api/payments/:id
const getTransaction = async (req, res) => {
  const tx = await prisma.transaction.findUnique({
    where: { id: req.params.id },
    include: {
      sender:   { select: { name: true, upiId: true, avatarUrl: true } },
      receiver: { select: { name: true, upiId: true, avatarUrl: true } },
    },
  });
  if (!tx) return res.status(404).json({ error: 'Transaction not found' });
  if (tx.senderId !== req.user.id && tx.receiverId !== req.user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }
  res.json(tx);
};

// POST /api/payments/request
const requestMoney = async (req, res) => {
  const { upiId, amount, description } = req.body;
  if (!upiId || !amount) return res.status(400).json({ error: 'UPI ID and amount required' });

  const target = await prisma.user.findUnique({ where: { upiId } });
  if (!target) return res.status(404).json({ error: 'UPI ID not found' });

  emitToUser(req.io, target.id, 'payment:request', {
    from: { name: req.user.name, upiId: req.user.upiId },
    amount,
    description,
  });

  await prisma.notification.create({
    data: { userId: target.id, title: 'Payment Request 📥', body: `${req.user.name} requested ₹${amount}`, type: 'payment' },
  });

  res.json({ success: true, message: 'Payment request sent' });
};

// POST /api/payments/qr-pay
const qrPay = async (req, res) => {
  // QR pay works same as send — amount and upiId come from decoded QR
  req.body.type = 'qr_pay';
  return sendMoney(req, res);
};

module.exports = { sendMoney, getHistory, getTransaction, requestMoney, qrPay };
