const { createClient } = require('redis');

let client;

async function initRedis() {
  const c = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    socket: {
      reconnectStrategy: false,   // don't retry — use in-memory fallback
      connectTimeout: 2000,
    },
  });
  c.on('error', () => {});  // swallow all errors
  try {
    await c.connect();
    client = c;
    console.log('✅ Redis connected');
  } catch {
    console.warn('⚠️  Redis unavailable — using in-memory OTP fallback');
    client = null;
  }
}

// In-memory fallback when Redis isn't available
const fs = require('fs');
const path = require('path');
const fallbackFile = path.join(__dirname, '../../otp-fallback.json');

const memStore = new Map();

// Load existing fallbacks if present
if (fs.existsSync(fallbackFile)) {
  try {
    const data = JSON.parse(fs.readFileSync(fallbackFile, 'utf8'));
    for (const [k, v] of Object.entries(data)) {
      if (v.expiresAt > Date.now()) {
        memStore.set(k, v.value);
      }
    }
  } catch (e) {
    // ignore
  }
}

function saveMemStore() {
  try {
    const data = {};
    for (const [k, v] of memStore.entries()) {
      // rough estimate of expiry for serialization (5 mins)
      data[k] = { value: v, expiresAt: Date.now() + 5 * 60 * 1000 };
    }
    fs.writeFileSync(fallbackFile, JSON.stringify(data));
  } catch (e) {
    // ignore
  }
}

async function setEx(key, seconds, value) {
  if (client) {
    await client.setEx(key, seconds, value);
  } else {
    memStore.set(key, value);
    saveMemStore();
    setTimeout(() => {
      memStore.delete(key);
      saveMemStore();
    }, seconds * 1000);
  }
}

async function get(key) {
  if (client) return client.get(key);
  return memStore.get(key) || null;
}

async function del(key) {
  if (client) return client.del(key);
  memStore.delete(key);
  saveMemStore();
}

module.exports = { initRedis, setEx, get, del };
