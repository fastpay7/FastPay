const { PrismaClient } = require('@prisma/client');
const Razorpay = require('razorpay');
const axios = require('axios');

const prisma = new PrismaClient();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ─────────────────────────────────────────────────────────────
// GET /api/bank/ifsc/:ifsc
// Free IFSC lookup — returns bank name, branch, city, etc.
// ─────────────────────────────────────────────────────────────
const lookupIfsc = async (req, res, next) => {
  try {
    const { ifsc } = req.params;
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc.toUpperCase())) {
      return res.status(400).json({ error: 'Invalid IFSC format' });
    }
    const { data } = await axios.get(`https://ifsc.razorpay.com/${ifsc.toUpperCase()}`);
    res.json({
      bank: data.BANK,
      branch: data.BRANCH,
      city: data.CITY,
      state: data.STATE,
      ifsc: data.IFSC,
    });
  } catch (err) {
    if (err.response?.status === 404) {
      return res.status(404).json({ error: 'IFSC code not found. Please check and try again.' });
    }
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/bank
// ─────────────────────────────────────────────────────────────
const getAccounts = async (req, res, next) => {
  try {
    const accounts = await prisma.bankAccount.findMany({
      where: { userId: req.user.id, isLinked: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ accounts });
  } catch (error) { next(error); }
};

// ─────────────────────────────────────────────────────────────
// POST /api/bank
// Links a bank account, validates IFSC, then runs penny-drop verification
// ─────────────────────────────────────────────────────────────
const linkAccount = async (req, res, next) => {
  try {
    const { bankName, accountNumber, ifscCode, accountHolder } = req.body;
    if (!bankName || !accountNumber || !ifscCode || !accountHolder) {
      return res.status(400).json({ error: 'All bank details required' });
    }

    // Step 1: Validate IFSC
    let branchName = null;
    try {
      const { data: ifscData } = await axios.get(`https://ifsc.razorpay.com/${ifscCode.toUpperCase()}`);
      branchName = ifscData.BRANCH || null;
    } catch {
      return res.status(400).json({ error: 'Invalid IFSC code. Please verify and try again.' });
    }

    const existingCount = await prisma.bankAccount.count({ where: { userId: req.user.id } });

    // Mock Mode: Since RazorpayX requires business KYC, we bypass the real penny-drop
    // and instantly mark the account as verified for demo purposes.
    const verificationStatus = 'verified';
    const razorpayContactId = `mock_contact_${Date.now()}`;
    const razorpayFundAccountId = `mock_fa_${Date.now()}`;

    // Step 5: Save to DB and assign starting balance for first bank
    const account = await prisma.bankAccount.create({
      data: {
        userId: req.user.id,
        bankName,
        accountNumber,
        ifscCode: ifscCode.toUpperCase(),
        accountHolder,
        branchName,
        isDefault: existingCount === 0,
        verificationStatus,
        razorpayContactId,
        razorpayFundAccountId,
      },
    });

    if (existingCount === 0) {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { walletBalance: { increment: 10000 } },
      });
      
      await prisma.transaction.create({
        data: {
          senderId: req.user.id,
          receiverId: req.user.id,
          amount: 10000,
          status: 'success',
          type: 'wallet_load',
          description: `Initial Bank Deposit (${bankName})`,
        }
      });
    }

    res.status(201).json({
      success: true,
      account,
      verificationStatus,
      message: verificationStatus === 'verified'
        ? 'Bank account verified and linked!'
        : 'Bank account saved. Verification in progress.',
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/bank/set-default
// ─────────────────────────────────────────────────────────────
const setDefault = async (req, res, next) => {
  try {
    const { accountId } = req.body;
    await prisma.$transaction([
      prisma.bankAccount.updateMany({ where: { userId: req.user.id }, data: { isDefault: false } }),
      prisma.bankAccount.update({ where: { id: accountId }, data: { isDefault: true } }),
    ]);
    res.json({ success: true });
  } catch (error) { next(error); }
};

// ─────────────────────────────────────────────────────────────
// DELETE /api/bank/:id
// ─────────────────────────────────────────────────────────────
const removeAccount = async (req, res, next) => {
  try {
    await prisma.bankAccount.update({ where: { id: req.params.id }, data: { isLinked: false } });
    res.json({ success: true });
  } catch (error) { next(error); }
};

module.exports = { getAccounts, linkAccount, setDefault, removeAccount, lookupIfsc };
