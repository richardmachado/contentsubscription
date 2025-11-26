// server.js
require('dotenv').config(); //{ override: true });

/* ============== Optional IPv4 DNS patch ============== */
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
  // console.log('IPv4 DNS patch active');
}

const express = require('express');
const cors = require('cors');
//const cookieParser = require('cookie-parser'); // only used if AUTH_ALLOW_COOKIE=true

// 🔧 MIDDLEWARE + ROUTES + DB
const { optionalAuth, requireAuth, authenticateAdmin } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const contentRoutes = require('./routes/content');
const adminRoutes = require('./routes/admin');
const buyRoutes = require('./routes/buy');
const stripeWebhookRouter = require('./routes/stripeWebhook');
const liveHelpHourRoutes = require('./routes/liveHelpHour');
const markViewedRoutes = require('./routes/markViewed');
const confirmPaymentRoutes = require('./routes/confirmPayment');

// Handle both export styles: module.exports = pool  OR  module.exports = { pool }
const dbExport = require('./db');
const pool = dbExport.pool || dbExport;

// 🔧 CREATE APP + PORT
const app = express();
const port = process.env.PORT || 5000;

/* ============================ CORS (FIRST) ============================ */
const parseList = (val) =>
  (val || '')
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean);

const exactOrigins = new Set(parseList(process.env.ALLOWED_ORIGINS));
const toRegex = (pat) =>
  new RegExp('^' + pat.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$');
const patternRegexes = parseList(process.env.ALLOWED_ORIGIN_PATTERNS).map(toRegex);

if (process.env.NODE_ENV !== 'production') {
  [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ].forEach((o) => exactOrigins.add(o));
}

// console.log('[CORS] exact:', [...exactOrigins]);
// console.log('[CORS] patterns:', parseList(process.env.ALLOWED_ORIGIN_PATTERNS));

function originCheck(origin, cb) {
  if (!origin) return cb(null, true); // non-browser clients
  const normalized = origin.replace(/\/+$/, '');
  const ok = exactOrigins.has(normalized) || patternRegexes.some((rx) => rx.test(normalized));
  if (!ok) console.warn('[CORS] Blocked origin:', origin);
  // else console.log('[CORS] Allowed origin:', normalized);
  cb(null, ok);
}

const corsOptions = {
  origin: originCheck,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

/* ===== Stripe webhook (raw body) — mount BEFORE any json/urlencoded ===== */
app.use('/webhook', express.raw({ type: 'application/json' }), stripeWebhookRouter);

/* ============================ Body parsers ============================ */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ============== Optional global auth context (no 401 if missing) ============== */
app.use(optionalAuth);

/* ============================== Routes =============================== */

// Public auth endpoints (register/login)
app.use('/api', authRoutes);
app.use('/api', require('./routes/passwordReset'));

// Protected user routes
app.use('/api/profile', requireAuth, profileRoutes);
app.use('/api/content', requireAuth, contentRoutes);
app.use('/api/confirm-payment', requireAuth, confirmPaymentRoutes);

// Checkout / Buy (protected)
app.use('/api/buy', requireAuth, buyRoutes);

// Live Help Hours (protected) — both paths
app.use('/api/live-help-hour', requireAuth, liveHelpHourRoutes);
app.use('/api/live-help-hours', requireAuth, liveHelpHourRoutes);

// Mark as viewed (protected)
app.use('/api/mark-viewed', requireAuth, markViewedRoutes);

// Admin (protected + admin)
app.use('/api/admin', requireAuth, authenticateAdmin, adminRoutes);

/* =========================== Health / Root =========================== */
app.get('/healthz', (req, res) => res.status(200).json({ ok: true }));
app.get('/', (req, res) =>
  res.status(200).json({ ok: true, name: 'contentsubscription API', health: '/healthz' })
);
app.get('/api/me', requireAuth, (req, res) => res.json({ user: req.user }));

/* ====================== DB sanity (non-fatal) ======================== */
(async () => {
  try {
    const { rows } = await pool.query('SELECT NOW()');
    // console.log('✅ DB connected. Server time:', rows[0].now);
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
//console.log('SUPABASE_URL from env:', process.env.SUPABASE_URL);

/* ============================== Start ================================ */
if (require.main === module) {
  app.listen(port, () => console.log(`Running: 🚀 Server on http://localhost:${port}`));
}
module.exports = app;
