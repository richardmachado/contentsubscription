// server.js

// ---- Force IPv4 DNS lookups (fixes ENETUNREACH to Supabase AAAA) ----
const dns = require('dns');
const originalLookup = dns.lookup;
dns.lookup = function (hostname, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  return originalLookup.call(dns, hostname, { ...options, family: 4, all: false }, callback);
};
dns.setDefaultResultOrder?.('ipv4first');

// ---- Env ----
require('dotenv').config({ override: true });

// ---- Core ----
const express = require('express');
const cors = require('cors');

// ---- Auth middleware ----
const { auth, authenticateAdmin } = require('./middleware/auth');

// ---- Routers ----
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const contentRoutes = require('./routes/content');
const adminRoutes = require('./routes/admin');
const buyRoutes = require('./routes/buy');
const stripeWebhookRouter = require('./routes/stripeWebhook');
const liveHelpHourRoutes = require('./routes/liveHelpHour');
const markViewedRoutes = require('./routes/markViewed');

// ---- DB (sanity check later) ----
const { pool } = require('./db');

const app = express();
const port = process.env.PORT || 5000;

/* ------------------------- CORS (put first) ------------------------- */
// Read allowlist from env; default to local dev origins
const allowList = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, cb) {
    if (!origin) return cb(null, true); // allow curl/postman
    cb(null, allowList.includes(origin));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
// Express 5: use RegExp (not '*')
app.options(/.*/, cors(corsOptions));

/* ---------------- Stripe webhook raw body FIRST --------------------- */
// Keep raw body for Stripe signature verification BEFORE express.json()
app.use('/webhook', express.raw({ type: 'application/json' }));

/* ---------------------- Parsers (normal JSON) ----------------------- */
app.use(express.json());

/* ---------------------------- Routes -------------------------------- */

// Public auth endpoints (e.g., /api/login, /api/register)
app.use('/api', authRoutes);

// Optional: ensure API preflights never hit auth
app.options(/^\/api\/.*/, cors(corsOptions));

// Protected user routes
app.use('/api/profile', auth, profileRoutes);
app.use('/api/content', auth, contentRoutes);

// Checkout / buy (protected)
app.use('/api/buy', auth, buyRoutes);

// Live Help Hours (protected) — support both singular/plural
app.use('/api/live-help-hour', auth, liveHelpHourRoutes);
app.use('/api/live-help-hours', auth, liveHelpHourRoutes);

// Mark as viewed (protected)
app.use('/api/mark-viewed', auth, markViewedRoutes);

// Admin routes (user + admin)
app.use('/api/admin', auth, authenticateAdmin, adminRoutes);

// Stripe webhook handler (after raw body mount above)
app.use('/webhook', stripeWebhookRouter);

/* ------------------------- Health / Root ---------------------------- */
app.get('/healthz', (req, res) => res.status(200).json({ ok: true }));

// Friendly root (instead of 404 at '/')
app.get('/', (req, res) => {
  res.status(200).json({
    ok: true,
    name: 'contentsubscription API',
    health: '/healthz',
  });
});

/* ----------------------- DB sanity (non-fatal) ---------------------- */
(async () => {
  try {
    const { rows } = await pool.query('SELECT NOW()');
    console.log('✅ DB connected. Server time:', rows[0].now);
  } catch (err) {
    console.error('⚠️ DB check failed (continuing to serve):', err.message);
  }
})();

/* -------------------------- Error handlers -------------------------- */
// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Central error handler
app.use((err, req, res, next) => {
  console.error('💥 Error:', err);
  if (!res.headersSent) {
    res.status(err.status || 500).json({
      error: err.message || 'Internal Server Error',
    });
  }
});

/* ----------------------------- Start -------------------------------- */
if (require.main === module) {
  app.listen(port, () => {
    console.log(`🚀 Server on http://localhost:${port}`);
  });
}

module.exports = app;
