// server.js

// ---------- Load environment variables first ----------
require('dotenv').config({ override: true });

// ---------- Optional IPv4 DNS patch (enable only where needed) ----------
if (process.env.FORCE_IPV4 === 'true') {
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
  console.log('IPv4 DNS patch active');
}

// ---------- Core ----------
const express = require('express');
const cors = require('cors');

// ---------- Auth middleware ----------
const { auth, authenticateAdmin } = require('./middleware/auth');

// ---------- Routers ----------
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const contentRoutes = require('./routes/content');
const adminRoutes = require('./routes/admin');
const buyRoutes = require('./routes/buy');
const stripeWebhookRouter = require('./routes/stripeWebhook');
const liveHelpHourRoutes = require('./routes/liveHelpHour');
const markViewedRoutes = require('./routes/markViewed');

// ---------- DB ----------
const { pool } = require('./db');

const app = express();
const port = process.env.PORT || 5000;

/* ============================ CORS (FIRST) ============================ */
const allowList = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, cb) {
    if (!origin) return cb(null, true);
    return cb(null, allowList.includes(origin));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

/* ================= Stripe webhook raw body (BEFORE json) ============= */
app.use('/webhook', express.raw({ type: 'application/json' }));

/* ============================ JSON parser ============================ */
app.use(express.json());

/* ============================== Routes =============================== */
// Public auth endpoints
app.use('/api', authRoutes);
app.options(/^\/api\/.*/, cors(corsOptions));

// Protected user routes
app.use('/api/profile', auth, profileRoutes);
app.use('/api/content', auth, contentRoutes);

// Checkout / Buy (protected)
app.use('/api/buy', auth, buyRoutes);

// Live Help Hours (protected) — both paths
app.use('/api/live-help-hour', auth, liveHelpHourRoutes);
app.use('/api/live-help-hours', auth, liveHelpHourRoutes);

// Mark as viewed (protected)
app.use('/api/mark-viewed', auth, markViewedRoutes);

// Admin (protected + admin)
app.use('/api/admin', auth, authenticateAdmin, adminRoutes);

// Stripe webhook handler
app.use('/webhook', stripeWebhookRouter);

/* =========================== Health / Root =========================== */
app.get('/healthz', (req, res) => res.status(200).json({ ok: true }));
app.get('/', (req, res) =>
  res.status(200).json({ ok: true, name: 'contentsubscription API', health: '/healthz' })
);

/* ====================== DB sanity (non-fatal) ======================== */
(async () => {
  try {
    const { rows } = await pool.query('SELECT NOW()');
    console.log('✅ DB connected. Server time:', rows[0].now);
  } catch (err) {
    console.error('⚠️ DB check failed (continuing to serve):', err.message);
  }
})();

/* ========================= Error handlers ============================ */
app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => {
  console.error('💥 Error:', err);
  if (!res.headersSent) {
    res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
  }
});

/* ============================== Start ================================ */
if (require.main === module) {
  app.listen(port, () => console.log(`🚀 Server on http://localhost:${port}`));
}

module.exports = app;
