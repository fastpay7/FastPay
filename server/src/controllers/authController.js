const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { setEx, get, del } = require('../services/redis');
const axios = require('axios');

const prisma = new PrismaClient();

// Generate a random 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Generate a unique UPI ID from phone
function generateUpiId(phone) {
  return `${phone.slice(-4)}@fastpay`;
}

// Generate referral code
function generateReferral(phone) {
  return `FP${phone.slice(-6).toUpperCase()}`;
}

// POST /api/auth/send-otp
const sendOtp = async (req, res, next) => {
  try {
    const { phone } = req.body;
    if (!phone || !/^\d{10}$/.test(phone)) {
      return res.status(400).json({ error: 'Valid 10-digit phone number required' });
    }

    const otp = generateOTP();
    const expirySeconds = (parseInt(process.env.OTP_EXPIRY_MINUTES) || 5) * 60;
    await setEx(`otp:${phone}`, expirySeconds, otp);

    // --- 2Factor SMS Integration ---
    const smsKey = process.env.TWOFACTOR_API_KEY;
    if (smsKey && process.env.NODE_ENV !== 'test') {
      let smsSent = false;
      let smsError = null;
      try {
        // 2Factor OTP API — SMS delivery
        const resp = await axios.get(
          `https://2factor.in/API/V1/${smsKey}/SMS/${phone}/${otp}`
        );
        if (resp.data.Status === 'Success') {
          smsSent = true;
          console.log(`\n📱 OTP SMS sent to ${phone} via 2Factor\n`);
        } else {
          smsError = resp.data.Details || 'Unable to send OTP to this number Add Valid Phone Number ';
          console.error('⚠️  2Factor error:', resp.data);
        }
      } catch (err) {
        smsError = err.response?.data?.Details || 'SMS delivery failed Add Valid Phone Number';
        console.error('⚠️  2Factor SMS error:', err.response?.data || err.message);
      }

      // If SMS failed, clean up stored OTP and return error
      if (!smsSent) {
        await del(`otp:${phone}`);
        return res.status(400).json({
          error: `${smsError}. Please check the number and try again.`,
        });
      }
    } else {
      // Dev fallback — print OTP to console
      console.log(`\n📱 [DEV] OTP for ${phone}: ${otp}\n`);
    }

    res.json({
      success: true,
      message: 'OTP sent successfully',
      // Only expose OTP in dev/test without a real SMS key configured
      ...(!smsKey && { devOtp: otp }),
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/verify-otp
const verifyOtp = async (req, res, next) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) return res.status(400).json({ error: 'Phone and OTP required' });

    const stored = await get(`otp:${phone}`);
    if (!stored || stored !== otp) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    await del(`otp:${phone}`);

    // Check if user exists
    const existing = await prisma.user.findUnique({ where: { phone } });

    if (existing) {
      const token = jwt.sign({ userId: existing.id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      });
      return res.json({ success: true, isNewUser: false, token, user: sanitizeUser(existing) });
    }

    // New user — return temp token for registration
    const tempToken = jwt.sign({ phone, isTemp: true }, process.env.JWT_SECRET, { expiresIn: '15m' });
    res.json({ success: true, isNewUser: true, tempToken });
  } catch (error) {
    next(error);
  }
};


// POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { name, pin, referralCode } = req.body;
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Temp token required' });

    let decoded;
    try {
      decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
      if (!decoded.isTemp) throw new Error('Not a temp token');
    } catch {
      return res.status(401).json({ error: 'Invalid registration token' });
    }

    if (!name || !pin || !/^\d{6}$/.test(pin)) {
      return res.status(400).json({ error: 'Name and 6-digit PIN required' });
    }

    const { phone } = decoded;
    const existing = await prisma.user.findUnique({ where: { phone } });
    if (existing) return res.status(409).json({ error: 'User already exists' });

    const hashedPin = await bcrypt.hash(pin, 10);
    const upiId = generateUpiId(phone);
    const myReferralCode = generateReferral(phone);

    // Check referral
    let referredBy = null;
    if (referralCode) {
      const referrer = await prisma.user.findUnique({ where: { referralCode } });
      if (referrer) referredBy = referrer.id;
    }

    const user = await prisma.user.create({
      data: {
        phone,
        name,
        upiId,
        pin: hashedPin,
        referralCode: myReferralCode,
        referredBy,
        walletBalance: 10000,
        rewards: {
          create: { amount: 50, type: 'welcome', description: '🎉 Welcome bonus!' },
        },
        bankAccounts: {
          create: {
            bankName: 'HDFC Bank',
            accountNumber: Math.floor(1000000000 + Math.random() * 9000000000).toString(),
            ifscCode: 'HDFC0001234',
            accountHolder: name,
            verificationStatus: 'verified',
            isLinked: true,
            isDefault: true,
            razorpayContactId: `mock_contact_${Date.now()}`,
            razorpayFundAccountId: `mock_fa_${Date.now()}`,
          }
        }
      },
    });

    // Referral bonus for referrer
    if (referredBy) {
      await prisma.reward.create({
        data: { userId: referredBy, amount: 25, type: 'referral_bonus', description: `Referral bonus — ${name} joined!` },
      });
      await prisma.user.update({ where: { id: referredBy }, data: { walletBalance: { increment: 25 } } });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    res.status(201).json({ success: true, token, user: sanitizeUser(user) });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/verify-pin — verify transaction PIN
const verifyPin = async (req, res, next) => {
  try {
    const { pin } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const valid = await bcrypt.compare(pin, user.pin);
    if (!valid) return res.status(400).json({ error: 'Incorrect PIN' });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/change-pin
const changePin = async (req, res, next) => {
  try {
    const { currentPin, newPin } = req.body;
    if (!newPin || !/^\d{6}$/.test(newPin)) return res.status(400).json({ error: '6-digit PIN required' });

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const valid = await bcrypt.compare(currentPin, user.pin);
    if (!valid) return res.status(400).json({ error: 'Current PIN incorrect' });

    const hashed = await bcrypt.hash(newPin, 10);
    await prisma.user.update({ where: { id: req.user.id }, data: { pin: hashed } });
    res.json({ success: true, message: 'PIN changed successfully' });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/reset-pin
const resetPin = async (req, res, next) => {
  try {
    const { phone, otp, newPin } = req.body;
    if (!phone || !otp || !newPin || !/^\d{6}$/.test(newPin)) {
      return res.status(400).json({ error: 'Phone, OTP, and 6-digit new PIN required' });
    }

    const stored = await get(`otp:${phone}`);
    if (!stored || stored !== otp) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    await del(`otp:${phone}`);

    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const hashed = await bcrypt.hash(newPin, 10);
    await prisma.user.update({ where: { id: user.id }, data: { pin: hashed } });
    
    res.json({ success: true, message: 'PIN reset successfully' });
  } catch (error) {
    next(error);
  }
};

function sanitizeUser(user) {
  const { pin, ...safe } = user;
  return safe;
}

module.exports = { sendOtp, verifyOtp, register, verifyPin, changePin, resetPin };
