# FastPay — Instant UPI Payments App

FastPay is a production-ready, full-stack "Google Pay-like" UPI payment application. It provides real-time transactions, wallet management, QR code payments, merchant settlements, and a sleek, modern mobile-first UI.

## 🌟 Features

- **Authentication**: Secure OTP-based login and 6-digit UPI PIN registration.
- **Real-Time Updates**: Instant payment notifications and balance updates powered by Socket.IO.
- **Send Money**: Transfer money to other UPI IDs instantly with simulated PIN verification.
- **QR Code Payments**: Generate your personal QR code and scan others' codes to pay.
- **Wallet & Rewards**: Add money to your wallet, view transaction history, and earn cashback/referral bonuses.
- **Merchant Dashboard**: Register as a business to accept payments, view earnings analytics, and request settlements.
- **Sleek UI/UX**: Premium, responsive, glassmorphic dark-mode interface built from scratch without bulky CSS frameworks.

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18 + Vite
- **State Management**: Zustand
- **Styling**: Vanilla CSS with modern custom properties (CSS variables)
- **Icons**: Lucide React
- **HTTP Client**: Axios
- **Routing**: React Router DOM v6

### Backend
- **Framework**: Node.js + Express
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Caching & Rate Limiting**: Redis (with in-memory fallback)
- **Real-time Engine**: Socket.IO
- **Security**: JWT (JSON Web Tokens), bcryptjs for PIN hashing

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- Docker & Docker Compose (for the database and Redis)

### 1. Start Infrastructure
Start the PostgreSQL database and Redis server using Docker Compose:
```bash
docker-compose up -d
```

### 2. Backend Setup
Navigate to the `server` directory and install dependencies:
```bash
cd server
npm install
```

Ensure your `.env` file in the root of the `server` directory (or workspace root) is configured properly. A sample configuration:
```env
PORT=5000
NODE_ENV=development
DATABASE_URL="postgresql://fastpay_user:fastpay_pass@localhost:5432/fastpay?schema=public"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="super-secret-jwt-key"
CASHBACK_MIN_AMOUNT=50
```

Run database migrations to generate the schema:
```bash
npx prisma db push
```

*(Optional)* Seed the database with mock users:
```bash
node prisma/seed.js
```

Start the backend development server:
```bash
npm run dev
```
The server will start on `http://localhost:5000`.

### 3. Frontend Setup
In a new terminal window, navigate to the `client` directory and install dependencies:
```bash
cd client
npm install
```

Start the frontend development server:
```bash
npm run dev
```
The application will be available at `http://localhost:5173`.

## 🧪 Testing in Development

- **Bypassing OTP**: When running in `development` mode, the OTP is automatically populated on the frontend. If not, it is printed in the backend terminal logs.
- **Mock PIN**: When registering, you can set any 6-digit PIN. You will use this PIN to authorize transactions.

## 📜 License
This project is open source and available under the [MIT License](LICENSE).
