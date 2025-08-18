// middleware/auth.js
const jwt = require('jsonwebtoken');

function getBearer(req) {
  const h = req.headers.authorization;
  if (!h) return null;
  const m = /^Bearer\s+(.+)$/i.exec(h.trim());
  return m ? m[1].trim() : null;
}

function getCookieToken(req) {
  return req.cookies?.token || null;
}

function verifyToken(raw) {
  const opts = {};
  if (process.env.JWT_ISSUER) opts.issuer = process.env.JWT_ISSUER;
  if (process.env.JWT_AUDIENCE) opts.audience = process.env.JWT_AUDIENCE;
  opts.algorithms = process.env.JWT_ALGS
    ? process.env.JWT_ALGS.split(',').map((s) => s.trim())
    : ['HS256'];
  opts.clockTolerance = 5;
  return jwt.verify(raw, process.env.JWT_SECRET, opts);
}

const allowCookie = process.env.AUTH_ALLOW_COOKIE === 'true';

const auth = (req, res, next) => {
  if (req.method === 'OPTIONS') return next();

  const token = getBearer(req) || (allowCookie ? getCookieToken(req) : null);
  if (!token) {
    res.set('WWW-Authenticate', 'Bearer realm="api"');
    return res.status(401).json({ error: 'Missing token' });
  }

  try {
    req.user = verifyToken(token);
    return next();
  } catch (err) {
    const name = err?.name || 'Unauthorized';
    if (name === 'TokenExpiredError') {
      res.set('WWW-Authenticate', 'Bearer error="invalid_token", error_description="expired"');
      return res.status(401).json({ error: 'Token expired' });
    }
    if (name === 'JsonWebTokenError') {
      res.set('WWW-Authenticate', 'Bearer error="invalid_token"');
      return res.status(401).json({ error: 'Invalid token' });
    }
    return res.status(401).json({ error: 'Unauthorized' });
  }
};

const optionalAuth = (req, res, next) => {
  if (req.method === 'OPTIONS') return next();
  const raw = getBearer(req) || (allowCookie ? getCookieToken(req) : null);
  if (!raw) return next();
  try {
    req.user = verifyToken(raw);
  } catch (_) {
    /* ignore */
  }
  next();
};

const requireAuth = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  next();
};

const authenticateAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (!req.user.is_admin) return res.status(403).json({ error: 'Not an admin' });
  next();
};

module.exports = { auth, optionalAuth, requireAuth, authenticateAdmin };
