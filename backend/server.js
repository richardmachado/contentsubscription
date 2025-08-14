// server.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');

const { auth, authenticateAdmin } = require('./middleware/auth');

// Routes
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const contentRoutes = require('./routes/content');
const adminRoutes = require('./routes/admin');
const buyRoutes = require('./routes/buy');
const stripeWebhookRouter = require('./routes/stripeWebhook');
const liveHelpHourRoutes = require('./routes/liveHelpHour');
const markViewedRoutes = require('./routes/markViewed');

// DB (optional sanity check)
const { pool } = require('./db');

const app = express();
const port = process.env.PORT || 5000;

/* ------------------------- CORS (put first) ------------------------- */
const corsOptions = {
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// Apply CORS for all requests
app.use(cors(corsOptions));

// Handle all preflights — **use RegExp**, not a string, on Express 5
app.options(/.*/, cors(corsOptions));

/* ---------------- Stripe webhook raw body FIRST --------------------- */
// Must be before express.json()
app.use('/webhook', express.raw({ type: 'application/json' }));

/* ---------------------- Parsers (normal JSON) ----------------------- */
app.use(express.json());

/* ---------------------------- Routes -------------------------------- */
// Public (e.g., /api/register, /api/login)
app.use('/api', authRoutes);

// (Optional) ensure API preflights never hit auth
app.options(/^\/api\/.*/, cors(corsOptions));

// Protected (needs user)
app.use('/api/profile', auth, profileRoutes);
app.use('/api/content', auth, contentRoutes);

// Checkout / buy (protected)
app.use('/api/buy', auth, buyRoutes);
app.use('/api/live-help-hours', auth, liveHelpHourRoutes);

app.use('/api/mark-viewed', auth, markViewedRoutes);

// Admin (needs user + is_admin)
app.use('/api/admin', auth, authenticateAdmin, adminRoutes);

// Stripe webhook (the raw body mount is above)
app.use('/webhook', stripeWebhookRouter);

/* ------------------------- Health / Debug --------------------------- */
app.get('/healthz', (req, res) => res.status(200).json({ ok: true }));

// Optional DB ping
pool.query('SELECT NOW()', (err, r) => {
  if (err) console.error('❌ DB connection failed:', err.stack);
  else console.log('✅ DB connected. Server time:', r.rows[0].now);
});

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
