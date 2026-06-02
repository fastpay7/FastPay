const { PrismaClient } = require('@prisma/client');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const axios = require('axios');

const prisma = new PrismaClient();

// Initialize Razorpay — uses live keys from .env
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// GET /api/wallet/balance
const getBalance = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { walletBalance: true },
    });
    res.json({ balance: user.walletBalance });
  } catch (error) { next(error); }
};

// POST /api/wallet/create-order
// Creates a Razorpay order; frontend uses order_id to open checkout
const createOrder = async (req, res, next) => {
  try {
    const { amount } = req.body; // amount in INR
    if (!amount || amount < 100 || amount > 50000) {
      return res.status(400).json({ error: 'Amount must be between ₹100 and ₹50,000' });
    }

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({ error: 'Razorpay not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env' });
    }

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // Razorpay expects paise (1 INR = 100 paise)
      currency: 'INR',
      receipt: `w_${req.user.id.substring(0, 8)}_${Date.now().toString().slice(-8)}`,
      notes: {
        userId: req.user.id,
        purpose: 'wallet_load',
      },
    });

    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error('Razorpay create order error:', error);
    next(error);
  }
};

// POST /api/wallet/verify-payment
// Called by frontend after Razorpay checkout succeeds; validates HMAC and credits wallet
const verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment details' });
    }

    // Verify HMAC signature to prevent tampering
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Payment verification failed — invalid signature' });
    }

    // Signature valid — credit the wallet
    const amountInRupees = Math.round(amount / 100); // convert paise back to INR

    const [tx, user] = await prisma.$transaction([
      prisma.transaction.create({
        data: {
          senderId: req.user.id,
          receiverId: req.user.id,
          amount: amountInRupees,
          status: 'success',
          type: 'wallet_load',
          description: `Wallet top-up via Razorpay (${razorpay_payment_id})`,
        },
      }),
      prisma.user.update({
        where: { id: req.user.id },
        data: { walletBalance: { increment: amountInRupees } },
        select: { walletBalance: true },
      }),
    ]);

    console.log(`✅ Wallet credited ₹${amountInRupees} for user ${req.user.id} | Payment: ${razorpay_payment_id}`);
    res.json({ success: true, newBalance: user.walletBalance, transaction: tx });
  } catch (error) {
    console.error('Razorpay verify payment error:', error);
    next(error);
  }
};

// POST /api/wallet/webhook  (Razorpay calls this server-to-server on payment events)
// Note: requires raw body — handled in index.js
const razorpayWebhook = async (req, res, next) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) return res.status(500).json({ error: 'Webhook secret not configured' });

    const signature = req.headers['x-razorpay-signature'];
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(req.body) // raw body
      .digest('hex');

    if (signature !== expectedSignature) {
      console.warn('⚠️  Invalid Razorpay webhook signature');
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    const event = JSON.parse(req.body.toString());
    console.log(`📡 Razorpay webhook: ${event.event}`);

    if (event.event === 'payment.captured') {
      const payment = event.payload.payment.entity;
      const userId = payment.notes?.userId;
      const amountInRupees = payment.amount / 100;

      if (userId) {
        // Idempotency: check if we already processed this payment
        const existing = await prisma.transaction.findFirst({
          where: { description: { contains: payment.id } },
        });

        if (!existing) {
          await prisma.$transaction([
            prisma.transaction.create({
              data: {
                senderId: userId,
                receiverId: userId,
                amount: amountInRupees,
                status: 'success',
                type: 'wallet_load',
                description: `Wallet top-up via Razorpay (${payment.id}) [webhook]`,
              },
            }),
            prisma.user.update({
              where: { id: userId },
              data: { walletBalance: { increment: amountInRupees } },
            }),
          ]);
          console.log(`✅ Webhook: Wallet credited ₹${amountInRupees} for user ${userId}`);
        }
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    next(error);
  }
};

// POST /api/wallet/withdraw — real payout to bank via Razorpay
const withdrawWallet = async (req, res, next) => {
  try {
    const { amount, bankAccountId } = req.body;
    if (!amount || amount < 100) return res.status(400).json({ error: 'Minimum withdrawal is ₹100' });
    if (!bankAccountId) return res.status(400).json({ error: 'Select a bank account' });

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (user.walletBalance < amount) return res.status(400).json({ error: 'Insufficient balance' });

    // Get the selected bank account
    const bankAccount = await prisma.bankAccount.findFirst({
      where: { id: bankAccountId, userId: req.user.id, isLinked: true },
    });
    if (!bankAccount) return res.status(404).json({ error: 'Bank account not found' });
    if (!bankAccount.razorpayFundAccountId) {
      return res.status(400).json({ error: 'Bank account not verified yet. Please complete verification first.' });
    }

    // Deduct from wallet first (optimistic debit)
    await prisma.user.update({
      where: { id: req.user.id },
      data: { walletBalance: { decrement: amount } },
    });

    try {
      // Mock Mode: Simulate Razorpay Payout success
      const mockPayoutId = `pout_mock_${Date.now()}`;
      
      // Record transaction
      const tx = await prisma.transaction.create({
        data: {
          senderId: req.user.id,
          receiverId: req.user.id,
          amount,
          status: 'success',
          type: 'wallet_withdraw',
          description: `Withdrawal to bank (${bankAccount.accountNumber.slice(-4)}) | Payout: ${mockPayoutId}`,
        },
      });

      const updated = await prisma.user.findUnique({ where: { id: req.user.id }, select: { walletBalance: true } });
      console.log(`✅ [MOCK] Payout ₹${amount} initiated for user ${req.user.id} | ${mockPayoutId}`);

      res.json({
        success: true,
        newBalance: updated.walletBalance,
        payoutId: mockPayoutId,
        status: 'processed',
        message: `₹${amount} withdrawal initiated. Usually credited within 30 minutes.`,
        transaction: tx,
      });
    } catch (payoutErr) {
      // Rollback wallet debit if payout fails
      await prisma.user.update({
        where: { id: req.user.id },
        data: { walletBalance: { increment: amount } },
      });
      console.error('Razorpay payout error:', payoutErr.error || payoutErr);
      return res.status(500).json({
        error: payoutErr.error?.description || 'Payout failed. Your balance has been restored.',
      });
    }
  } catch (error) { next(error); }
};

module.exports = { getBalance, createOrder, verifyPayment, razorpayWebhook, withdrawWallet };
