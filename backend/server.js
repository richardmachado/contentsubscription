require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 5000;



// Stripe needs raw body on this path ONLY
app.use('/webhook', express.raw({ type: 'application/json' }));

// Normal middleware
app.use(
  cors({
    origin: ['http://localhost:3000', 'http://localhost:5173'], // your frontend(s)
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json());
app.use(bodyParser.json());

// ---- Auth middleware (header-based JWT) ----
const jwt = require('jsonwebtoken');
function getToken(req) {
  const h = req.headers.authorization || '';
  return h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : null;
}
function auth(req, res, next) {
  const token = getToken(req);
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
function authenticateAdmin(req, res, next) {
  if (!req.user?.is_admin) return res.status(403).json({ error: 'Not an admin' });
  next();
}

// ---- Routes ----
// Public (login/register, etc.)
app.use('/api', require('./routes/auth'));

// Protected (needs user)
app.use('/api/profile', auth, require('./routes/profile'));
app.use('/api/content', auth, require('./routes/content'));

// Admin (needs user + is_admin)
app.use('/api/admin', auth, authenticateAdmin, require('./routes/admin'));

// Stripe webhook (keep last so raw body isn’t eaten by express.json earlier)
app.use('/webhook', require('./routes/stripeWebhook'));

// ---- DB sanity check (optional) ----
const { pool } = require('./db'); // ensure db.js exports { pool, query }
pool.query('SELECT NOW()', (err, res) => {
  if (err) console.error('❌ DB connection failed:', err.stack);
  else console.log('✅ DB connected. Server time:', res.rows[0].now);
});

// ---- Start ----
if (require.main === module) {
  app.listen(port, () => console.log(`🚀 Server on http://localhost:${port}`));
}
module.exports = app;
