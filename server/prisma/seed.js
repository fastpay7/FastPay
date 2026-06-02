const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding FastPay database...');

  // Create demo users
  const hashedPin = await bcrypt.hash('123456', 10);

  const user1 = await prisma.user.upsert({
    where: { phone: '9999900001' },
    update: {},
    create: {
      phone: '9999900001',
      name: 'Arjun Sharma',
      upiId: 'arjun@fastpay',
      pin: hashedPin,
      kycStatus: 'verified',
      role: 'user',
      referralCode: 'ARJUN001',
      walletBalance: 5000,
      bankAccounts: {
        create: {
          bankName: 'State Bank of India',
          accountNumber: 'XXXX1234',
          ifscCode: 'SBIN0001234',
          accountHolder: 'Arjun Sharma',
          isDefault: true,
        },
      },
    },
  });

  const user2 = await prisma.user.upsert({
    where: { phone: '9999900002' },
    update: {},
    create: {
      phone: '9999900002',
      name: 'Priya Patel',
      upiId: 'priya@fastpay',
      pin: hashedPin,
      kycStatus: 'verified',
      role: 'user',
      referralCode: 'PRIYA002',
      walletBalance: 3500,
      bankAccounts: {
        create: {
          bankName: 'HDFC Bank',
          accountNumber: 'XXXX5678',
          ifscCode: 'HDFC0005678',
          accountHolder: 'Priya Patel',
          isDefault: true,
        },
      },
    },
  });

  // Demo merchant
  const merchantUser = await prisma.user.upsert({
    where: { phone: '9999900003' },
    update: {},
    create: {
      phone: '9999900003',
      name: 'Ravi Stores',
      upiId: 'ravistore@fastpay',
      pin: hashedPin,
      kycStatus: 'verified',
      role: 'merchant',
      referralCode: 'RAVI003',
      walletBalance: 0,
      merchantProfile: {
        create: {
          businessName: 'Ravi General Store',
          businessType: 'Retail',
          upiId: 'ravistore@fastpay',
          totalEarnings: 12450,
          pendingSettlement: 2400,
        },
      },
    },
  });

  // Seed some sample transactions
  await prisma.transaction.createMany({
    data: [
      {
        senderId: user1.id,
        receiverId: user2.id,
        amount: 500,
        description: 'Dinner split',
        status: 'success',
        type: 'transfer',
        cashbackAmount: 7.5,
      },
      {
        senderId: user2.id,
        receiverId: user1.id,
        amount: 250,
        description: 'Coffee ☕',
        status: 'success',
        type: 'transfer',
        cashbackAmount: 3.75,
      },
      {
        senderId: user1.id,
        receiverId: merchantUser.id,
        amount: 1200,
        description: 'Groceries',
        status: 'success',
        type: 'qr_pay',
        cashbackAmount: 18,
      },
    ],
    skipDuplicates: true,
  });

  // Rewards
  await prisma.reward.createMany({
    data: [
      { userId: user1.id, amount: 50,   type: 'welcome',  description: 'Welcome bonus!' },
      { userId: user1.id, amount: 7.5,  type: 'cashback', description: '1.5% cashback on ₹500 transfer' },
      { userId: user1.id, amount: 18,   type: 'cashback', description: '1.5% cashback on ₹1200 QR pay' },
      { userId: user2.id, amount: 50,   type: 'welcome',  description: 'Welcome bonus!' },
      { userId: user2.id, amount: 3.75, type: 'cashback', description: '1.5% cashback on ₹250 transfer' },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Seed complete!');
  console.log('Demo users:');
  console.log('  📱 9999900001 (Arjun) — PIN: 123456');
  console.log('  📱 9999900002 (Priya) — PIN: 123456');
  console.log('  🏪 9999900003 (Ravi Stores / Merchant) — PIN: 123456');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
