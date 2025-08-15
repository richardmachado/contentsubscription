// middleware/auth.js
const jwt = require('jsonwebtoken');

/** Extract a bearer token from Authorization: Bearer <token> */
function getBearer(req) {
  const h = req.headers.authorization || '';
  const [scheme, token] = h.split(' ');
  return scheme && scheme.toLowerCase() === 'bearer' && token ? token.trim() : null;
}

/** Optionally read from cookie if you're using cookie-parser */
function getCookieToken(req) {
  // Requires app.use(require('cookie-parser')()) if you want this path.
  return req.cookies?.token || null;
}

function verifyToken(raw) {
  const opts = {};
  if (process.env.JWT_ISSUER) opts.issuer = process.env.JWT_ISSUER;
  if (process.env.JWT_AUDIENCE) opts.audience = process.env.JWT_AUDIENCE;
  if (process.env.JWT_ALGS) {
    // e.g. JWT_ALGS=HS256,RS256
    opts.algorithms = process.env.JWT_ALGS.split(',').map((s) => s.trim());
  } else {
    // default: HS256
    opts.algorithms = ['HS256'];
  }
  // small clock skew tolerance (seconds)
  opts.clockTolerance = 5;

  return jwt.verify(raw, process.env.JWT_SECRET, opts);
}

const auth = (req, res, next) => {
  // Always allow CORS preflight
  if (req.method === 'OPTIONS') return next();

  // Pull token from Authorization first, then cookie as fallback
  const token = getBearer(req) || getCookieToken(req);
  if (!token) {
    res.set('WWW-Authenticate', 'Bearer realm="api"');
    return res.status(401).json({ error: 'Missing token' });
  }

  try {
    req.user = verifyToken(token);
    return next();
  } catch (err) {
    // Distinguish common JWT errors
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

const requireAuth = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  next();
};

const authenticateAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (!req.user.is_admin) return res.status(403).json({ error: 'Not an admin' });
  next();
};

module.exports = { auth, requireAuth, authenticateAdmin };
