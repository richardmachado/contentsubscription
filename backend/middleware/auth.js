const jwt = require('jsonwebtoken');

function getBearer(req) {
  const h = req.headers.authorization || '';
  const [scheme, token] = h.split(' ');
  return scheme?.toLowerCase() === 'bearer' ? token : null;
}

const auth = (req, res, next) => {
  const token = getBearer(req);
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
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
