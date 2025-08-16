// server.js

require('dotenv').config({ override: true });

// Optional IPv4 DNS patch
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

const express = require('express');
const { auth, authenticateAdmin } = require('./middleware/auth');

const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const contentRoutes = require('./routes/content');
const adminRoutes = require('./routes/admin');
const buyRoutes = require('./routes/buy');
const stripeWebhookRouter = require('./routes/stripeWebhook');
const liveHelpHourRoutes = require('./routes/liveHelpHour');
const markViewedRoutes = require( './routes/markViewed' );
const confirmPaymentRoutes = require('./routes/confirmPayment');

const { pool } = require('./db');

const app = express();
const port = process.env.PORT || 5000;

/* ============================ CORS (FIRST) ============================ */
const cors = require('cors');

const exactList = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const patternList = (process.env.ALLOWED_ORIGIN_PATTERNS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const toRegex = (pat) =>
  new RegExp('^' + pat.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$');

const patternRegexes = patternList.map(toRegex);

function isAllowedOrigin(origin) {
  if (!origin) return true; // curl/Postman/same-origin
  if (exactList.includes(origin)) return true;
  return patternRegexes.some((rx) => rx.test(origin));
}

const corsOptionsDelegate = (req, cb) => {
  const origin = req.headers.origin;
  const allowed = isAllowedOrigin(origin);
  if (!allowed) console.warn('[CORS] Blocked origin:', origin);
  cb(null, {
    origin: allowed,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 200,
  });
};

app.use(cors(corsOptionsDelegate));
app.options(/.*/, cors(corsOptionsDelegate)); // <-- use the delegate

/* ================= Stripe webhook raw body (BEFORE json) ============= */
app.use('/webhook', express.raw({ type: 'application/json' }));

/* ============================ JSON parser ============================ */
app.use(express.json());

/* ============================== Routes =============================== */
// Public auth endpoints
app.use('/api', authRoutes);
app.options(/^\/api\/.*/, cors(corsOptionsDelegate)); // <-- use the delegate

// Protected user routes
app.use('/api/profile', auth, profileRoutes);
app.use( '/api/content', auth, contentRoutes );
app.use('/api/confirm-payment', auth, confirmPaymentRoutes);


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
