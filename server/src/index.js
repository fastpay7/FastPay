require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { Server } = require('socket.io');

const { initRedis } = require('./services/redis');
const { initFirebaseAdmin } = require('./services/firebase');
const { initSocket } = require('./socket');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const bankRoutes = require('./routes/bank');
const paymentRoutes = require('./routes/payments');
const walletRoutes = require('./routes/wallet');
const rewardRoutes = require('./routes/rewards');
const merchantRoutes = require('./routes/merchant');
const notificationRoutes = require('./routes/notifications');

const app = express();
const httpServer = http.createServer(app);

// Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Raw body needed for Razorpay webhook HMAC verification
app.use('/api/wallet/webhook', express.raw({ type: 'application/json' }));

// Middleware
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Attach io to every request
app.use((req, _res, next) => { req.io = io; next(); });

// Routes
app.use('/api/auth',          authRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/bank',          bankRoutes);
app.use('/api/payments',      paymentRoutes);
app.use('/api/wallet',        walletRoutes);
app.use('/api/rewards',       rewardRoutes);
app.use('/api/merchant',      merchantRoutes);
app.use('/api/notifications', notificationRoutes);

// Health
app.get('/health', (_req, res) => res.json({ status: 'ok', app: 'FastPay', ts: new Date() }));

// 404
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('❌ Error:', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await initRedis();
    initFirebaseAdmin();
    initSocket(io);
    httpServer.listen(PORT, () => {
      console.log(`🚀 FastPay server running at http://localhost:${PORT}`);
      console.log(`📡 Socket.IO ready`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();

